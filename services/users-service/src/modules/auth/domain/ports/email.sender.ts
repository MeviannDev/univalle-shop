export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailSender {
  sendVerificationEmail(email: string, verificationUrl: string): Promise<void>;
}
