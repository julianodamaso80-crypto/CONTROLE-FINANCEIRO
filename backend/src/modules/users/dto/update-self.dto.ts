import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Edição dos próprios dados. Só nome e WhatsApp — email, role e status ficam
 * de fora de propósito: email é a chave de login e role é privilégio.
 */
export class UpdateSelfDto {
  @IsOptional()
  @IsString({ message: 'Nome inválido' })
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'WhatsApp inválido' })
  @MinLength(10, { message: 'WhatsApp deve ter DDD + número' })
  @MaxLength(20)
  phone?: string;
}
