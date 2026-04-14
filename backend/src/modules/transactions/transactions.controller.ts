import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';
import { MarkAsPaidDto } from './dto/mark-as-paid.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() filters: FilterTransactionsDto,
  ) {
    return this.transactionsService.findAll(user.companyId, filters);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.transactionsService.findOne(user.companyId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(
      user.companyId,
      user.userId,
      dto,
    );
  }

  @Put(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.transactionsService.remove(user.companyId, id);
  }

  @Patch(':id/pay')
  async markAsPaid(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: MarkAsPaidDto,
  ) {
    return this.transactionsService.markAsPaid(user.companyId, id, dto);
  }

  @Patch(':id/cancel')
  async cancel(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.transactionsService.cancel(user.companyId, id);
  }
}
