import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case.js';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case.js';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case.js';
import { DeleteProductUseCase } from '../../application/use-cases/delete-product.use-case.js';
import { GetProductUseCase } from '../../application/use-cases/get-product.use-case.js';
import { CreateProductDto } from '../../application/dtos/create-product.dto.js';
import { UpdateProductDto } from '../../application/dtos/update-product.dto.js';
import { ListProductsDto } from '../../application/dtos/list-products.dto.js';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
    private readonly getProduct: GetProductUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto) {
    return this.createProduct.execute(dto);
  }

  @Get()
  async list(@Query() query: ListProductsDto) {
    return this.listProducts.execute(query);
  }

  @Get(':productId')
  async findOne(@Param('productId') productId: string) {
    return this.getProduct.execute(productId);
  }

  @Put(':productId')
  async update(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.updateProduct.execute(productId, dto);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('productId') productId: string) {
    await this.deleteProduct.execute(productId);
  }
}