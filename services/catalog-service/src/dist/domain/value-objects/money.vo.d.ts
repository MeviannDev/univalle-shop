/**
 * Representa dinero en centavos de COP (enteros).
 * Ejemplo: $15.500 COP → 1550000
 */
export declare class Money {
    private readonly amountInCents;
    private constructor();
    static fromCents(cents: number): Money;
    static fromPesos(pesos: number): Money;
    getCents(): number;
    getPesos(): number;
    add(other: Money): Money;
    multiply(quantity: number): Money;
    equals(other: Money): boolean;
    toString(): string;
}
