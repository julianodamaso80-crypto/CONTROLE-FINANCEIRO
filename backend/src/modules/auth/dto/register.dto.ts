import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
}
