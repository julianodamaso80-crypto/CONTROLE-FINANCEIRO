import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let error: string;
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        // class-validator retorna array de mensagens
        message = Array.isArray(resp['message'])
          ? (resp['message'] as string[]).join(', ')
          : (resp['message'] as string) ?? exception.message;
        error = (resp['error'] as string) ?? exception.name;
        if (typeof resp['code'] === 'string') code = resp['code'] as string;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError
    ) {
      // Mapeamento de erros comuns do Prisma
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Registro duplicado: este valor já existe';
          error = 'Conflict';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Registro não encontrado';
          error = 'Not Found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Referência inválida a outro registro';
          error = 'Bad Request';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Erro interno do servidor';
          error = 'Internal Server Error';
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Erro interno do servidor';
      error = 'Internal Server Error';
    }

    // Log para debugging
    console.error(
      `[${request.method}] ${request.url} - ${status}:`,
      exception instanceof Error ? exception.message : exception,
    );

    response.status(status).json({
      statusCode: status,
      message,
      error,
      ...(code ? { code } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
