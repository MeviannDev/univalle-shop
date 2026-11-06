import { Address, AddressProps } from '../value-objects/address.js';
import { Email } from '../value-objects/email.js';
import { Role, RoleValue } from '../value-objects/role.js';
import { UserStatus, UserStatusValue } from '../value-objects/user-status.js';
import {
  VinculationType,
  VinculationTypeValue,
} from '../value-objects/vinculation-type.js';
import {
  AuthenticationError,
  ForbiddenOperationError,
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
} from '../exceptions/domain-error.js';

export const MAX_USER_ADDRESSES = 5;

export interface UserData {
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

export interface NewUserProps {
  id: string;
  email: Email;
  firstName: string;
  lastName: string;
  passwordHash: string;
  vinculationType: VinculationType;
  now?: Date;
}

export class User {
  private constructor(private data: UserData) {
    this.assertAddressInvariant();
  }

  static register(props: NewUserProps): User {
    const firstName = props.firstName.trim();
    const lastName = props.lastName.trim();
    if (!firstName || !lastName || !props.passwordHash) {
      throw new ValidationError(
        'First name, last name, and password hash are required',
      );
    }
    const now = props.now ?? new Date();
    return new User({
      id: props.id,
      email: props.email.value,
      firstName,
      lastName,
      passwordHash: props.passwordHash,
      role: Role.customer().value,
      vinculationType: props.vinculationType.value,
      status: UserStatus.pendingVerification().value,
      addresses: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(
    data: UserData,
    institutionalDomain = 'correounivalle.edu.co',
  ): User {
    return new User({
      ...data,
      email: Email.create(data.email, institutionalDomain).value,
      role: Role.create(data.role).value,
      vinculationType: VinculationType.create(data.vinculationType).value,
      status: UserStatus.create(data.status).value,
      addresses: data.addresses.map((address) =>
        Address.create(address).toData(),
      ),
    });
  }

  get id(): string {
    return this.data.id;
  }
  get email(): string {
    return this.data.email;
  }
  get firstName(): string {
    return this.data.firstName;
  }
  get lastName(): string {
    return this.data.lastName;
  }
  get passwordHash(): string {
    return this.data.passwordHash;
  }
  get role(): RoleValue {
    return this.data.role;
  }
  get vinculationType(): VinculationTypeValue {
    return this.data.vinculationType;
  }
  get status(): UserStatusValue {
    return this.data.status;
  }
  get addresses(): AddressProps[] {
    return this.data.addresses.map((address) => ({ ...address }));
  }
  get createdAt(): Date {
    return new Date(this.data.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.data.updatedAt);
  }

  verifyEmail(now = new Date()): void {
    if (this.data.status !== 'PENDING_VERIFICATION') {
      throw new InvalidStateTransitionError(
        'Only users awaiting verification can verify their email',
      );
    }
    this.data.status = 'ACTIVE';
    this.touch(now);
  }

  assertCanLogin(): void {
    if (this.data.status !== 'ACTIVE')
      throw new AuthenticationError('Invalid credentials');
  }

  updateProfile(
    changes: {
      firstName?: string;
      lastName?: string;
      vinculationType?: VinculationType;
    },
    now = new Date(),
  ): void {
    if (changes.firstName !== undefined) {
      if (!changes.firstName.trim())
        throw new ValidationError('First name cannot be empty');
      this.data.firstName = changes.firstName.trim();
    }
    if (changes.lastName !== undefined) {
      if (!changes.lastName.trim())
        throw new ValidationError('Last name cannot be empty');
      this.data.lastName = changes.lastName.trim();
    }
    if (changes.vinculationType)
      this.data.vinculationType = changes.vinculationType.value;
    this.touch(now);
  }

  changePassword(passwordHash: string, now = new Date()): void {
    if (!passwordHash) throw new ValidationError('Password hash is required');
    this.data.passwordHash = passwordHash;
    this.touch(now);
  }

  addAddress(address: Address, now = new Date()): void {
    if (this.data.addresses.length >= MAX_USER_ADDRESSES) {
      throw new ValidationError(
        `A user can have at most ${MAX_USER_ADDRESSES} addresses`,
      );
    }
    if (this.data.addresses.some((item) => item.id === address.id)) {
      throw new ValidationError('Address identifier already exists');
    }
    const makeDefault = this.data.addresses.length === 0 || address.isDefault;
    this.data.addresses = [
      ...this.data.addresses.map((item) =>
        Address.create(item)
          .withDefault(makeDefault ? false : item.isDefault)
          .toData(),
      ),
      address.withDefault(makeDefault).toData(),
    ];
    this.touch(now);
  }

  updateAddress(
    id: string,
    changes: Partial<Omit<AddressProps, 'id'>>,
    now = new Date(),
  ): void {
    const index = this.data.addresses.findIndex((address) => address.id === id);
    if (index < 0)
      throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');
    const current = this.data.addresses[index];
    if (!current)
      throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');
    const updated = Address.create({ ...current, ...changes, id });
    this.data.addresses[index] = updated.toData();
    if (updated.isDefault) {
      this.makeOnlyAddressDefault(id);
    } else if (current.isDefault) {
      const replacement = this.data.addresses.find(
        (address) => address.id !== id,
      );
      this.makeOnlyAddressDefault(replacement?.id ?? id);
    }
    this.touch(now);
  }

  removeAddress(id: string, now = new Date()): void {
    const existing = this.data.addresses.find((address) => address.id === id);
    if (!existing)
      throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');
    this.data.addresses = this.data.addresses.filter(
      (address) => address.id !== id,
    );
    if (existing.isDefault && this.data.addresses.length > 0) {
      const nextAddress = this.data.addresses[0];
      if (nextAddress) this.makeOnlyAddressDefault(nextAddress.id);
    }
    this.touch(now);
  }

  setDefaultAddress(id: string, now = new Date()): void {
    if (!this.data.addresses.some((address) => address.id === id)) {
      throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');
    }
    this.makeOnlyAddressDefault(id);
    this.touch(now);
  }

  suspend(now = new Date()): void {
    if (this.data.status !== 'ACTIVE') {
      throw new InvalidStateTransitionError(
        'Only active users can be suspended',
      );
    }
    this.data.status = 'SUSPENDED';
    this.touch(now);
  }

  activate(now = new Date()): void {
    if (this.data.status !== 'SUSPENDED') {
      throw new InvalidStateTransitionError(
        'Only suspended users can be activated',
      );
    }
    this.data.status = 'ACTIVE';
    this.touch(now);
  }

  changeRole(role: Role, actorId: string, now = new Date()): void {
    if (actorId === this.data.id && role.value !== 'ADMIN') {
      throw new ForbiddenOperationError(
        'An administrator cannot remove their own administrator role',
      );
    }
    this.data.role = role.value;
    this.touch(now);
  }

  suspendBy(actorId: string, now = new Date()): void {
    if (actorId === this.data.id)
      throw new ForbiddenOperationError(
        'An administrator cannot suspend themselves',
      );
    this.suspend(now);
  }

  toData(): UserData {
    return {
      ...this.data,
      addresses: this.data.addresses.map((address) => ({ ...address })),
      createdAt: new Date(this.data.createdAt),
      updatedAt: new Date(this.data.updatedAt),
    };
  }

  toProfile(): Omit<UserData, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...profile } = this.toData();
    return profile;
  }

  private makeOnlyAddressDefault(id: string): void {
    this.data.addresses = this.data.addresses.map((address) =>
      Address.create(address)
        .withDefault(address.id === id)
        .toData(),
    );
  }

  private assertAddressInvariant(): void {
    if (this.data.addresses.length > MAX_USER_ADDRESSES) {
      throw new ValidationError(
        `A user can have at most ${MAX_USER_ADDRESSES} addresses`,
      );
    }
    const defaults = this.data.addresses.filter((address) => address.isDefault);
    if (
      defaults.length > 1 ||
      (this.data.addresses.length > 0 && defaults.length !== 1)
    ) {
      throw new ValidationError(
        'A user must have exactly one default address when addresses exist',
      );
    }
  }

  private touch(now: Date): void {
    this.data.updatedAt = now;
  }
}
