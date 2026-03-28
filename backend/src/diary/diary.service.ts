import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDiaryDto } from './dto/create-diary.dto';
import { TeacherReplyService } from './teacher-reply.service';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

@Injectable()
export class DiaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherReply: TeacherReplyService,
  ) {}

  private parseEntryDate(ymd: string): Date {
    const m = DATE_RE.exec(ymd.trim());
    if (!m) {
      throw new BadRequestException('entryDate must be YYYY-MM-DD');
    }
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (
      dt.getUTCFullYear() !== y ||
      dt.getUTCMonth() !== mo - 1 ||
      dt.getUTCDate() !== d
    ) {
      throw new BadRequestException('invalid entryDate');
    }
    return dt;
  }

  /** 제출마다 새 row insert (같은 날짜 여러 번 가능) */
  async create(firebaseUid: string, dto: CreateDiaryDto) {
    if (dto.entryDate == null || String(dto.entryDate).trim() === '') {
      throw new BadRequestException('entryDate is required');
    }
    const entryDate = this.parseEntryDate(dto.entryDate);
    const custom = dto.title != null ? String(dto.title).trim() : "";
    const title =
      custom.length > 0
        ? custom.slice(0, 120)
        : `그림일기 ${dto.entryDate}`;

    const picture =
      dto.picturePngBase64 != null && dto.picturePngBase64 !== ''
        ? dto.picturePngBase64.replace(/^data:image\/\w+;base64,/, '')
        : null;

    if (picture && picture.length > 12 * 1024 * 1024) {
      throw new BadRequestException('picture too large (max ~12MB base64)');
    }

    const user = await this.prisma.user.upsert({
      where: { firebaseUid },
      create: { firebaseUid },
      update: {},
    });

    const entry = await this.prisma.diaryEntry.create({
      data: {
        userId: user.id,
        title,
        content: dto.content ?? null,
        entryDate,
        weather: dto.weather ?? null,
        wakeTime: dto.wakeTime ?? null,
        picturePngBase64: picture,
      },
    });

    const reply = await this.teacherReply.generateReply({
      entryDate: dto.entryDate.trim(),
      weather: dto.weather ?? null,
      wakeTime: dto.wakeTime ?? null,
      content: dto.content ?? null,
      hasPicture: Boolean(picture),
    });

    if (reply == null) {
      return entry;
    }

    return this.prisma.diaryEntry.update({
      where: { id: entry.id },
      data: { teacherReply: reply },
    });
  }

  async listForUser(firebaseUid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
    });
    if (!user) {
      return [];
    }
    return this.prisma.diaryEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        entryDate: true,
        createdAt: true,
        weather: true,
        title: true,
      },
    });
  }

  async findByIdForUser(firebaseUid: string, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
    });
    if (!user) {
      throw new NotFoundException('Diary entry not found');
    }
    const entry = await this.prisma.diaryEntry.findFirst({
      where: { id, userId: user.id },
    });
    if (!entry) {
      throw new NotFoundException('Diary entry not found');
    }
    return entry;
  }

  async deleteForUser(firebaseUid: string, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
    });
    if (!user) {
      throw new NotFoundException('Diary entry not found');
    }
    const r = await this.prisma.diaryEntry.deleteMany({
      where: { id, userId: user.id },
    });
    if (r.count === 0) {
      throw new NotFoundException('Diary entry not found');
    }
  }
}
