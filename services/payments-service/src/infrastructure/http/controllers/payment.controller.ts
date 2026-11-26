import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CancelPaymentUseCase } from '../../../application/use-cases/cancel-payment.use-case.js';
import { CancelPaymentDto } from '../../../application/dtos/cancel-payment.dto.js';
import { CreatePaymentDto } from '../../../application/dtos/create-payment.dto.js';
import { ProcessPaymentUseCase } from '../../../application/use-cases/process-payment.use-case.js';
import {
  PAYMENT_REPOSITORY_PORT,
  type PaymentRepositoryPort,
} from '../../../domain/ports/payment.repository.js';
import { InternalApiKeyGuard } from '../internal-api-key.guard.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly cancelPaymentUseCase: CancelPaymentUseCase,
    @Inject(PAYMENT_REPOSITORY_PORT)
    private readonly paymentRepository: PaymentRepositoryPort,
  ) {}

  @Post('simulate')
  @UseGuards(InternalApiKeyGuard)
  @ApiOperation({ summary: 'Simula un pago de una orden' })
  @ApiHeader({ name: 'X-Internal-Api-Key', required: true })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    example: 'checkout-2026-0001',
  })
  @ApiBody({
    type: CreatePaymentDto,
    examples: {
      card: {
        summary: 'Pago simulado con tarjeta',
        value: {
          orderId: 'order_123',
          userId: 'user_123',
          amount: 125000,
          currency: 'COP',
          method: 'card',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Pago simulado y persistido.',
    schema: {
      example: {
        id: 'payment_123',
        orderId: 'order_123',
        userId: 'user_123',
        amount: 125000,
        currency: 'COP',
        method: 'card',
        status: 'approved',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Los campos del pago no son válidos.' })
  @ApiUnauthorizedResponse({ description: 'API key interna inválida.' })
  @ApiConflictResponse({
    description: 'La clave de idempotencia ya se usó con otros datos.',
  })
  async simulatePayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException(
        'El header Idempotency-Key es obligatorio.',
      );
    }
    return this.processPaymentUseCase.execute(createPaymentDto, idempotencyKey);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalApiKeyGuard)
  @ApiOperation({ summary: 'Cancelar o reembolsar el pago de una orden' })
  @ApiHeader({ name: 'X-Internal-Api-Key', required: true })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiBody({ type: CancelPaymentDto })
  @ApiOkResponse({
    description: 'Pago cancelado o reembolsado idempotentemente.',
  })
  @ApiBadRequestResponse({
    description: 'Falta una clave de idempotencia válida.',
  })
  @ApiUnauthorizedResponse({ description: 'API key interna inválida.' })
  @ApiConflictResponse({
    description: 'El pago ya fue cancelado con otra clave.',
  })
  async cancelPayment(
    @Param('id') id: string,
    @Body() body: CancelPaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException(
        'El header Idempotency-Key es obligatorio.',
      );
    }
    return this.cancelPaymentUseCase.execute(id, body.orderId, idempotencyKey);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un pago por su ID' })
  @ApiParam({ name: 'id', example: 'payment_123' })
  @ApiOkResponse({ description: 'Pago encontrado o null si no existe.' })
  async findById(@Param('id') id: string) {
    return this.paymentRepository.findById(id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Obtiene un pago por la orden' })
  @ApiParam({ name: 'orderId', example: 'order_123' })
  @ApiOkResponse({ description: 'Pago de la orden o null si no existe.' })
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.paymentRepository.findByOrderId(orderId);
  }
}
