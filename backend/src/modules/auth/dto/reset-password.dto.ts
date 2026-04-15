import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'WhatsApp é obrigatório' })
  @MinLength(10)
  @MaxLength(20)
  phone!: string;

  @IsString({ message: 'Código é obrigatório' })
  @Length(6, 6, { message: 'Código deve ter 6 dígitos' })
  code!: string;

  @IsString({ message: 'Nova senha é obrigatória' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  newPassword!: string;
}
