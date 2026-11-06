import { ValidationError } from '../exceptions/domain-error.js';

export type VinculationTypeValue = 'ESTUDIANTE' | 'DOCENTE' | 'ADMINISTRATIVO';

export class VinculationType {
  private constructor(readonly value: VinculationTypeValue) {}

  static create(value: string): VinculationType {
    if (!['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'].includes(value)) {
      throw new ValidationError(
        'Vinculation type must be ESTUDIANTE, DOCENTE, or ADMINISTRATIVO',
      );
    }
    return new VinculationType(value as VinculationTypeValue);
  }
}
