import { describe, expect, it, vi } from 'vitest';
import { SmtpEmailSender } from './smtp-email.sender.js';

describe('SmtpEmailSender', () => {
  it('sends a verification link to the registered address', async () => {
    const sendMail = vi.fn(async () => undefined);
    const sender = new SmtpEmailSender(
      { sendMail },
      'Univalle <no-reply@example.test>',
    );

    await sender.sendVerificationEmail(
      'user@correounivalle.edu.co',
      'http://localhost:3002/auth/verify-email?token=sample-token',
    );

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Univalle <no-reply@example.test>',
        to: 'user@correounivalle.edu.co',
        subject: 'Verifica tu correo de Univalle Shop',
        text: expect.stringContaining(
          'http://localhost:3002/auth/verify-email?token=sample-token',
        ),
        html: expect.stringContaining(
          'href="http://localhost:3002/auth/verify-email?token=sample-token"',
        ),
      }),
    );
  });

  it('surfaces SMTP delivery failures', async () => {
    const sender = new SmtpEmailSender(
      {
        sendMail: async () => {
          throw new Error('SMTP unavailable');
        },
      },
      'Univalle <no-reply@example.test>',
    );

    await expect(
      sender.sendVerificationEmail(
        'user@correounivalle.edu.co',
        'http://localhost:3002/auth/verify-email?token=sample-token',
      ),
    ).rejects.toThrow('SMTP unavailable');
  });
});
