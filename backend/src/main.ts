import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // CORS restrito por lista de origens configurável via env var
  const corsOrigins = process.env['CORS_ORIGINS']
    ?.split(',')
    .map((s) => s.trim()) ?? [
    'http://localhost:3001',
    'http://localhost:3000',
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validação global com class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtro global de exceções com mensagens em português
  app.useGlobalFilters(new HttpExceptionFilter());

  // Interceptor que padroniza respostas de sucesso
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);

  console.log(`🚀 Servidor rodando em http://localhost:${port}/api`);
}

bootstrap();
