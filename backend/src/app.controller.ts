import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';
import { FirebaseUid } from './auth/firebase-user.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return { ok: true as const };
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  me(@FirebaseUid() uid: string | undefined) {
    return { uid };
  }
}
