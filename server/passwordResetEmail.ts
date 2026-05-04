import { getTransport } from './orderEmails.js';

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

  const html = `
    <p>Hola,</p>
    <p>Para crear una <strong>nueva contraseña</strong> en YaProFe, pulsa el botón o copia el enlace (válido <strong>1 hora</strong>):</p>
    <p><a href="${resetLink.replace(/"/g, '&quot;')}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Restablecer contraseña</a></p>
    <p style="word-break:break-all;font-size:12px;color:#64748b;">${resetLink.replace(/</g, '&lt;')}</p>
    <p>Si no solicitaste este cambio, ignora este mensaje.</p>
    <p>— YaProFe</p>
  `;

  try {
    await transport.sendMail({ from, to, subject, text, html });
    return true;
  } catch (e) {
    console.error('[passwordResetEmail]', e);
    throw e;
  }
}
