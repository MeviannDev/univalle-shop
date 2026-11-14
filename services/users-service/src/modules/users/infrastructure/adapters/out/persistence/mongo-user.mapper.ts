import { AddressProps } from '../../../../domain/value-objects/address.js';
import { User, UserData } from '../../../../domain/entities/user.js';
import { RoleValue } from '../../../../domain/value-objects/role.js';
import { UserStatusValue } from '../../../../domain/value-objects/user-status.js';
import { VinculationTypeValue } from '../../../../domain/value-objects/vinculation-type.js';

export interface MongoUserDocument {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: RoleValue;
  vinculationType: VinculationTypeValue;
  status: UserStatusValue;
  addresses: AddressProps[];
  createdAt: Date;
  updatedAt: Date;
}

export function toMongoUser(user: User): MongoUserDocument {
  return user.toData();
}

export function toDomainUser(
  document: MongoUserDocument,
  institutionalDomain: string,
): User {
  const data: UserData = {
    ...document,
    createdAt: new Date(document.createdAt),
    updatedAt: new Date(document.updatedAt),
    addresses: document.addresses.map((address) => ({ ...address })),
  };
  return User.reconstitute(data, institutionalDomain);
}
