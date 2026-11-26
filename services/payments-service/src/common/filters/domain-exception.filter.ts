import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  InvalidPaymentIdempotencyKeyError,
  PaymentIdempotencyConflictError,
  PaymentNotFoundError,
} from '../../domain/errors/payment-errors.js';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception instanceof PaymentNotFoundError
          ? HttpStatus.NOT_FOUND
          : exception instanceof PaymentIdempotencyConflictError
            ? HttpStatus.CONFLICT
            : exception instanceof InvalidPaymentIdempotencyKeyError
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof Error ? exception.message : 'Unexpected error';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
