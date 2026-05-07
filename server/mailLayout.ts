/**
 * Plantilla HTML base para correos transaccionales (tablas + estilos inline compatibles con clientes comunes).
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapTransactionalEmail(opts: {
  title: string;
  /** Texto corto que algunos clientes muestran en vista previa */
  preheader: string;
  /** HTML del cuerpo (ya escapado donde corresponda) */
  innerHtml: string;
}): string {
  const title = escapeHtml(opts.title);
  const pre = escapeHtml(opts.preheader);
  const base = (process.env.APP_PUBLIC_URL || process.env.PUBLIC_ORIGIN || 'https://yaprofe.com').replace(/\/$/, '');
  const logoUrl = escapeHtml(`${base}/logoyaprofe.png`);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#eef4ff;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${pre}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef4ff;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbeafe;box-shadow:0 8px 24px rgba(59,130,246,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#06b6d4 100%);padding:22px 24px;text-align:center;">
              <img src="${logoUrl}" alt="YaProFe" height="40" style="display:block;margin:0 auto;max-width:220px;height:40px;width:auto;" />
              <div style="font-size:13px;color:rgba(255,255,255,0.9);margin-top:6px;">Marketplace educativo</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px 24px;">
              <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.3;color:#0f172a;">${title}</h1>
              ${opts.innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 16px 24px;font-size:12px;line-height:1.5;color:#64748b;">
              Si no esperabas este mensaje, puedes ignorarlo con tranquilidad.
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px 24px;text-align:center;">
              <img src="${logoUrl}" alt="YaProFe" height="28" style="display:inline-block;opacity:0.85;height:28px;width:auto;" />
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:11px;color:#94a3b8;">© YaProFe</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Botón CTA centrado; href debe ser URL segura (ya escapada para atributo). */
export function ctaButton(href: string, label: string): string {
  const h = href.replace(/"/g, '&quot;');
  const l = escapeHtml(label);
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px auto;">
    <tr>
      <td style="border-radius:12px;background:#2563eb;">
        <a href="${h}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${l}</a>
      </td>
    </tr>
  </table>`;
}

/** Párrafo de texto plano (escapado). */
export function paragraphPlain(text: string): string {
  return `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(text)}</p>`;
}

export function linkFallback(url: string): string {
  const safe = escapeHtml(url);
  return `<p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;">${safe}</p>`;
}
