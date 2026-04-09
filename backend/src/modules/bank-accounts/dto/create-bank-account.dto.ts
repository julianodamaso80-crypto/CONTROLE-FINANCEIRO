import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BankAccountType } from '@prisma/client';

export class CreateBankAccountDto {
  @IsString({ message: 'Nome da conta é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  name!: string;

  @IsEnum(BankAccountType, {
    message: 'Tipo inválido. Use: CHECKING, SAVINGS, CASH, INVESTMENT ou OTHER',
  })
  type!: BankAccountType;

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'Código do banco deve ter no máximo 10 caracteres' })
  bankCode?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Saldo inicial deve ser um número' })
  initialBalance?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3, { message: 'Moeda deve ter no máximo 3 caracteres' })
  currency?: string;
}
