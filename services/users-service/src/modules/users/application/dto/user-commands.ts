import { AddressProps } from '../../domain/value-objects/address.js';
import { RoleValue } from '../../domain/value-objects/role.js';
import { VinculationTypeValue } from '../../domain/value-objects/vinculation-type.js';

export interface RegisterUserCommand {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  vinculationType: VinculationTypeValue;
}

export interface UpdateProfileCommand {
  firstName?: string;
  lastName?: string;
  vinculationType?: VinculationTypeValue;
}

export type AddAddressCommand = Omit<AddressProps, 'id' | 'isDefault'> & {
  isDefault?: boolean;
};
export type UpdateAddressCommand = Partial<Omit<AddressProps, 'id'>>;
export type ChangeRoleCommand = {
  userId: string;
  actorId: string;
  actorRole: RoleValue;
  role: RoleValue;
};
