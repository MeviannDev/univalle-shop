import { Controller, Get, Inject, Param, Patch, Query, Req, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserId } from '../../../domain/value-objects/user-id.js';
import { ListOrdersAdmin } from '../../../application/use-cases/orders/list-orders-admin.use-case.js';
import { UpdateOrderStatusAdmin } from '../../../application/use-cases/admin/update-order-status-admin.use-case.js';
import { JwtAuthGuard, type AuthenticatedRequest } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { AdminOrderListQueryDto, UpdateOrderStatusDto } from '../dto/orders.dto.js';
import { presentOrder, presentPage } from '../presenters/domain.presenter.js';

@ApiTags('admin-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    @Inject(ListOrdersAdmin) private readonly listOrders: ListOrdersAdmin,
    @Inject(UpdateOrderStatusAdmin) private readonly updateStatus: UpdateOrderStatusAdmin,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar órdenes para administración' })
  @ApiResponse({ status: 200, schema: { example: { items: [], page: 1, limit: 20, totalItems: 0, totalPages: 0 } } })
  @ApiResponse({ status: 401, description: 'JWT ausente o inválido' })
  @ApiResponse({ status: 403, description: 'Se requiere el rol ADMIN' })
  @ApiResponse({ status: 422, description: 'Filtro o paginación inválidos' })
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: AdminOrderListQueryDto,
  ) {
    const result = await this.listOrders.execute({
      token: request.accessToken!,
      filter: {
        status: query.status,
        ...(query.userId ? { userId: new UserId(query.userId) } : {}),
      },
      page: { page: query.page, limit: query.limit },
    });
    return presentPage(result, presentOrder);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar el estado de una orden' })
  @ApiResponse({ status: 200, schema: { example: { id: 'order_123', status: 'PROCESSING' } } })
  @ApiResponse({ status: 401, description: 'JWT ausente o inválido' })
  @ApiResponse({ status: 403, description: 'Se requiere el rol ADMIN' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({ status: 409, description: 'Transición inválida' })
  @ApiResponse({ status: 503, description: 'No se pudo completar la transición' })
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    const result = await this.updateStatus.execute({
      token: request.accessToken!,
      orderId,
      status: body.status,
    });
    return presentOrder(result.order);
  }
}
