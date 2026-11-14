import { Injectable, OnModuleInit } from '@nestjs/common';
import { MongoClient, type Collection } from 'mongodb';
import { Payment } from '../../../domain/entities/payment.entity.js';
import { type PaymentRepositoryPort } from '../../../domain/ports/payment.repository.js';

@Injectable()
export class MongoPaymentRepository implements PaymentRepositoryPort, OnModuleInit {
  private client: MongoClient;
  private collection: Collection<Payment>;

  async onModuleInit() {
    const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27019/univalle_payments';
    this.client = new MongoClient(mongoUri);
    await this.client.connect();
    this.collection = this.client.db().collection<Payment>('payments');
  }

  async save(payment: Payment): Promise<Payment> {
    await this.collection.insertOne(payment);
    return payment;
  }

  async findById(id: string): Promise<Payment | null> {
    return this.collection.findOne({ id });
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return this.collection.findOne({ orderId });
  }

  async findByUserId(userId: string): Promise<Payment[]> {
    return this.collection.find({ userId }).toArray();
  }

  async update(payment: Payment): Promise<Payment> {
    await this.collection.updateOne({ id: payment.id }, { $set: payment });
    return payment;
  }
}
