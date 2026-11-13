import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CheckAvailabilityUseCase } from '../../application/use-cases/check-availability.use-case.js';
import { ReserveStockUseCase } from '../../application/use-cases/reserve-stock.use-case.js';
import { ReleaseStockUseCase } from '../../application/use-cases/release-stock.use-case.js';
import { CommitStockUseCase } from '../../application/use-cases/commit-stock.use-case.js';
import { StockOperationDto } from '../../application/dtos/stock-operations.dto.js';

/**
 * Endpoints INTERNOS de stock.
 * Estos NO deben exponerse a través del API Gateway.
 * Solo deben ser consumidos por orders-service (red interna / docker network).
 */
@Controller('internal/stock')
export class StockController {
  constructor(
    private readonly checkAvailability: CheckAvailabilityUseCase,
    private readonly reserveStock: ReserveStockUseCase,
    private readonly releaseStock: ReleaseStockUseCase,
    private readonly commitStock: CommitStockUseCase,
  ) {}

  @Post('check-availability')
  async check(@Body() dto: StockOperationDto) {
    return this.checkAvailability.execute(dto.productId, dto.quantity);
  }

  @Post('reserve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reserve(@Body() dto: StockOperationDto) {
    await this.reserveStock.execute(dto.productId, dto.quantity);
  }

  @Post('release')
  @HttpCode(HttpStatus.NO_CONTENT)
  async release(@Body() dto: StockOperationDto) {
    await this.releaseStock.execute(dto.productId, dto.quantity);
  }

  @Post('commit')
  @HttpCode(HttpStatus.NO_CONTENT)
  async commit(@Body() dto: StockOperationDto) {
    await this.commitStock.execute(dto.productId, dto.quantity);
  }
}