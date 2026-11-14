import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case.js';
import { DeleteProductUseCase } from '../../application/use-cases/delete-product.use-case.js';
import { GetProductUseCase } from '../../application/use-cases/get-product.use-case.js';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case.js';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case.js';
import {
  CreateProductDto,
  UpdateProductDto,
} from './dto/create-product.dto.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { ProductExceptionFilter } from './filters/product-exception.filter.js';
import { ParseProductIdPipe } from './pipes/parse-product-id.pipe.js';

@Controller('products')
@UseFilters(ProductExceptionFilter)
@ApiTags('Productos')
export class ProductsController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
    private readonly getProduct: GetProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear producto' })
  @ApiBody({
    type: CreateProductDto,
    examples: {
      cuaderno: {
        summary: 'Producto de papelería',
        value: {
          name: 'Cuaderno universitario',
          description: 'Cuaderno de 100 hojas para uso académico.',
          price: 12000,
          category: 'Papelería',
          images: ['https://example.com/cuaderno.jpg'],
          stock: 25,
          active: true,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Producto creado.',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Los datos enviados no son válidos.' })
  create(@Body() data: CreateProductDto) {
    return this.createProduct.execute(data);
  }

  @Get()
  @ApiOperation({ summary: 'Listar productos' })
  @ApiOkResponse({
    description: 'Lista de productos.',
    type: ProductResponseDto,
    isArray: true,
  })
  findAll() {
    return this.listProducts.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar producto por ID' })
  @ApiParam({
    name: 'id',
    description: 'ObjectId de MongoDB de 24 caracteres hexadecimales.',
    example: '665a1c42e249b316a38f0201',
  })
  @ApiOkResponse({
    description: 'Producto encontrado.',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({ description: 'El ID no es válido.' })
  @ApiNotFoundResponse({ description: 'No existe un producto con ese ID.' })
  findOne(@Param('id', ParseProductIdPipe) id: string) {
    return this.getProduct.execute(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar parcialmente un producto' })
  @ApiParam({
    name: 'id',
    description: 'ObjectId de MongoDB de 24 caracteres hexadecimales.',
    example: '665a1c42e249b316a38f0201',
  })
  @ApiBody({
    type: UpdateProductDto,
    examples: {
      actualizarPrecioEInventario: {
        summary: 'Actualizar precio e inventario',
        value: {
          price: 13500,
          stock: 20,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Producto actualizado.',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El ID o los datos enviados no son válidos.',
  })
  @ApiNotFoundResponse({ description: 'No existe un producto con ese ID.' })
  update(
    @Param('id', ParseProductIdPipe) id: string,
    @Body() data: UpdateProductDto,
  ) {
    return this.updateProduct.execute(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar producto' })
  @ApiParam({
    name: 'id',
    description: 'ObjectId de MongoDB de 24 caracteres hexadecimales.',
    example: '665a1c42e249b316a38f0201',
  })
  @ApiNoContentResponse({ description: 'Producto eliminado.' })
  @ApiBadRequestResponse({ description: 'El ID no es válido.' })
  @ApiNotFoundResponse({ description: 'No existe un producto con ese ID.' })
  delete(@Param('id', ParseProductIdPipe) id: string) {
    return this.deleteProduct.execute(id);
  }
}
