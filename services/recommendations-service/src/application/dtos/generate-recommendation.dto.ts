import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class GenerateRecommendationDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(128)
  userId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Matches(/\S/, { each: true })
  @MaxLength(128, { each: true })
  productIds: string[];

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsObject()
  productCategories?: Record<string, string>;
}
