/**
 * Representa dinero en centavos de COP (enteros).
 * Ejemplo: $15.500 COP → 1550000
 */
export class Money {
  private constructor(private readonly amountInCents: number) {
    if (!Number.isInteger(amountInCents) || amountInCents < 0) {
      throw new Error('Money amount must be a non-negative integer (cents)');
    }
  }

  static fromCents(cents: number): Money {
    return new Money(cents);
  }

  static fromPesos(pesos: number): Money {
    const cents = Math.round(pesos * 100);
    return new Money(cents);
  }

  getCents(): number {
    return this.amountInCents;
  }

  getPesos(): number {
    return this.amountInCents / 100;
  }

  add(other: Money): Money {
    return new Money(this.amountInCents + other.amountInCents);
  }

  multiply(quantity: number): Money {
    return new Money(this.amountInCents * quantity);
  }

  equals(other: Money): boolean {
    return this.amountInCents === other.amountInCents;
  }

  toString(): string {
    return `$${this.getPesos().toLocaleString('es-CO')} COP`;
  }
}