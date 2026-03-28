import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { CreateDiaryDto } from './dto/create-diary.dto';
import { DiaryService } from './diary.service';

/** 로그인 연동 전까지 고정 사용자 (Firebase UID 자리) */
const GUEST_FIREBASE_UID = 'test';

@Controller('diaries')
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Get()
  list() {
    return this.diaryService.listForUser(GUEST_FIREBASE_UID);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.diaryService.findByIdForUser(GUEST_FIREBASE_UID, id);
  }

  @Post()
  submit(@Body() body: CreateDiaryDto) {
    return this.diaryService.create(GUEST_FIREBASE_UID, body);
  }
}
