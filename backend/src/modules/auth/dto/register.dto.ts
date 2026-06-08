import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Dados de tracking capturados no client antes do signup
 * (UTMs, click IDs, _fbp/_fbc, GA client_id, landing).
 * Todos opcionais — o backend sobrevive sem.
 */
export class RegisterTrackingDto {
  @IsOptional() @IsString() event_id?: string;
  @IsOptional() @IsString() external_id?: string;
  @IsOptional() @IsString() ga_client_id?: string;
  @IsOptional() @IsString() fbp?: string;
  @IsOptional() @IsString() fbc?: string;
  @IsOptional() @IsString() gclid?: string;
  @IsOptional() @IsString() fbclid?: string;
  @IsOptional() @IsString() gbraid?: string;
  @IsOptional() @IsString() wbraid?: string;
  @IsOptional() @IsString() msclkid?: string;
  @IsOptional() @IsString() ttclid?: string;
  @IsOptional() @IsString() utm_source?: string;
  @IsOptional() @IsString() utm_medium?: string;
  @IsOptional() @IsString() utm_campaign?: string;
  @IsOptional() @IsString() utm_content?: string;
  @IsOptional() @IsString() utm_term?: string;
  @IsOptional() @IsString() landing_page?: string;
  @IsOptional() @IsString() page_referrer?: string;
}

export class RegisterDto {
  @IsString({ message: 'Nome é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  name!: string;

  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString({ message: 'A senha deve ter no mínimo 8 caracteres' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  password!: string;

  @IsString({ message: 'WhatsApp é obrigatório' })
  @MinLength(10, { message: 'WhatsApp deve ter DDD + número' })
  @MaxLength(20)
  phone!: string;

  /** Payload de tracking capturado no client (UTMs, click IDs, etc) — opcional */
  @IsOptional()
  @IsObject()
  tracking?: RegisterTrackingDto;

  /** Código de indicação do influencer (?ref=...) — opcional */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  ref?: string;
}
