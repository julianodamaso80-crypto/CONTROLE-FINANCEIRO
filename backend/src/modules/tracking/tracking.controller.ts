import { Body, Controller, Headers, Ip, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TrackingService } from './tracking.service';
import { TrackEventDto } from './dto/track-event.dto';

@Controller('track')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  /**
   * Recebe eventos do client-side (lib/tracking.ts → fetch /api/track).
   * Faz fanout pra Meta CAPI + (futuramente) GA4 MP + Google Ads.
   *
   * Não requer autenticação — eventos pré-signup (page_view, lead_signup) precisam funcionar.
   * Rate limit padrão do ThrottlerGuard global aplica.
   */
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ medium: { limit: 60, ttl: 60_000 } })
  async ingest(
    @Body() dto: TrackEventDto,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string,
  ) {
    // Fire-and-forget pra UX rápido — falhas são logadas mas não bloqueiam
    this.tracking.ingestClientEvent(dto, ip, ua).catch(() => undefined);
    return; // 204
  }
}
