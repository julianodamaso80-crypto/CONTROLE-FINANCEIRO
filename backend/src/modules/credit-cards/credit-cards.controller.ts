import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { CreditCardsService } from './credit-cards.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { CreateCardExpenseDto } from './dto/create-card-expense.dto';

@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly cardsService: CreditCardsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query('includeInactive') includeInactive?: string) {
    return this.cardsService.findAll(user.companyId, includeInactive === 'true');
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.cardsService.findOne(user.companyId, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCreditCardDto) {
    return this.cardsService.create(user.companyId, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateCreditCardDto) {
    return this.cardsService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.cardsService.remove(user.companyId, id);
  }

  // === Despesas no cartão ===
  @Post(':id/expenses')
  addExpense(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateCardExpenseDto,
  ) {
    return this.cardsService.addExpense(user.companyId, user.userId, id, dto);
  }

  // === Faturas ===
  @Get(':id/invoices')
  listInvoices(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.cardsService.listInvoices(user.companyId, id);
  }

  @Get('invoices/:invoiceId')
  getInvoice(@CurrentUser() user: RequestUser, @Param('invoiceId') invoiceId: string) {
    return this.cardsService.getInvoiceDetail(user.companyId, invoiceId);
  }

  @Post('invoices/:invoiceId/pay')
  payInvoice(
    @CurrentUser() user: RequestUser,
    @Param('invoiceId') invoiceId: string,
    @Body('paidAmount') paidAmount?: number,
  ) {
    return this.cardsService.payInvoice(user.companyId, invoiceId, paidAmount);
  }
}
