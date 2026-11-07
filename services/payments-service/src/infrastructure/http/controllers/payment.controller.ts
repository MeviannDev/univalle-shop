import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
  async simulatePayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.processPaymentUseCase.execute(createPaymentDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un pago por su ID' })
  async findById(@Param('id') id: string) {
    return this.paymentRepository.findById(id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Obtiene un pago por la orden' })
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.paymentRepository.findByOrderId(orderId);
  }
}
