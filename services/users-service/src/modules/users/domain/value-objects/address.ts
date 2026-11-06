import { ValidationError } from '../exceptions/domain-error.js';

export interface AddressProps {
  id: string;
  street: string;
  city: string;
  department: string;
  phone: string;
  isDefault: boolean;
}

export class Address {
  readonly id: string;
  readonly street: string;
  readonly city: string;
  readonly department: string;
  readonly phone: string;
  readonly isDefault: boolean;

  private constructor(props: AddressProps) {
    this.id = props.id;
    this.street = props.street;
    this.city = props.city;
    this.department = props.department;
    this.phone = props.phone;
    this.isDefault = props.isDefault;
  }

  static create(props: AddressProps): Address {
    const id = props.id.trim();
    const phone = props.phone.trim();
    const requiredFields = [
      id,
      props.street,
      props.city,
      props.department,
      phone,
    ];
    if (requiredFields.some((field) => !field.trim())) {
      throw new ValidationError('Address fields cannot be empty');
    }
    if (!/^[+()\d\s-]{7,20}$/.test(phone)) {
      throw new ValidationError('Address phone number is invalid');
    }
    return new Address({
      ...props,
      id,
      street: props.street.trim(),
      city: props.city.trim(),
      department: props.department.trim(),
      phone,
    });
  }

  withDefault(isDefault: boolean): Address {
    return Address.create({ ...this.toData(), isDefault });
  }

  toData(): AddressProps {
    return {
      id: this.id,
      street: this.street,
      city: this.city,
      department: this.department,
      phone: this.phone,
      isDefault: this.isDefault,
    };
  }
}
