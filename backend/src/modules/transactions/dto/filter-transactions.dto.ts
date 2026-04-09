import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TransactionStatus, TransactionType } from '@prisma/client';

export class FilterTransactionsDto {
  @IsOptional()
  @IsEnum(TransactionType, { message: 'Tipo deve ser INCOME ou EXPENSE' })
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus, {
    message: 'Status deve ser PENDING, PAID, OVERDUE ou CANCELLED',
  })
  status?: TransactionStatus;

  @IsOptional()
  @IsUUID('4', { message: 'ID da categoria deve ser um UUID válido' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID do segmento deve ser um UUID válido' })
  segmentId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID da conta bancária deve ser um UUID válido' })
  bankAccountId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data inicial inválida' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data final inválida' })
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Página deve ser um número inteiro' })
  @Min(1, { message: 'Página mínima é 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limite deve ser um número inteiro' })
  @Min(1, { message: 'Limite mínimo é 1' })
  @Max(100, { message: 'Limite máximo é 100' })
  limit?: number;

  @IsOptional()
  @IsIn(['date', 'amount', 'createdAt', 'description'], {
    message: 'Ordenação deve ser: date, amount, createdAt ou description',
  })
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'Direção deve ser asc ou desc' })
  sortOrder?: 'asc' | 'desc';
}
