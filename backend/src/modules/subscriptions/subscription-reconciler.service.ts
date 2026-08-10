import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfigService } from '../../common/config/app.config';
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
}
