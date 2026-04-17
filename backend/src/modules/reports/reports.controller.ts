import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('usage')
  async usage(@CurrentUser() user: RequestUser) {
    return this.reportsService.getUsage(user.companyId);
  }

  @Post('generate')
  @HttpCode(200)
  @Header('Content-Type', 'application/pdf')
  async generate(
    @CurrentUser() user: RequestUser,
    @Body() dto: GenerateReportDto,
    @Res() res: Response,
  ) {
    const { pdf, filename } = await this.reportsService.generate({
      companyId: user.companyId,
      userId: user.userId,
      from: dto.from,
      to: dto.to,
      source: dto.source ?? 'PANEL',
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Length', String(pdf.length));
    res.end(pdf);
  }
}
