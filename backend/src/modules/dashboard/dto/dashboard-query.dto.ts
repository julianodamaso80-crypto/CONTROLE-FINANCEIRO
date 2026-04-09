import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'ID do segmento deve ser um UUID válido' })
  segmentId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data inicial inválida' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data final inválida' })
  dateTo?: string;
}
