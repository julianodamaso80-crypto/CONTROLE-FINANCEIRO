import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  // rawBody: true expõe req.rawBody (Buffer) pra validar a assinatura HMAC
  // do webhook do WhatsApp Cloud sem perder o parse JSON normal.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');

  // CORS: aceita localhost em dev, qualquer subdomínio de meucaixa.store /
  // meucaixa.ia.br e vercel.app em prod, além de origens extras via CORS_ORIGINS
  const extraOrigins = process.env['CORS_ORIGINS']
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      const allowed =
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||
        /\.meucaixa\.store$/.test(origin) ||
        origin === 'https://meucaixa.store' ||
        /\.meucaixa\.ia\.br$/.test(origin) ||
        origin === 'https://meucaixa.ia.br' ||
        /\.vercel\.app$/.test(origin) ||
        extraOrigins.includes(origin);
      // Origem não permitida → nega limpo (sem lançar, pra não virar 500)
      callback(null, allowed);
    },
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
