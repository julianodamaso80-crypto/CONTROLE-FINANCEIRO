import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async updateMyCompany(companyId: string, dto: UpdateCompanyDto) {
    // Garante que a empresa existe antes de atualizar
    await this.getMyCompany(companyId);

    return this.prisma.company.update({
      where: { id: companyId },
      data: dto,
    });
  }
}
