import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { MongoClient } from 'mongodb';

export const MONGO_CLIENT = Symbol('MONGO_CLIENT');
export const MONGO_DATABASE = Symbol('MONGO_DATABASE');

class MongoShutdown implements OnApplicationShutdown {
  constructor(private readonly client: MongoClient | null) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client?.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: MONGO_CLIENT,
      useFactory: async () => {
        if (process.env.NODE_ENV === 'test') return null;
        const uri =
          process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/univalle_users';
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
        await client.connect();
        return client;
      },
    },
    {
      provide: MONGO_DATABASE,
      inject: [MONGO_CLIENT],
      useFactory: (client: MongoClient | null) => {
        if (!client) return null;
        const databaseName = process.env.MONGODB_DATABASE;
        return databaseName ? client.db(databaseName) : client.db();
      },
    },
    {
      provide: MongoShutdown,
      inject: [MONGO_CLIENT],
      useFactory: (client: MongoClient | null) => new MongoShutdown(client),
    },
  ],
  exports: [MONGO_DATABASE],
})
export class MongoModule {}
