/**
 * Representa dinero en centavos de COP (enteros).
 * Ejemplo: $15.500 COP → 1550000
 */
export class Money {
    amountInCents;
    constructor(amountInCents) {
        this.amountInCents = amountInCents;
        if (!Number.isInteger(amountInCents) || amountInCents < 0) {
            throw new Error('Money amount must be a non-negative integer (cents)');
        }
    }
    static fromCents(cents) {
        return new Money(cents);
    }
    static fromPesos(pesos) {
        const cents = Math.round(pesos * 100);
        return new Money(cents);
    }
    getCents() {
        return this.amountInCents;
    }
    getPesos() {
        return this.amountInCents / 100;
    }
    add(other) {
        return new Money(this.amountInCents + other.amountInCents);
    }
    multiply(quantity) {
        return new Money(this.amountInCents * quantity);
    }
    equals(other) {
        return this.amountInCents === other.amountInCents;
    }
    toString() {
        return `$${this.getPesos().toLocaleString('es-CO')} COP`;
    }
}
//# sourceMappingURL=money.vo.js.map