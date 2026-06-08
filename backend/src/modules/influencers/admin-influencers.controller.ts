import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CommissionService } from './commission.service';
import { InfluencersService } from './influencers.service';

/**
 * Gestão de influencers e comissões pelo painel admin.
 * A criação de influencer acontece pelo fluxo de "Adicionar cliente"
 * (AdminController POST /admin/users com role INFLUENCER).
 */
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminInfluencersController {
  constructor(
    private readonly influencers: InfluencersService,
    private readonly commissions: CommissionService,
  ) {}

  @Get('influencers')
  list() {
    return this.influencers.listForAdmin();
  }

  @Get('influencers/simple')
  listSimple() {
    return this.influencers.listSimple();
  }

  @Patch('influencers/:id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      refCode?: string;
      saleCommissionPct?: number;
      recurringCommissionPct?: number;
      pixKey?: string;
      notes?: string;
      isActive?: boolean;
    },
  ) {
    return this.influencers.updateProfile(id, body);
  }

  @Get('commissions')
  listCommissions(@Query('influencerId') influencerId?: string) {
    return this.influencers.listCommissionsForAdmin(influencerId);
  }

  @Patch('commissions/:id/pay')
  payCommission(@Param('id') id: string) {
    return this.commissions.markPaid(id);
  }

  @Patch('commissions/:id/cancel')
  cancelCommission(@Param('id') id: string) {
    return this.commissions.cancel(id);
  }
}
