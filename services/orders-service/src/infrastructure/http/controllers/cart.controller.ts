import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/jwt-auth.guard.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import {
  AddItemToCart,
  ClearCart,
  GetCart,
  RemoveItemFromCart,
  UpdateCartItemQuantity,
} from '../../../application/use-cases/cart/index.js';
import {
  AddCartItemDto,
  ChangeCartItemQuantityDto,
} from '../dto/cart.dto.js';
import { presentCart } from '../presenters/domain.presenter.js';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(
    @Inject(AddItemToCart) private readonly addItem: AddItemToCart,
    @Inject(RemoveItemFromCart) private readonly removeItem: RemoveItemFromCart,
    @Inject(UpdateCartItemQuantity) private readonly updateQuantity: UpdateCartItemQuantity,
    @Inject(ClearCart) private readonly clearCart: ClearCart,
    @Inject(GetCart) private readonly getCart: GetCart,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Consultar el carrito activo' })
  @ApiResponse({ status: 200, schema: { example: { id: 'cart_123', items: [], total: { amount: 0, currency: 'COP' } } } })
  @ApiResponse({ status: 401, description: 'JWT ausente o inválido' })
  async get(@Req() request: AuthenticatedRequest) {
    const result = await this.getCart.execute({ token: request.accessToken! });
    return presentCart(result.cart);
  }

  @Post('items')
  @ApiOperation({ summary: 'Agregar un producto al carrito' })
  @ApiResponse({ status: 201, schema: { example: { id: 'cart_123', items: [{ productId: 'demo-notebook', quantity: 2 }] } } })
  @ApiResponse({ status: 401, description: 'JWT ausente o inválido' })
  @ApiResponse({ status: 409, description: 'Producto no disponible' })
  @ApiResponse({ status: 422, description: 'Cuerpo o cantidad inválidos' })
  @ApiResponse({ status: 503, description: 'Catálogo o Usuarios no disponibles' })
  async add(
    @Req() request: AuthenticatedRequest,
    @Body() body: AddCartItemDto,
  ) {
    const result = await this.addItem.execute({
      token: request.accessToken!,
      productId: body.productId,
      quantity: body.quantity,
    });
    return presentCart(result.cart);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Cambiar la cantidad de un producto del carrito' })
  @ApiResponse({ status: 200, schema: { example: { id: 'cart_123', items: [{ productId: 'demo-notebook', quantity: 3 }] } } })
  @ApiResponse({ status: 401, description: 'JWT ausente o inválido' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado en el carrito' })
  @ApiResponse({ status: 422, description: 'Cuerpo o cantidad inválidos' })
  @ApiResponse({ status: 503, description: 'Catálogo o Usuarios no disponibles' })
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() body: ChangeCartItemQuantityDto,
  ) {
    const result = await this.updateQuantity.execute({
      token: request.accessToken!,
      productId,
      quantity: body.quantity,
    });
    return presentCart(result.cart);
  }

  @Delete('items/:productId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Quitar un producto del carrito' })
  @ApiResponse({ status: 204, description: 'Producto eliminado' })
  @ApiResponse({ status: 401, description: 'JWT ausente o inválido' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado en el carrito' })
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<void> {
    await this.removeItem.execute({
      token: request.accessToken!,
      productId,
    });
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Vaciar el carrito' })
  @ApiResponse({ status: 204, description: 'Carrito vacío' })
  @ApiResponse({ status: 401, description: 'JWT ausente o inválido' })
  async clear(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.clearCart.execute({ token: request.accessToken! });
  }
}
