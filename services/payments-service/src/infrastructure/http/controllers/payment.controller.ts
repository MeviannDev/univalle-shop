import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePaymentDto } from '../../../application/dtos/create-payment.dto.js';
import { ProcessPaymentUseCase } from '../../../application/use-cases/process-payment.use-case.js';
import { PAYMENT_REPOSITORY_PORT, type PaymentRepositoryPort } from '../../../domain/ports/payment.repository.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    @Inject(PAYMENT_REPOSITORY_PORT)
    private readonly paymentRepository: PaymentRepositoryPort,
  ) {}

  @Post('simulate')
  @ApiOperation({ summary: 'Simula un pago de una orden' })
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
  async simulatePayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.processPaymentUseCase.execute(createPaymentDto);
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
