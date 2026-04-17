import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer-core';
import { PrismaService } from '../../common/prisma/prisma.service';

const TZ = 'America/Sao_Paulo';
const CHROMIUM_PATH =
  process.env['PUPPETEER_EXECUTABLE_PATH'] || '/usr/bin/chromium-browser';
const MAX_REPORTS_PER_MONTH = 4;

interface ReportData {
  company: { name: string };
  period: { from: Date; to: Date; label: string };
  totals: {
    income: number;
    expense: number;
    balance: number;
    txCount: number;
  };
  byCategory: Array<{ name: string; type: string; total: number; count: number }>;
  bySegment: Array<{ name: string; total: number; count: number }>;
  topExpenses: Array<{
    date: string;
    description: string;
    category: string;
    amount: number;
  }>;
  topIncome: Array<{
    date: string;
    description: string;
    category: string;
    amount: number;
  }>;
  generatedAt: string;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(params: {
    companyId: string;
    userId: string;
    from: string;
    to: string;
    source: 'PANEL' | 'WHATSAPP';
  }): Promise<{ pdf: Buffer; filename: string }> {
    const from = this.parseDate(params.from);
    const to = this.parseDate(params.to);

    if (from > to) {
      throw new BadRequestException('Data inicial não pode ser posterior à final');
    }

    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 366) {
      throw new BadRequestException('Período máximo é de 1 ano');
    }

    await this.assertRateLimit(params.companyId);

    const data = await this.collectData(params.companyId, from, to);
    const html = this.renderTemplate(data);
    const pdf = await this.renderPdf(html);

    await this.prisma.reportGeneration.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        periodStart: from,
        periodEnd: to,
        source: params.source,
      },
    });

    const filename = `relatorio-${params.from}-a-${params.to}.pdf`;
    return { pdf, filename };
  }

  async getUsage(companyId: string): Promise<{ used: number; limit: number; resetsAt: string }> {
    const start = this.startOfMonth();
    const used = await this.prisma.reportGeneration.count({
      where: { companyId, createdAt: { gte: start } },
    });
    const next = new Date(start);
    next.setMonth(next.getMonth() + 1);
    return { used, limit: MAX_REPORTS_PER_MONTH, resetsAt: next.toISOString() };
  }

  private async assertRateLimit(companyId: string) {
    const start = this.startOfMonth();
    const count = await this.prisma.reportGeneration.count({
      where: { companyId, createdAt: { gte: start } },
    });
    if (count >= MAX_REPORTS_PER_MONTH) {
      throw new ForbiddenException(
        `Limite de ${MAX_REPORTS_PER_MONTH} relatórios por mês atingido. Disponível novamente no próximo mês.`,
      );
    }
  }

  private startOfMonth(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  private parseDate(isoDate: string): Date {
    const d = new Date(`${isoDate}T00:00:00.000Z`);
    if (isNaN(d.getTime())) {
      throw new BadRequestException(`Data inválida: ${isoDate}`);
    }
    return d;
  }

  private async collectData(
    companyId: string,
    from: Date,
    to: Date,
  ): Promise<ReportData> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { name: true },
    });

    const where: Prisma.TransactionWhereInput = {
      companyId,
      status: 'PAID',
      date: { gte: from, lte: to },
    };

    const [totals, byCategoryRaw, bySegmentRaw, topExpensesRaw, topIncomeRaw] =
      await Promise.all([
        this.prisma.transaction.groupBy({
          by: ['type'],
          where,
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['categoryId', 'type'],
          where,
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['segmentId'],
          where,
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.transaction.findMany({
          where: { ...where, type: 'EXPENSE' },
          orderBy: { amount: 'desc' },
          take: 10,
          include: {
            category: { select: { name: true } },
          },
        }),
        this.prisma.transaction.findMany({
          where: { ...where, type: 'INCOME' },
          orderBy: { amount: 'desc' },
          take: 10,
          include: {
            category: { select: { name: true } },
          },
        }),
      ]);

    const income = Number(
      totals.find((t) => t.type === 'INCOME')?._sum.amount ?? 0,
    );
    const expense = Number(
      totals.find((t) => t.type === 'EXPENSE')?._sum.amount ?? 0,
    );
    const txCount = totals.reduce((acc, t) => acc + t._count._all, 0);

    const categoryIds = byCategoryRaw
      .map((r) => r.categoryId)
      .filter((id): id is string => !!id);
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const segmentIds = bySegmentRaw
      .map((r) => r.segmentId)
      .filter((id): id is string => !!id);
    const segments = segmentIds.length
      ? await this.prisma.segment.findMany({
          where: { id: { in: segmentIds } },
          select: { id: true, name: true },
        })
      : [];
    const segmentMap = new Map(segments.map((s) => [s.id, s.name]));

    const byCategory = byCategoryRaw
      .map((r) => ({
        name: r.categoryId
          ? categoryMap.get(r.categoryId) ?? 'Categoria removida'
          : 'Sem categoria',
        type: r.type,
        total: Number(r._sum.amount ?? 0),
        count: r._count._all,
      }))
      .sort((a, b) => b.total - a.total);

    const bySegment = bySegmentRaw
      .map((r) => ({
        name: r.segmentId
          ? segmentMap.get(r.segmentId) ?? 'Segmento removido'
          : 'Sem segmento',
        total: Number(r._sum.amount ?? 0),
        count: r._count._all,
      }))
      .sort((a, b) => b.total - a.total);

    const mapTx = (tx: (typeof topExpensesRaw)[number]) => ({
      date: this.formatDate(tx.date),
      description: tx.description,
      category: tx.category?.name ?? '—',
      amount: Number(tx.amount),
    });

    return {
      company,
      period: {
        from,
        to,
        label: this.formatPeriod(from, to),
      },
      totals: {
        income,
        expense,
        balance: income - expense,
        txCount,
      },
      byCategory,
      bySegment,
      topExpenses: topExpensesRaw.map(mapTx),
      topIncome: topIncomeRaw.map(mapTx),
      generatedAt: new Date().toLocaleString('pt-BR', { timeZone: TZ }),
    };
  }

  private formatDate(d: Date): string {
    return d.toLocaleDateString('pt-BR', { timeZone: TZ });
  }

  private formatPeriod(from: Date, to: Date): string {
    return `${this.formatDate(from)} — ${this.formatDate(to)}`;
  }

  private fmtBRL(n: number): string {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private renderTemplate(data: ReportData): string {
    const templatePath = path.join(__dirname, 'templates', 'report.html');
    let html: string;
    try {
      html = fs.readFileSync(templatePath, 'utf-8');
    } catch {
      // build output: templates podem estar em dist/.../templates
      const distPath = path.join(
        process.cwd(),
        'src',
        'modules',
        'reports',
        'templates',
        'report.html',
      );
      html = fs.readFileSync(distPath, 'utf-8');
    }

    const balanceSign = data.totals.balance >= 0 ? 'positive' : 'negative';

    const byCategoryRows = data.byCategory.length
      ? data.byCategory
          .map(
            (c) => `
        <tr>
          <td><strong>${this.escape(c.name)}</strong></td>
          <td><span class="tag tag-${c.type === 'INCOME' ? 'income' : 'expense'}">${
              c.type === 'INCOME' ? 'Receita' : 'Despesa'
            }</span></td>
          <td class="num">${c.count}</td>
          <td class="num">${this.fmtBRL(c.total)}</td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="4" class="empty">Sem lançamentos no período</td></tr>';

    const bySegmentRows = data.bySegment.length
      ? data.bySegment
          .map(
            (s) => `
        <tr>
          <td><strong>${this.escape(s.name)}</strong></td>
          <td class="num">${s.count}</td>
          <td class="num">${this.fmtBRL(s.total)}</td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="3" class="empty">Sem segmentos no período</td></tr>';

    const expenseRows = data.topExpenses.length
      ? data.topExpenses
          .map(
            (t) => `
        <tr>
          <td>${t.date}</td>
          <td>${this.escape(t.description)}</td>
          <td>${this.escape(t.category)}</td>
          <td class="num">${this.fmtBRL(t.amount)}</td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="4" class="empty">Nenhuma despesa registrada</td></tr>';

    const incomeRows = data.topIncome.length
      ? data.topIncome
          .map(
            (t) => `
        <tr>
          <td>${t.date}</td>
          <td>${this.escape(t.description)}</td>
          <td>${this.escape(t.category)}</td>
          <td class="num">${this.fmtBRL(t.amount)}</td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="4" class="empty">Nenhuma receita registrada</td></tr>';

    return html
      .replace(/{{COMPANY_NAME}}/g, this.escape(data.company.name))
      .replace(/{{PERIOD}}/g, data.period.label)
      .replace(/{{GENERATED_AT}}/g, data.generatedAt)
      .replace(/{{INCOME}}/g, this.fmtBRL(data.totals.income))
      .replace(/{{EXPENSE}}/g, this.fmtBRL(data.totals.expense))
      .replace(/{{BALANCE}}/g, this.fmtBRL(data.totals.balance))
      .replace(/{{BALANCE_SIGN}}/g, balanceSign)
      .replace(/{{TX_COUNT}}/g, String(data.totals.txCount))
      .replace(/{{CATEGORY_ROWS}}/g, byCategoryRows)
      .replace(/{{SEGMENT_ROWS}}/g, bySegmentRows)
      .replace(/{{EXPENSE_ROWS}}/g, expenseRows)
      .replace(/{{INCOME_ROWS}}/g, incomeRows);
  }

  private escape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private async renderPdf(html: string): Promise<Buffer> {
    this.logger.log(`[PDF] Launching chromium at ${CHROMIUM_PATH}`);
    const browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise((r) => setTimeout(r, 300));
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        preferCSSPageSize: true,
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
