export type DomainErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'USER_NOT_FOUND'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'USER_SUSPENDED'
  | 'INVALID_STATE_TRANSITION'
  | 'FORBIDDEN_OPERATION'
  | 'ADDRESS_NOT_FOUND';

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: DomainErrorCode,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'EMAIL_ALREADY_REGISTERED');
  }
}

export class NotFoundError extends DomainError {
  constructor(
    message: string,
    code: 'USER_NOT_FOUND' | 'ADDRESS_NOT_FOUND' = 'USER_NOT_FOUND',
  ) {
    super(message, code);
  }
}

export class AuthenticationError extends DomainError {
  constructor(
    message: string,
    code:
      | 'INVALID_CREDENTIALS'
      | 'EMAIL_NOT_VERIFIED'
      | 'USER_SUSPENDED' = 'INVALID_CREDENTIALS',
  ) {
    super(message, code);
  }
}

export class ForbiddenOperationError extends DomainError {
  constructor(message: string) {
    super(message, 'FORBIDDEN_OPERATION');
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_STATE_TRANSITION');
  }
}
