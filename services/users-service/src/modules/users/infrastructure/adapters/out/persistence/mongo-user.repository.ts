import { Collection, Db, MongoServerError } from 'mongodb';
import { ConflictError } from '../../../../domain/exceptions/domain-error.js';
import { User } from '../../../../domain/entities/user.js';
import { UserRepository } from '../../../../domain/ports/user.repository.js';
import {
  MongoUserDocument,
  toDomainUser,
  toMongoUser,
} from './mongo-user.mapper.js';

export class MongoUserRepository implements UserRepository {
  private readonly collection: Collection<MongoUserDocument>;

  constructor(
    database: Db,
    private readonly institutionalDomain = 'correounivalle.edu.co',
  ) {
    this.collection = database.collection<MongoUserDocument>('users');
  }

  async save(user: User): Promise<void> {
    try {
      await this.collection.updateOne(
        { id: user.id },
        { $set: toMongoUser(user) },
        { upsert: true },
      );
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictError('Email is already registered');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const document = await this.collection.findOne({ id });
    return document ? toDomainUser(document, this.institutionalDomain) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const document = await this.collection.findOne({ email });
    return document ? toDomainUser(document, this.institutionalDomain) : null;
  }

  async findAll(): Promise<User[]> {
    const documents = await this.collection
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    return documents.map((document) =>
      toDomainUser(document, this.institutionalDomain),
    );
  }
}
