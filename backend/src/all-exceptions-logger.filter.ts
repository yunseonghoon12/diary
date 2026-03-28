import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsLoggerFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const httpBody = isHttp ? exception.getResponse() : undefined;

    const prismaHint = prismaErrorHint(exception);
    const causeMsg =
      exception instanceof Error ? exception.message : String(exception);

    const summary = {
      method: req.method,
      path: req.originalUrl,
      status,
      cause: prismaHint ? `${causeMsg} | ${prismaHint}` : causeMsg,
    };

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(JSON.stringify(summary), stack);
    } else {
      this.logger.warn(JSON.stringify(summary));
    }

    if (isHttp) {
      if (typeof httpBody === 'object' && httpBody !== null) {
        res.status(status).json(httpBody);
      } else {
        res.status(status).json({ statusCode: status, message: httpBody });
      }
      return;
    }

    const isProd = process.env.NODE_ENV === 'production';
    res.status(status).json({
      statusCode: status,
      message: isProd ? 'Internal server error' : causeMsg,
      ...(isProd ? {} : prismaHint ? { detail: prismaHint } : {}),
    });
  }
}

function prismaErrorHint(exception: unknown): string | undefined {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return `Prisma ${exception.code} meta=${JSON.stringify(exception.meta)}`;
  }
  if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
    return `Prisma unknown: ${exception.message}`;
  }
  if (exception instanceof Prisma.PrismaClientValidationError) {
    return 'PrismaClientValidationError (스키마·쿼리와 DB 불일치)';
  }
  if (exception instanceof Prisma.PrismaClientRustPanicError) {
    return 'PrismaClientRustPanicError';
  }
  if (exception instanceof Prisma.PrismaClientInitializationError) {
    return `Prisma init: ${exception.message}`;
  }
  return undefined;
}
