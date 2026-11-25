import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IndexProductRequestDto {
  @ApiProperty({ example: 'Cuaderno universitario' })
  name!: string;

  @ApiProperty({ example: 'Cuaderno de 100 hojas para uso académico.' })
  description!: string;

  @ApiProperty({ example: 'Papelería' })
  category!: string;

  @ApiProperty({ example: 12000, minimum: 0 })
  price!: number;

  @ApiPropertyOptional({ example: 'https://example.com/cuaderno.jpg' })
  imageUrl?: string;

  @ApiProperty({ example: true })
  isActive!: boolean;
}
