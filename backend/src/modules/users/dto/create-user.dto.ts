import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
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

  @IsString({ message: 'WhatsApp é obrigatório' })
  @MinLength(10, { message: 'WhatsApp deve ter DDD + número' })
  @MaxLength(20)
  phone!: string;

  // Aceito por compatibilidade com telas antigas, mas ignorado: o membro
  // convidado é sempre USER (ver UsersService.create).
  @IsOptional()
  @IsEnum(UserRole, { message: 'Perfil inválido' })
  role?: UserRole;
}
