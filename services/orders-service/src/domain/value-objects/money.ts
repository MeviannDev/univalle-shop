import { InvalidMoneyError } from '../errors/invalid-money.error.js';

export class Money {
  public readonly amount: number;
  public readonly currency: string;

  constructor(amount: number, currency: string) {
    if (!Number.isSafeInteger(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency)) {
      throw new InvalidMoneyError();
    }
    this.amount = amount;
    this.currency = currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    const amount = this.amount + other.amount;
    if (!Number.isSafeInteger(amount)) {
      throw new InvalidMoneyError('El resultado supera el límite seguro de enteros');
    }
    return new Money(amount, this.currency);
  }

  multiply(quantity: number): Money {
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new InvalidMoneyError('El multiplicador debe ser un entero no negativo');
    }
    const amount = this.amount * quantity;
    if (!Number.isSafeInteger(amount)) {
      throw new InvalidMoneyError('El resultado supera el límite seguro de enteros');
    }
    return new Money(amount, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount === other.amount;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new InvalidMoneyError('No se pueden operar monedas distintas');
    }
  }
}
