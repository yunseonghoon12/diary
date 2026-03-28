import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const httpLog = new Logger('HTTP');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const t0 = Date.now();
    res.on('finish', () => {
      httpLog.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - t0}ms)`);
    });
    next();
  });
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));
  const isProd = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: isProd
      ? (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map((s) => s.trim())
      : true,
    credentials: true,
  });
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
}
bootstrap();
