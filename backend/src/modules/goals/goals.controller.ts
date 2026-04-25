import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ContributeGoalDto } from './dto/contribute-goal.dto';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.goalsService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.goalsService.findOne(user.companyId, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(user.companyId, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goalsService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.goalsService.remove(user.companyId, id);
  }

  @Post(':id/contribute')
  contribute(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ContributeGoalDto,
  ) {
    return this.goalsService.contribute(user.companyId, id, dto);
  }

  @Delete(':id/contributions/:contribId')
  removeContribution(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('contribId') contribId: string,
  ) {
    return this.goalsService.removeContribution(user.companyId, id, contribId);
  }
}
