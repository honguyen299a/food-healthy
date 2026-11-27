import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { PrismaErrorFilter } from './common/filters/prisma-error.filter';

async function bootstrap() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error('JWT_SECRET must contain at least 32 characters');
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:4200' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new PrismaErrorFilter());
  await app.listen(Number(process.env.PORT || 3000));
}
bootstrap();
