import { IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsString({ message: 'WhatsApp é obrigatório' })
  @MinLength(10, { message: 'WhatsApp deve ter DDD + número' })
  @MaxLength(20)
  phone!: string;
}
