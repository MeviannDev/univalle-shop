import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CommitStockReservationUseCase } from '../../application/use-cases/commit-stock-reservation.use-case.js';
import { ReleaseStockReservationUseCase } from '../../application/use-cases/release-stock-reservation.use-case.js';
import { CancelStockReservationUseCase } from '../../application/use-cases/cancel-stock-reservation.use-case.js';
import { FulfillStockReservationUseCase } from '../../application/use-cases/fulfill-stock-reservation.use-case.js';
import { ReserveStockUseCase } from '../../application/use-cases/reserve-stock.use-case.js';
import { ProductExceptionFilter } from './filters/product-exception.filter.js';
import { InternalApiKeyGuard } from './internal-api-key.guard.js';
import { ReserveStockDto } from './dto/reserve-stock.dto.js';

@ApiTags('Inventario interno')
@Controller('inventory/reservations')
@UseGuards(InternalApiKeyGuard)
@UseFilters(ProductExceptionFilter)
export class InventoryReservationsController {
  constructor(
    @Inject(ReserveStockUseCase)
    private readonly reserveStock: ReserveStockUseCase,
    @Inject(CommitStockReservationUseCase)
    private readonly commitStock: CommitStockReservationUseCase,
    @Inject(ReleaseStockReservationUseCase)
    private readonly releaseStock: ReleaseStockReservationUseCase,
    @Inject(CancelStockReservationUseCase)
    private readonly cancelReservation: CancelStockReservationUseCase,
    @Inject(FulfillStockReservationUseCase)
    private readonly fulfillReservation: FulfillStockReservationUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Reservar existencias de forma atómica (solo servicios internos)',
  })
  @ApiHeader({ name: 'X-Internal-Api-Key', required: true })
  @ApiBody({ type: ReserveStockDto })
  @ApiCreatedResponse({
    schema: {
      example: {
        reservationId: 'reservation_2a6f6a82-913e-47da-9a9d-b59e83f51a80',
        productId: '665a1c42e249b316a38f0201',
        quantity: 2,
        status: 'RESERVED',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'El cuerpo o el producto no son válidos.',
  })
  @ApiConflictResponse({
    description: 'Stock insuficiente o referencia en conflicto.',
  })
  @ApiNotFoundResponse({ description: 'Producto inexistente.' })
  @ApiUnauthorizedResponse({ description: 'API key interna inválida.' })
  async reserve(@Body() body: ReserveStockDto) {
    return this.reserveStock.execute(body);
  }

  @Post(':reservationId/commit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar una reserva tras aprobar el pago' })
  @ApiHeader({ name: 'X-Internal-Api-Key', required: true })
  @ApiOkResponse({
    schema: {
      example: { reservationId: 'reservation_123', status: 'COMMITTED' },
    },
  })
  @ApiConflictResponse({ description: 'La reserva ya fue liberada.' })
  @ApiNotFoundResponse({ description: 'Reserva inexistente.' })
  @ApiUnauthorizedResponse({ description: 'API key interna inválida.' })
  async commit(@Param('reservationId') reservationId: string) {
    return this.commitStock.execute(reservationId);
  }

  @Delete(':reservationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liberar una reserva y devolver stock' })
  @ApiHeader({ name: 'X-Internal-Api-Key', required: true })
  @ApiOkResponse({
    schema: {
      example: { reservationId: 'reservation_123', status: 'RELEASED' },
    },
  })
  @ApiConflictResponse({ description: 'La reserva ya fue confirmada.' })
  @ApiUnauthorizedResponse({ description: 'API key interna inválida.' })
  async release(@Param('reservationId') reservationId: string) {
    return this.releaseStock.execute(reservationId);
  }

  @Post(':reservationId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar una reserva y devolver el stock correspondiente',
  })
  @ApiHeader({ name: 'X-Internal-Api-Key', required: true })
  @ApiOkResponse({
    schema: {
      example: { reservationId: 'reservation_123', status: 'RETURNED' },
    },
  })
  @ApiConflictResponse({
    description: 'La reserva no se puede cancelar en su estado actual.',
  })
  @ApiUnauthorizedResponse({ description: 'API key interna inválida.' })
  async cancel(@Param('reservationId') reservationId: string) {
    return this.cancelReservation.execute(reservationId);
  }

  @Post(':reservationId/fulfill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar una reserva confirmada cuando la orden se entrega',
  })
  @ApiHeader({ name: 'X-Internal-Api-Key', required: true })
  @ApiOkResponse({
    schema: {
      example: { reservationId: 'reservation_123', status: 'FULFILLED' },
    },
  })
  @ApiConflictResponse({
    description: 'Solo se puede completar una reserva confirmada.',
  })
  @ApiNotFoundResponse({ description: 'Reserva inexistente.' })
  @ApiUnauthorizedResponse({ description: 'API key interna inválida.' })
  async fulfill(@Param('reservationId') reservationId: string) {
    return this.fulfillReservation.execute(reservationId);
  }
}
