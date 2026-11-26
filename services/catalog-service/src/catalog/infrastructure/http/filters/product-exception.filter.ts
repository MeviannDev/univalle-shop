import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  InvalidProductError,
  ProductHasActiveReservationsError,
  ProductNotFoundError,
} from '../../../domain/product.js';
import {
  InsufficientStockError,
  InventoryReservationConflictError,
  InventoryReservationNotFoundError,
} from '../../../domain/inventory-reservation.js';

@Catch(
  ProductNotFoundError,
  InvalidProductError,
  ProductHasActiveReservationsError,
  InsufficientStockError,
  InventoryReservationConflictError,
  InventoryReservationNotFoundError,
)
export class ProductExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | ProductNotFoundError
      | InvalidProductError
      | ProductHasActiveReservationsError
      | InsufficientStockError
      | InventoryReservationConflictError
      | InventoryReservationNotFoundError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const httpException =
      exception instanceof ProductNotFoundError ||
      exception instanceof InventoryReservationNotFoundError
        ? new NotFoundException(exception.message)
        : exception instanceof ProductHasActiveReservationsError ||
            exception instanceof InsufficientStockError ||
            exception instanceof InventoryReservationConflictError
          ? new ConflictException(exception.message)
          : new BadRequestException(exception.message);

    response.status(httpException.getStatus()).json({
      statusCode: httpException.getStatus(),
      message: exception.message,
      path: request.url,
    });
  }
}
