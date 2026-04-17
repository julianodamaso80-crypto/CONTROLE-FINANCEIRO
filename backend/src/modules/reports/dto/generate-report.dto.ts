import { IsDateString, IsOptional, IsString, IsIn } from 'class-validator';

export class GenerateReportDto {
  @IsDateString()
  from!: string; // YYYY-MM-DD

  @IsDateString()
  to!: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  @IsIn(['PANEL', 'WHATSAPP'])
  source?: 'PANEL' | 'WHATSAPP';
}
