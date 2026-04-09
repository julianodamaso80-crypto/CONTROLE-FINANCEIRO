import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // CORS liberado em desenvolvimento
  app.enableCors();

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
