import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BankAccountType } from '@prisma/client';

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString({ message: 'Nome da conta é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  name?: string;

  @IsOptional()
  @IsEnum(BankAccountType, {
    message: 'Tipo inválido. Use: CHECKING, SAVINGS, CASH, INVESTMENT ou OTHER',
  })
  type?: BankAccountType;

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'Código do banco deve ter no máximo 10 caracteres' })
  bankCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3, { message: 'Moeda deve ter no máximo 3 caracteres' })
  currency?: string;

  @IsOptional()
  @IsBoolean({ message: 'O campo isActive deve ser verdadeiro ou falso' })
  isActive?: boolean;
}
