import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString({ message: 'Nome do usuário é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  name!: string;

  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString({ message: 'Senha é obrigatória' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(UserRole, { message: 'Perfil inválido. Use: ADMIN, USER ou FINANCE' })
  role!: UserRole;
}
