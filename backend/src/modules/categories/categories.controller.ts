import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CategoriesService } from './categories.service';
import { seedDefaultCategories } from './categories-seed';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: RequestUser) {
    return this.categoriesService.findAll(user.companyId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.categoriesService.findOne(user.companyId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(user.companyId, dto);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.categoriesService.remove(user.companyId, id);
  }

  /**
   * Instala as categorias sugeridas (idempotente — não duplica).
   * Útil pra clientes existentes que criaram a conta antes do seed.
   */
  @Post('seed')
  async seed(@CurrentUser() user: RequestUser) {
    const result = await seedDefaultCategories(
      this.prisma as never,
      user.companyId,
    );
    return result;
  }
}
