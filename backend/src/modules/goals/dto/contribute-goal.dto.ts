import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ContributeGoalDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
