import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CategoryType } from '@prisma/client';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'Nome da categoria é obrigatório' })
  @MinLength(1, { message: 'Nome da categoria é obrigatório' })
  @MaxLength(60, { message: 'Nome da categoria deve ter no máximo 60 caracteres' })
  name?: string;

  @IsOptional()
  @IsEnum(CategoryType, { message: 'Tipo inválido. Use: INCOME, EXPENSE ou BOTH' })
  type?: CategoryType;

  @IsOptional()
  @IsString({ message: 'Cor é obrigatória' })
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Cor deve estar no formato hexadecimal #RRGGBB',
  })
  color?: string;

  @IsOptional()
  @IsString({ message: 'Ícone é obrigatório' })
  icon?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID da categoria pai deve ser um UUID válido' })
  parentCategoryId?: string;
}
