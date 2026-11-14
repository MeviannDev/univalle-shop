import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  InvalidProductError,
  ProductNotFoundError,
} from '../../../domain/product.js';

@Catch(ProductNotFoundError, InvalidProductError)
export class ProductExceptionFilter implements ExceptionFilter {
  catch(
    exception: ProductNotFoundError | InvalidProductError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const httpException =
      exception instanceof ProductNotFoundError
        ? new NotFoundException(exception.message)
        : new BadRequestException(exception.message);

    response.status(httpException.getStatus()).json({
      statusCode: httpException.getStatus(),
      message: exception.message,
      path: request.url,
    });
  }
}
