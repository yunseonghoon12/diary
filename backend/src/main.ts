import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
