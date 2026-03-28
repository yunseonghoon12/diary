import { Module } from '@nestjs/common';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';
import { TeacherReplyService } from './teacher-reply.service';

@Module({
  controllers: [DiaryController],
  providers: [DiaryService, TeacherReplyService],
})
export class DiaryModule {}
