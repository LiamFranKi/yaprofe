import { getTransport } from './orderEmails.js';
import { ctaButton, linkFallback, paragraphPlain, wrapTransactionalEmail } from './mailLayout.js';
import { getPublicAppBaseUrl } from './publicUrl.js';

/**
 * Envía el enlace para restablecer contraseña. Requiere SMTP_* y MAIL_FROM en .env.
 * @returns true si se envió, false si no hay transporte configurado.
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
  const transport = getTransport();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@localhost';
  if (!transport) {
    console.warn('[passwordResetEmail] SMTP_HOST no definido; no se envía correo de recuperación');
    return false;
  }

  const subject = 'Restablecer contraseña — YaProFe';
  const text =
    `Hola,\n\n` +
    `Para crear una nueva contraseña en YaProFe, abre este enlace (válido 1 hora):\n\n` +
    `${resetLink}\n\n` +
    `Si no solicitaste este cambio, ignora este mensaje.\n\n` +
    `— YaProFe\n`;

  const inner =
    paragraphPlain('Recibimos una solicitud para restablecer la contraseña de tu cuenta en YaProFe.') +
    paragraphPlain('El enlace caduca en 1 hora por seguridad.') +
    ctaButton(resetLink, 'Crear nueva contraseña') +
    paragraphPlain('Si el botón no funciona, copia esta URL en tu navegador:') +
    linkFallback(resetLink);

  const html = wrapTransactionalEmail({
    title: 'Restablecer contraseña',
    preheader: 'Enlace seguro para crear una nueva contraseña en YaProFe.',
    innerHtml: inner,
  });

  try {
    await transport.sendMail({ from, to, subject, text, html });
    return true;
  } catch (e) {
    console.error('[passwordResetEmail]', e);
    throw e;
  }
}

export function buildPasswordResetLink(plainToken: string): string {
  const base = getPublicAppBaseUrl();
  return `${base}/?reset_token=${encodeURIComponent(plainToken)}`;
}
