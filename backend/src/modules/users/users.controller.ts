import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccountOwnerGuard } from '../../common/guards/account-owner.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSelfDto } from './dto/update-self.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@CurrentUser() user: RequestUser) {
    return this.usersService.findAll(user.companyId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.usersService.findOne(user.companyId, id);
  }

  // Precisa vir antes de @Put(':id') senão 'me' cai na rota com parâmetro.
  // Qualquer pessoa da conta edita os próprios dados — inclusive o membro
  // convidado, que não é dono e não passa no AccountOwnerGuard.
  @Put('me')
  async updateSelf(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateSelfDto,
  ) {
    return this.usersService.updateSelf(user.companyId, user.userId, dto);
  }

  @Post()
  @UseGuards(AccountOwnerGuard)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(user.companyId, dto);
  }

  @Put(':id')
  @UseGuards(AccountOwnerGuard)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AccountOwnerGuard)
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.usersService.remove(user.companyId, id);
  }

  @Patch('me/password')
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      user.companyId,
      user.userId,
      dto,
    );
  }
}
