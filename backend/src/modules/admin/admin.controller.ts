import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { AdminAuditService } from './admin-audit.service';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('companies')
  listCompanies() {
    return this.adminService.listCompanies();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  createUser(
    @Body()
    body: {
      name: string;
      email: string;
      phone: string;
      password: string;
      accessType: 'TRIAL' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
    },
    @Req() req: Request,
  ) {
    return this.adminService.createUser(body, req);
  }

  @Patch('users/:id/access')
  updateAccess(
    @Param('id') id: string,
    @Body() body: { accessType: 'TRIAL' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME' },
    @Req() req: Request,
  ) {
    return this.adminService.updateUserAccess(id, body.accessType, req);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; phone?: string },
    @Req() req: Request,
  ) {
    return this.adminService.updateUserData(id, body, req);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Req() req: Request) {
    return this.adminService.deleteUser(id, req);
  }

  @Get('actions')
  listActions(
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('targetId') targetId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.list({
      adminId,
      action,
      targetId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }
}
