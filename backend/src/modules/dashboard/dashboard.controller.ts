import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(
    @CurrentUser() user: RequestUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getDashboard(user.companyId, query);
  }

  @Get('month-comparison')
  async getMonthComparison(
    @CurrentUser() user: RequestUser,
    @Query('months') months?: string,
  ) {
    const n = months ? parseInt(months, 10) : 6;
    return this.dashboardService.getMonthComparison(
      user.companyId,
      Math.min(24, Math.max(2, isNaN(n) ? 6 : n)),
    );
  }

  @Get('cashflow-forecast')
  async getCashflowForecast(
    @CurrentUser() user: RequestUser,
    @Query('days') days?: string,
  ) {
    const n = days ? parseInt(days, 10) : 60;
    return this.dashboardService.getCashflowForecast(
      user.companyId,
      Math.min(180, Math.max(7, isNaN(n) ? 60 : n)),
    );
  }
}
