/** URL pública del front (enlaces en correos: verificación, reset, pedidos). Sin barra final. */
export function getPublicAppBaseUrl(): string {
  const base = (process.env.APP_PUBLIC_URL || process.env.PUBLIC_ORIGIN || '').replace(/\/$/, '');
  return base || 'http://localhost:5173';
}
