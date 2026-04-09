import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Nome do usuário é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Perfil inválido. Use: ADMIN, USER ou FINANCE' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean({ message: 'O campo isActive deve ser verdadeiro ou falso' })
  isActive?: boolean;
}
