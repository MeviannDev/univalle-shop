import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { RECOMMENDATION_EVENT_TYPE } from '../../domain/entities/recommendation-event.entity.js';

export class RecordRecommendationEventDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(128)
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(128)
  productId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(100)
  category: string;

  @IsEnum(RECOMMENDATION_EVENT_TYPE)
  type: (typeof RECOMMENDATION_EVENT_TYPE)[keyof typeof RECOMMENDATION_EVENT_TYPE];
}
