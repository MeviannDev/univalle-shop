import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderId } from '../../../domain/value-objects/order-id.js';
import {
  ApplyPaymentResult,
  CancelOrder,
  CreateOrderFromCart,
  GetOrderById,
  ListUserOrders,
} from '../../../application/use-cases/orders/index.js';
import { JwtAuthGuard, type AuthenticatedRequest } from '../../auth/jwt-auth.guard.js';
import { InternalApiKeyGuard } from '../../auth/internal-api-key.guard.js';
import {
  CancelOrderDto,
  CheckoutDto,
  OrderIdParamDto,
  OrderListQueryDto,
  PaymentResultDto,
} from '../dto/orders.dto.js';
import { presentOrder, presentPage } from '../presenters/domain.presenter.js';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(CreateOrderFromCart) private readonly checkout: CreateOrderFromCart,
    @Inject(GetOrderById) private readonly getOrder: GetOrderById,
    @Inject(ListUserOrders) private readonly listOrders: ListUserOrders,
    @Inject(CancelOrder) private readonly cancelOrder: CancelOrder,
    @Inject(ApplyPaymentResult) private readonly paymentResult: ApplyPaymentResult,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: true, example: 'checkout-2026-0001' })
  @ApiOperation({ summary: 'Crear una orden desde el carrito' })
  @ApiResponse({ status: 201, schema: { example: { id: 'order_123', status: 'PENDING_PAYMENT', total: { amount: 250000, currency: 'COP' } } } })
  @ApiResponse({ status: 401, description: 'JWT ausente o inválido' })
  @ApiResponse({ status: 409, description: 'Stock insuficiente o conflicto de idempotencia' })
  @ApiResponse({ status: 422, description: 'Clave de idempotencia inválida' })
  @ApiResponse({ status: 502, description: 'Respuesta inválida de un servicio dependiente' })
  @ApiResponse({ status: 503, description: 'Servicio dependiente no disponible' })
  async create(
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() _body: CheckoutDto,
  ) {
    const result = await this.checkout.execute({
      token: request.accessToken!,
      idempotencyKey: idempotencyKey ?? '',
    });
    return presentOrder(result.order);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar el historial propio de órdenes' })
  @ApiResponse({ status: 200, schema: { example: { items: [], page: 1, limit: 20, totalItems: 0, totalPages: 0 } } })
  @ApiResponse({ status: 401, description: 'JWT ausente o inválido' })
  @ApiResponse({ status: 422, description: 'Filtro o paginación inválidos' })
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: OrderListQueryDto,
  ) {
    const page = await this.listOrders.execute({
      token: request.accessToken!,
      filter: { status: query.status },
      page: { page: query.page, limit: query.limit },
    });
    return presentPage(page, presentOrder);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar una orden propia' })
  @ApiResponse({ status: 200, schema: { example: { id: 'order_123', status: 'PENDING_PAYMENT', items: [] } } })
  @ApiResponse({ status: 403, description: 'La orden pertenece a otro usuario' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({ status: 401, description: 'JWT ausente o inválido' })
  async get(
    @Req() request: AuthenticatedRequest,
    @Param() params: OrderIdParamDto,
  ) {
    const result = await this.getOrder.execute({
      token: request.accessToken!,
      orderId: params.id,
    });
    return presentOrder(result.order);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar una orden propia' })
  @ApiResponse({ status: 200, schema: { example: { id: 'order_123', status: 'CANCELLED' } } })
  @ApiResponse({ status: 401, description: 'JWT ausente o inválido' })
  @ApiResponse({ status: 403, description: 'La orden pertenece a otro usuario' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({ status: 409, description: 'La transición de estado no está permitida' })
  @ApiResponse({ status: 503, description: 'No se pudo completar la cancelación' })
  async cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() _body: CancelOrderDto,
  ) {
    const result = await this.cancelOrder.execute({
      token: request.accessToken!,
      orderId,
    });
    return presentOrder(result.order);
  }

  @Post(':id/payment-result')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalApiKeyGuard)
  @ApiHeader({ name: 'X-Internal-Api-Key', required: true })
  @ApiOperation({ summary: 'Aplicar resultado de pago (solo servicio Pagos)' })
  @ApiResponse({ status: 200, schema: { example: { id: 'order_123', status: 'PAID' } } })
  @ApiResponse({ status: 401, description: 'API key interna inválida' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({ status: 409, description: 'Resultado de pago incompatible con la orden' })
  @ApiResponse({ status: 503, description: 'No se pudo guardar el resultado de pago' })
  async applyPayment(
    @Param('id') orderId: string,
    @Body() body: PaymentResultDto,
  ) {
    const result = await this.paymentResult.execute({
      result: {
        paymentId: body.paymentId,
        orderId: new OrderId(orderId),
        result: body.result,
        eventId: body.eventId,
      },
    });
    return { ...presentOrder(result.order), duplicate: result.duplicate };
  }
}
