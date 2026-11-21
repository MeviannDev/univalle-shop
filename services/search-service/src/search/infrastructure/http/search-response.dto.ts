import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchProductResponseDto {
  @ApiProperty({ example: 'product-123' })
  productId!: string;

  @ApiProperty({ example: 'Cuaderno universitario' })
  name!: string;

  @ApiProperty({ example: 'Cuaderno de 100 hojas para uso académico.' })
  description!: string;

  @ApiProperty({ example: 'Papelería' })
  category!: string;

  @ApiProperty({ example: 12000 })
  price!: number;

  @ApiPropertyOptional({ example: 'https://example.com/cuaderno.jpg' })
  imageUrl?: string;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

export class SearchProductsResponseDto {
  @ApiProperty({ type: [SearchProductResponseDto] })
  items!: SearchProductResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
