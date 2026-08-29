import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from './dto/document-type.dto';

@Injectable()
export class DocumentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.documentType.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const docType = await this.prisma.documentType.findUnique({ where: { id } });
    if (!docType) throw new NotFoundException('Tipo de documento não encontrado');
    return docType;
  }

  create(dto: CreateDocumentTypeDto) {
    return this.prisma.documentType.create({ data: dto });
  }

  async update(id: string, dto: UpdateDocumentTypeDto) {
    await this.findOne(id);
    return this.prisma.documentType.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.documentType.delete({ where: { id } });
  }
}
