import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../../../domain/errors/domain.error.js';
import { ApplicationError } from '../../../application/errors/application.error.js';

const errorStatuses: Record<string, number> = {
  INVALID_IDENTIFIER: HttpStatus.BAD_REQUEST,
  INVALID_USER_TOKEN: HttpStatus.UNAUTHORIZED,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  ORDER_FORBIDDEN: HttpStatus.FORBIDDEN,
  CART_NOT_FOUND: HttpStatus.NOT_FOUND,
  CART_ITEM_NOT_FOUND: HttpStatus.NOT_FOUND,
  ORDER_NOT_FOUND: HttpStatus.NOT_FOUND,
  PRODUCT_UNAVAILABLE: HttpStatus.CONFLICT,
  CART_EMPTY: HttpStatus.CONFLICT,
  ORDER_INVALID_TRANSITION: HttpStatus.CONFLICT,
  INVALID_PAYMENT_RESULT: HttpStatus.CONFLICT,
  INVALID_ORDER_FILTER: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_PAGINATION: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_IDEMPOTENCY_KEY: HttpStatus.UNPROCESSABLE_ENTITY,
  CART_INVALID_QUANTITY: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_QUANTITY: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_MONEY: HttpStatus.UNPROCESSABLE_ENTITY,
  DEPENDENCY_INVALID_RESPONSE: HttpStatus.BAD_GATEWAY,
  DEPENDENCY_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
  CHECKOUT_COMPENSATION_FAILED: HttpStatus.SERVICE_UNAVAILABLE,
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const domainOrApplication =
      exception instanceof DomainError || exception instanceof ApplicationError;
    const statusCode = domainOrApplication
      ? errorStatuses[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR
      : exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const code = domainOrApplication
      ? exception.code
      : statusCode === HttpStatus.BAD_REQUEST
        ? 'VALIDATION_ERROR'
        : statusCode === HttpStatus.UNAUTHORIZED
          ? 'UNAUTHORIZED'
          : statusCode === HttpStatus.FORBIDDEN
            ? 'FORBIDDEN'
            : 'INTERNAL_ERROR';
    const message = domainOrApplication
      ? exception.message
      : exception instanceof HttpException
        ? this.httpMessage(exception)
        : 'Error interno del servidor';

    response.status(statusCode).json({
      statusCode,
      code,
      message,
      details: {},
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  private httpMessage(exception: HttpException): string {
    const payload = exception.getResponse();
    if (typeof payload === 'string') {
      return payload;
    }
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const { message } = payload;
      return Array.isArray(message) ? message.join('; ') : String(message);
    }
    return exception.message;
  }
}
