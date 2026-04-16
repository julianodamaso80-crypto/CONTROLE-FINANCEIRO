import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  @Patch('users/:id/access')
  updateAccess(
    @Param('id') id: string,
    @Body() body: { accessType: 'TRIAL' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME' },
  ) {
    return this.adminService.updateUserAccess(id, body.accessType);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
