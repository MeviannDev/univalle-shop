import { RoleValue } from '../../../users/domain/value-objects/role.js';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: RoleValue;
}

export interface VerificationTokenClaims {
  sub: string;
  email: string;
  purpose: 'email-verification';
}

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenService {
  issueAccessToken(claims: AccessTokenClaims): Promise<string>;
  issueVerificationToken(claims: VerificationTokenClaims): Promise<string>;
  verifyAccessToken(token: string): Promise<AccessTokenClaims>;
  verifyVerificationToken(token: string): Promise<VerificationTokenClaims>;
}
