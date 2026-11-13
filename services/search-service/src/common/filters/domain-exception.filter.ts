import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  CatalogUnavailableError,
  ValidationError,
} from '../../search/domain/errors/domain-error.js';

@Catch(ValidationError, CatalogUnavailableError)
export class DomainExceptionFilter implements ExceptionFilter<ValidationError | CatalogUnavailableError> {
  catch(exception: ValidationError | CatalogUnavailableError, host: ArgumentsHost): void {
    const status =
      exception instanceof ValidationError ? HttpStatus.BAD_REQUEST : HttpStatus.BAD_GATEWAY;
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}