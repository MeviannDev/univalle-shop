import { describe, expect, it } from 'vitest';
import { User } from './user.js';
import { Email } from '../value-objects/email.js';
import { Password } from '../value-objects/password.js';
import { Role } from '../value-objects/role.js';
import { VinculationType } from '../value-objects/vinculation-type.js';
import { Address } from '../value-objects/address.js';

function createPendingUser(id = 'user-1'): User {
  return User.register({
    id,
    email: Email.create(`${id}@correounivalle.edu.co`),
    firstName: 'Ada',
    lastName: 'Lovelace',
    passwordHash: 'argon2-hash',
    vinculationType: VinculationType.create('ESTUDIANTE'),
  });
}

function createAddress(id: string, isDefault = false): Address {
  return Address.create({
    id,
    street: 'Calle 1 # 2-3',
    city: 'Cali',
    department: 'Valle del Cauca',
    phone: '+57 300 1234567',
    isDefault,
  });
}

describe('User domain', () => {
  it('accepts only institutional email addresses', () => {
    expect(Email.create('ADA@correounivalle.edu.co').value).toBe(
      'ada@correounivalle.edu.co',
    );
    expect(() => Email.create('ada@gmail.com')).toThrow();
  });

  it('validates password complexity', () => {
    expect(() => Password.create('password')).toThrow();
    expect(Password.create('Univalle1!').value).toBe('Univalle1!');
  });

  it('defaults new accounts to customer and pending verification', () => {
    const user = createPendingUser();
    expect(user.role).toBe('CUSTOMER');
    expect(user.status).toBe('PENDING_VERIFICATION');
    expect(() => user.assertCanLogin()).toThrow('Invalid credentials');
    user.verifyEmail();
    expect(user.status).toBe('ACTIVE');
  });

  it('allows at most one default address and promotes another when deleting it', () => {
    const user = createPendingUser();
    user.addAddress(createAddress('address-1'));
    user.addAddress(createAddress('address-2', true));
    expect(
      user.addresses
        .filter((address) => address.isDefault)
        .map((address) => address.id),
    ).toEqual(['address-2']);

    user.removeAddress('address-2');
    expect(user.addresses).toHaveLength(1);
    expect(user.addresses[0]?.isDefault).toBe(true);
  });

  it('updates only provided address fields', () => {
    const user = createPendingUser();
    user.addAddress(createAddress('address-1', true));

    user.updateAddress('address-1', {
      street: 'Calle 14 # 100-00',
      city: undefined,
    });

    expect(user.addresses[0]).toEqual({
      id: 'address-1',
      street: 'Calle 14 # 100-00',
      city: 'Cali',
      department: 'Valle del Cauca',
      phone: '+57 300 1234567',
      isDefault: true,
    });
  });

  it('enforces the maximum of five addresses', () => {
    const user = createPendingUser();
    for (let index = 0; index < 5; index += 1) {
      user.addAddress(createAddress(`address-${index}`));
    }
    expect(() => user.addAddress(createAddress('address-over-limit'))).toThrow(
      'at most 5 addresses',
    );
  });

  it('rejects removing the current administrator role from oneself', () => {
    const user = createPendingUser();
    user.changeRole(Role.create('ADMIN'), 'another-admin');
    expect(() => user.changeRole(Role.create('CUSTOMER'), user.id)).toThrow();
  });
});
