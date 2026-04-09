import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateSegmentDto {
  @IsString({ message: 'Nome do segmento é obrigatório' })
  @MinLength(1, { message: 'Nome do segmento é obrigatório' })
  @MaxLength(60, { message: 'Nome do segmento deve ter no máximo 60 caracteres' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Descrição deve ter no máximo 255 caracteres' })
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Cor deve estar no formato hexadecimal #RRGGBB',
  })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40, { message: 'Ícone deve ter no máximo 40 caracteres' })
  icon?: string;
}
