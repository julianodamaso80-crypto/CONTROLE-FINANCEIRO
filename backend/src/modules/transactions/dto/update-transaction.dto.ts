import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TransactionStatus, TransactionType } from '@prisma/client';

export class UpdateTransactionDto {
  @IsOptional()
  @IsEnum(TransactionType, { message: 'Tipo deve ser INCOME ou EXPENSE' })
  type?: TransactionType;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Valor deve ser um número com no máximo 2 casas decimais' },
  )
  @IsPositive({ message: 'Valor deve ser maior que zero' })
  amount?: number;

  @IsOptional()
  @IsString({ message: 'Descrição é obrigatória' })
  @MinLength(3, { message: 'Descrição deve ter no mínimo 3 caracteres' })
  @MaxLength(255, { message: 'Descrição deve ter no máximo 255 caracteres' })
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data inválida' })
  date?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data de vencimento inválida' })
  dueDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data de pagamento inválida' })
  paymentDate?: string;

  @IsOptional()
  @IsEnum(TransactionStatus, {
    message: 'Status deve ser PENDING, PAID, OVERDUE ou CANCELLED',
  })
  status?: TransactionStatus;

  @IsOptional()
  @IsUUID('4', { message: 'ID da categoria deve ser um UUID válido' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID do cliente deve ser um UUID válido' })
  clientId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID do fornecedor deve ser um UUID válido' })
  supplierId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID do segmento deve ser um UUID válido' })
  segmentId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID da conta bancária deve ser um UUID válido' })
  bankAccountId?: string;

  @IsOptional()
  @IsArray({ message: 'Tags deve ser um array' })
  @IsString({ each: true, message: 'Cada tag deve ser uma string' })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notas devem ter no máximo 1000 caracteres' })
  notes?: string;
}
