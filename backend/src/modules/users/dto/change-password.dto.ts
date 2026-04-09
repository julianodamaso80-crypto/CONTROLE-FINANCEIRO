import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Senha atual é obrigatória' })
  currentPassword!: string;

  @IsString({ message: 'Nova senha é obrigatória' })
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres' })
  newPassword!: string;
}
