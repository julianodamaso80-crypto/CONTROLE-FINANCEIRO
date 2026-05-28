import { IsOptional, IsString, IsNumber, IsObject } from 'class-validator';

/**
 * DTO recebido em POST /api/track vindo do client-side (lib/tracking).
 * Apenas o essencial; campos extras são preservados via tipo passthrough.
 */
export class TrackEventDto {
  @IsString()
  event_id!: string;

  @IsString()
  event_name!: string;

  @IsOptional()
  @IsString()
  timestamp?: string;

  // Página
  @IsOptional() @IsString() page_url?: string;
  @IsOptional() @IsString() page_referrer?: string;

  // PII (já hasheado no client em hashEmail/hashPhone)
  @IsOptional() @IsString() email_hash?: string;
  @IsOptional() @IsString() phone_hash?: string;
  @IsOptional() @IsString() user_id?: string;
  @IsOptional() @IsString() external_id?: string;

  // Valor monetário
  @IsOptional() @IsNumber() value?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() transaction_id?: string;
  @IsOptional() @IsString() plan_type?: string;

  // Meta cookies
  @IsOptional() @IsString() fbp?: string;
  @IsOptional() @IsString() fbc?: string;

  // GA4 cookie
  @IsOptional() @IsString() ga_client_id?: string;

  // Click IDs
  @IsOptional() @IsString() gclid?: string;
  @IsOptional() @IsString() fbclid?: string;
  @IsOptional() @IsString() gbraid?: string;
  @IsOptional() @IsString() wbraid?: string;
  @IsOptional() @IsString() msclkid?: string;
  @IsOptional() @IsString() ttclid?: string;

  // UTMs
  @IsOptional() @IsString() utm_source?: string;
  @IsOptional() @IsString() utm_medium?: string;
  @IsOptional() @IsString() utm_campaign?: string;
  @IsOptional() @IsString() utm_content?: string;
  @IsOptional() @IsString() utm_term?: string;

  // Qualquer outro parâmetro custom passa pra dataLayer/CAPI
  @IsOptional() @IsObject() extra?: Record<string, unknown>;
}
