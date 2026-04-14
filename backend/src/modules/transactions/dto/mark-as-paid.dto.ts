import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class MarkAsPaidDto {
  @IsOptional()
  @IsDateString({}, { message: 'Data de pagamento inválida' })
  paymentDate?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID da conta bancária inválido' })
  bankAccountId?: string;
}
