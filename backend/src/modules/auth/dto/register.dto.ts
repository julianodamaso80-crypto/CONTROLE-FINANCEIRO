import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Nome da empresa deve ter entre 2 e 120 caracteres' })
  @MinLength(2, { message: 'Nome da empresa deve ter entre 2 e 120 caracteres' })
  @MaxLength(120, { message: 'Nome da empresa deve ter entre 2 e 120 caracteres' })
  companyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  companyDocument?: string;

  @IsString({ message: 'Nome do usuário é obrigatório' })
  @MinLength(2, { message: 'Nome do usuário é obrigatório' })
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
}
