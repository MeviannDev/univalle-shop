import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class GenerateRecommendationDto {
  @IsString()
  userId: string;

  @IsArray()
  @IsString({ each: true })
  productIds: string[];

  @IsString()
  @IsNotEmpty()
  category: string;
}
