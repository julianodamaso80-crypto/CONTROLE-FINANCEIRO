import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCardExpenseDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  description!: string;

  @Type(() => Date)
  @IsDate()
  date!: Date;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  segmentId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalInstallments?: number;

  @IsOptional()
  @IsBoolean()
  isRefund?: boolean;
}
