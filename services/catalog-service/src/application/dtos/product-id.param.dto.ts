import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class ProductIdParamDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^prod_/, { message: 'productId must start with "prod_"' })
  productId!: string;
}  