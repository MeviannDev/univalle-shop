import { EmailSender } from '../../../../domain/ports/email.sender.js';

interface VerificationEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface MailTransport {
  sendMail(message: VerificationEmail): Promise<unknown>;
}

export class SmtpEmailSender implements EmailSender {
  constructor(
    private readonly transporter: MailTransport,
    private readonly from: string,
  ) {}

  async sendVerificationEmail(
    email: string,
    verificationUrl: string,
  ): Promise<void> {
    const safeUrl = this.escapeHtml(verificationUrl);

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Verifica tu correo de Univalle Shop',
      text: `Para activar tu cuenta, abre este enlace: ${verificationUrl}\n\nEl enlace vence en 24 horas y solo se puede usar una vez.`,
      html: `<p>Para activar tu cuenta de Univalle Shop, haz clic en el siguiente enlace:</p><p><a href="${safeUrl}">Verificar correo</a></p><p>El enlace vence en 24 horas y solo se puede usar una vez.</p>`,
    });
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character] ?? character;
    });
  }
}
