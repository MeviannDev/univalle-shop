import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
        dbName: configService.getOrThrow<string>('MONGODB_DATABASE'),
        serverSelectionTimeoutMS: configService.get<number>(
          'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
          5000,
        ),
      }),
    }),
  ],
})
export class DatabaseModule {}
