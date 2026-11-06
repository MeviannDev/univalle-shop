import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../modules/users/domain/exceptions/domain-error.js';

const STATUS_BY_CODE: Record<DomainError['code'], HttpStatus> = {
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
  EMAIL_ALREADY_REGISTERED: HttpStatus.CONFLICT,
  USER_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  EMAIL_NOT_VERIFIED: HttpStatus.UNAUTHORIZED,
  USER_SUSPENDED: HttpStatus.FORBIDDEN,
  INVALID_STATE_TRANSITION: HttpStatus.CONFLICT,
  FORBIDDEN_OPERATION: HttpStatus.FORBIDDEN,
  ADDRESS_NOT_FOUND: HttpStatus.NOT_FOUND,
};

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(exception: DomainError, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(STATUS_BY_CODE[exception.code])
      .json({
        statusCode: STATUS_BY_CODE[exception.code],
        code: exception.code,
        message: exception.message,
      });
  }
}
