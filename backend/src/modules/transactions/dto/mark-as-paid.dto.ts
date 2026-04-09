import { IsDateString, IsOptional } from 'class-validator';

export class MarkAsPaidDto {
  @IsOptional()
  @IsDateString({}, { message: 'Data de pagamento inválida' })
  paymentDate?: string;
}
