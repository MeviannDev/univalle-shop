import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: '665a1c42e249b316a38f0201' })
  id!: string;

  @ApiProperty({ example: 'Cuaderno' })
  name!: string;

  @ApiProperty({ example: 'Cuaderno universitario de 100 hojas' })
  description!: string;

  @ApiProperty({ example: 12000, minimum: 0 })
  price!: number;

  @ApiProperty({ example: 'Papelería' })
  category!: string;

  @ApiProperty({
    type: [String],
    example: ['https://example.com/cuaderno.jpg'],
  })
  images!: string[];

  @ApiProperty({ example: 25, minimum: 0 })
  stock!: number;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
