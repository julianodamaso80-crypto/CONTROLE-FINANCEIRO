import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Post,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { RequestUser } from '../../common/types/request-user.type';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly service: WhatsAppService) {}

  @Post('connect')
  connect(@CurrentUser() user: RequestUser) {
    return this.service.connectWhatsApp(user.companyId);
  }

  @Get('status')
  getStatus(@CurrentUser() user: RequestUser) {
    return this.service.getStatus(user.companyId);
  }

  @Delete('disconnect')
  disconnect(@CurrentUser() user: RequestUser) {
    return this.service.disconnect(user.companyId);
  }

  // Webhook da Evolution API — isento de rate limit para não bloquear callbacks
  @SkipThrottle()
  @Public()
  @Post('webhook')
  @HttpCode(200)
  webhook(@Body() body: Record<string, unknown>) {
    this.service
      .processWebhook(
        body as unknown as Parameters<typeof this.service.processWebhook>[0],
      )
      .catch((e: unknown) => {
        this.logger.error(
          `[Webhook] ${e instanceof Error ? e.message : 'Erro desconhecido'}`,
        );
      });
    return { received: true };
  }
}
