import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { ImportsService, OfxImportItemInput } from './imports.service';

interface MulterFile {
  buffer: Buffer;
  size: number;
  originalname: string;
  mimetype: string;
}

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('ofx/preview')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async previewOfx(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: MulterFile,
  ) {
    if (!file) throw new BadRequestException('Arquivo OFX é obrigatório');
    return this.importsService.previewOfx(user.companyId, file.buffer);
  }

  @Post('ofx')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async importOfx(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: MulterFile,
    @Body('selections') selectionsJson: string,
  ) {
    if (!file) throw new BadRequestException('Arquivo OFX é obrigatório');
    let selections: OfxImportItemInput[] = [];
    try {
      selections = JSON.parse(selectionsJson);
    } catch {
      throw new BadRequestException('Campo "selections" inválido (deve ser JSON)');
    }
    if (!Array.isArray(selections) || selections.length === 0) {
      throw new BadRequestException('Selecione ao menos uma transação para importar');
    }
    return this.importsService.importOfx(user.companyId, user.userId, file.buffer, selections);
  }
}
