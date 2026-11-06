import { Injectable, Logger } from '@nestjs/common';
import { EmailSender } from '../../../../domain/ports/email.sender.js';

@Injectable()
export class ConsoleEmailSender implements EmailSender {
  private readonly logger = new Logger(ConsoleEmailSender.name);

  async sendVerificationEmail(
    email: string,
    verificationUrl: string,
  ): Promise<void> {
    this.logger.log(`Verification link for ${email}: ${verificationUrl}`);
  }
}
