import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccountOwnerGuard } from '../../common/guards/account-owner.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('me')
  async getMyCompany(@CurrentUser() user: RequestUser) {
    return this.companiesService.getMyCompany(user.companyId);
  }

  @Put('me')
  @UseGuards(AccountOwnerGuard)
  async updateMyCompany(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateMyCompany(user.companyId, dto);
  }
}
