import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsLoggerFilter } from './all-exceptions-logger.filter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseAuthModule } from './auth/firebase-auth.module';
import { DiaryModule } from './diary/diary.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 루트(diary-app/.env)에만 DATABASE_URL 이 있어도 읽히도록
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    FirebaseAuthModule,
    DiaryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AllExceptionsLoggerFilter },
  ],
})
export class AppModule {}
