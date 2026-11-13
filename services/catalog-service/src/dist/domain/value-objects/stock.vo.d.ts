export declare class Stock {
    private readonly available;
    private readonly reserved;
    private constructor();
    static create(available: number, reserved?: number): Stock;
    getAvailable(): number;
    getReserved(): number;
    getTotal(): number;
    canReserve(quantity: number): boolean;
    reserve(quantity: number): Stock;
    release(quantity: number): Stock;
    commit(quantity: number): Stock;
    equals(other: Stock): boolean;
}
