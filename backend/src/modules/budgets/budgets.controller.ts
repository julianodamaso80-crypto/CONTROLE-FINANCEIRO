import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.budgetsService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.budgetsService.findOne(user.companyId, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(user.companyId, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.budgetsService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.budgetsService.remove(user.companyId, id);
  }
}
