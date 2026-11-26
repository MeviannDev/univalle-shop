export class PaymentNotFoundError extends Error {
  constructor() {
    super('No se encontró el pago solicitado.');
    this.name = PaymentNotFoundError.name;
  }
}

export class PaymentIdempotencyConflictError extends Error {
  constructor(message = 'La clave de idempotencia ya se usó con otros datos.') {
    super(message);
    this.name = PaymentIdempotencyConflictError.name;
  }
}

export class InvalidPaymentIdempotencyKeyError extends Error {
  constructor() {
    super('La clave de idempotencia debe tener entre 1 y 128 caracteres.');
    this.name = InvalidPaymentIdempotencyKeyError.name;
  }
}
