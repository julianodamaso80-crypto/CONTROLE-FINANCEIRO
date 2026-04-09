import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { SegmentsService } from './segments.service';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';

@Controller('segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.segmentsService.findAll(user.companyId, includeInactive);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.segmentsService.findOne(user.companyId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSegmentDto,
  ) {
    return this.segmentsService.create(user.companyId, dto);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateSegmentDto,
  ) {
    return this.segmentsService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.segmentsService.remove(user.companyId, id);
  }
}
