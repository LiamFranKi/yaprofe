import { getTransport } from './orderEmails.js';
import { ctaButton, linkFallback, paragraphPlain, wrapTransactionalEmail } from './mailLayout.js';
import { getPublicAppBaseUrl } from './publicUrl.js';

export async function sendVerificationEmail(to: string, verifyLink: string): Promise<boolean> {
  const transport = getTransport();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@localhost';
  if (!transport) {
    console.warn('[emailVerification] SMTP no configurado');
    return false;
  }

  const subject = 'Confirma tu correo — YaProFe';
  const text =
    `Hola,\n\n` +
    `Gracias por registrarte en YaProFe. Para activar tu cuenta, abre este enlace (válido 48 horas):\n\n` +
    `${verifyLink}\n\n` +
    `Si no creaste una cuenta, ignora este mensaje.\n\n` +
    `— YaProFe\n`;

  const inner =
    paragraphPlain('Gracias por unirte. Solo falta un paso: confirma que este correo es tuyo.') +
    paragraphPlain('Haz clic en el botón para activar tu cuenta. El enlace caduca en 48 horas.') +
    ctaButton(verifyLink, 'Confirmar mi correo') +
    paragraphPlain('Si el botón no funciona, copia y pega esta dirección en tu navegador:') +
    linkFallback(verifyLink);

  const html = wrapTransactionalEmail({
    title: 'Confirma tu correo',
    preheader: 'Activa tu cuenta en YaProFe con un clic.',
    innerHtml: inner,
  });

  try {
    await transport.sendMail({ from, to, subject, text, html });
    return true;
  } catch (e) {
    console.error('[emailVerification]', e);
    throw e;
  }
}

export function buildVerifyEmailLink(plainToken: string): string {
  const base = getPublicAppBaseUrl();
  return `${base}/?verify_token=${encodeURIComponent(plainToken)}`;
}
