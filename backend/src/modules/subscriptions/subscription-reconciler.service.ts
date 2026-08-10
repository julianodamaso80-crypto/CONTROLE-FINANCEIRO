import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfigService } from '../../common/config/app.config';
import { AsaasService } from '../asaas/asaas.service';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Rede de segurança do acesso pago.
 *
 * O webhook do Asaas é a via rápida, não a única: ele pode ser desativado no
 * painel, ser interrompido pelo próprio gateway após uma sequência de falhas,
 * ou simplesmente não chegar enquanto o backend estiver reiniciando. Quando
 * isso acontece o cliente paga e continua bloqueado — foi exatamente o que
 * aconteceu em agosto/2026 com dois assinantes.
 *
 * Este job pergunta ao Asaas, de tempos em tempos, quem pagou e ainda não está
 * liberado, e corrige. Só libera acesso; nunca tira.
 */
@Injectable()
export class SubscriptionReconcilerService {
  private readonly logger = new Logger(SubscriptionReconcilerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
    private readonly appConfig: AppConfigService,
    private readonly asaas: AsaasService,
  ) {}

  /** A cada 15 minutos: quem pagou mas está bloqueado volta a ter acesso. */
  @Cron('*/15 * * * *', { timeZone: 'America/Sao_Paulo' })
  async reconcile(): Promise<void> {
    if (!this.appConfig.isAsaasConfigured()) return;

    const pendentes = await this.prisma.subscription.findMany({
      where: {
        provider: 'asaas',
        asaasSubscriptionId: { not: null },
        status: { in: ['TRIALING', 'PAST_DUE', 'EXPIRED', 'CANCELED'] },
      },
    });
    if (pendentes.length === 0) return;

    let liberados = 0;
    for (const sub of pendentes) {
      try {
        if (await this.subscriptions.activateIfPaid(sub)) liberados++;
      } catch (err) {
        this.logger.warn(
          `Reconciliação falhou para company ${sub.companyId}: ${
            err instanceof Error ? err.message : 'erro'
          }`,
        );
      }
    }

    if (liberados > 0) {
      this.logger.warn(
        `Reconciliação Asaas: ${liberados} assinatura(s) estavam pagas e ` +
          `bloqueadas — acesso liberado. Confira a saúde do webhook.`,
      );
    }
  }

  /**
   * De hora em hora, religa o webhook se o Asaas o tiver interrompido.
   *
   * O gateway pausa a fila após uma sequência de respostas com erro, e isso
   * acontece naturalmente nos segundos em que o backend reinicia num deploy.
   * Uma vez pausado, ele fica pausado — foi assim que os eventos de pagamento
   * pararam de chegar sem ninguém notar.
   */
  @Cron('7 * * * *', { timeZone: 'America/Sao_Paulo' })
  async ensureWebhookAlive(): Promise<void> {
    if (!this.appConfig.isAsaasConfigured()) return;

    const token = this.appConfig.getAsaasWebhookToken();
    if (!token) return;

    const webhooks = await this.asaas.listWebhooks();

    for (const wh of webhooks) {
      if (!wh.url?.endsWith('/api/webhooks/asaas')) continue;
      if (wh.enabled && !wh.interrupted) continue;

      // A conta tem cadastros antigos apontando pra domínios que não resolvem
      // mais. Religar um deles só faria o Asaas penalizar a conta de novo, então
      // só religamos o que está de pé e é realmente o nosso endpoint.
      if (!(await this.endpointRespondendo(wh.url))) {
        this.logger.debug(
          `Webhook Asaas "${wh.name}" ignorado — ${wh.url} não responde.`,
        );
        continue;
      }

      const ok = await this.asaas.enableWebhook(wh.id, token);
      this.logger.warn(
        `Webhook Asaas "${wh.name}" estava ${wh.interrupted ? 'interrompido' : 'desativado'} ` +
          `— religado: ${ok ? 'sim' : 'FALHOU'}`,
      );
    }
  }

  /** O endpoint está no ar? Sem token válido ele responde 401 — isso basta. */
  private async endpointRespondendo(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'PING' }),
        signal: AbortSignal.timeout(10_000),
      });
      return res.status === 401 || res.status === 200;
    } catch {
      return false;
    }
  }
}
