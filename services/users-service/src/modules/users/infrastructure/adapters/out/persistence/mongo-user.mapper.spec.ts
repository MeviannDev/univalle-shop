import { describe, expect, it } from 'vitest';
import { toDomainUser } from './mongo-user.mapper.js';
import { MongoUserDocument } from './mongo-user.mapper.js';

describe('Mongo user mapper', () => {
  it('defaults profile fields for existing documents without them', () => {
    const document: MongoUserDocument = {
      id: 'user-1',
      email: 'ada@correounivalle.edu.co',
      firstName: 'Ada',
      lastName: 'Lovelace',
      passwordHash: 'argon2-hash',
      role: 'CUSTOMER',
      vinculationType: 'ESTUDIANTE',
      status: 'ACTIVE',
      addresses: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const user = toDomainUser(document, 'correounivalle.edu.co');

    expect(user.primaryPhone).toBeNull();
    expect(user.marketingConsent).toBe(false);
    expect(user.marketingConsentUpdatedAt).toBeNull();
  });
});
