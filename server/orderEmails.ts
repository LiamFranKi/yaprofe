import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { RowDataPacket } from 'mysql2';
import { pool } from './db.js';

let cached: Transporter | null | undefined;

export function getTransport(): Transporter | null {
  if (cached !== undefined) return cached;
  const host = process.env.SMTP_HOST;
  if (!host) {
    cached = null;
    return null;
  }
  cached = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return cached;
}

/** Correos al comprador, vendedores y admins cuando un pedido queda en estado `paid`. Requiere SMTP en .env. */
export async function sendOrderPaidEmails(orderId: number): Promise<void> {
  const transport = getTransport();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@localhost';
  if (!transport) {
    console.log('[orderEmails] SMTP_HOST no definido; omitiendo correos para pedido', orderId);
    return;
  }

  const [ords] = await pool.execute<RowDataPacket[]>(
    `SELECT o.id, o.total_cents, o.buyer_id, u.email AS buyer_email, bp.display_name AS buyer_name
     FROM orders o
     JOIN users u ON u.id = o.buyer_id
     JOIN profiles bp ON bp.id = o.buyer_id
     WHERE o.id = ? AND o.status = 'paid'`,
    [orderId]
  );
  const order = ords[0];
  if (!order) return;

  const [items] = await pool.execute<RowDataPacket[]>(
    `SELECT oi.product_id, oi.seller_id, oi.unit_price_cents, oi.seller_revenue_cents, p.title AS product_title
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );
  if (items.length === 0) return;

  const totalSol = (Number(order.total_cents) / 100).toFixed(2);
  const baseUrl = (process.env.PUBLIC_ORIGIN || process.env.APP_PUBLIC_URL || '').replace(/\/$/, '') || 'http://localhost:5173';

  const itemLines = items.map(
    (it) => `- ${it.product_title} (S/ ${(Number(it.unit_price_cents) / 100).toFixed(2)})`
  );

  const downloadLinks = items
    .map((it) => {
      const pid = Number(it.product_id);
      const link = `${baseUrl}/?product=${pid}`;
      return `- ${it.product_title}\n  ${link}`;
    })
    .join('\n');

  const buyerBody =
    `Hola ${order.buyer_name || ''},\n\n` +
    `Tu pago fue confirmado. Ya puedes descargar tus recursos.\n\n` +
    `Pedido #${orderId}\n` +
    `Total: S/ ${totalSol}\n\n` +
    `Productos y enlaces directos (inicia sesión en YaProFe):\n${downloadLinks}\n\n` +
    `En cada ficha verás la sección "Tus archivos" con los enlaces de descarga.\n` +
    `También puedes revisar "Mis compras" en tu cuenta.\n\n` +
    `— YaProFe\n`;

  try {
    await transport.sendMail({
      from,
      to: order.buyer_email as string,
      subject: `[YaProFe] Compra confirmada — pedido #${orderId}`,
      text: buyerBody,
    });
  } catch (e) {
    console.error('[orderEmails] comprador', e);
  }

  const sellerIds = [...new Set(items.map((it) => String(it.seller_id)))];
  for (const sid of sellerIds) {
    const sellerItems = items.filter((it) => String(it.seller_id) === sid);
    const [srows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.email, pr.display_name FROM profiles pr JOIN users u ON u.id = pr.id WHERE pr.id = ?`,
      [sid]
    );
    const se = srows[0];
    if (!se?.email) continue;
    const rev = sellerItems.reduce((s, it) => s + Number(it.seller_revenue_cents), 0);
    const sellerBody =
      `Hola ${se.display_name || ''},\n\n` +
      `Tienes una venta confirmada en YaProFe.\n\n` +
      `Pedido #${orderId}\n` +
      `Tu ingreso (tras comisión de plataforma): S/ ${(rev / 100).toFixed(2)}\n\n` +
      `Detalle:\n` +
      sellerItems.map((it) => `- ${it.product_title}`).join('\n') +
      `\n\n— YaProFe\n`;
    try {
      await transport.sendMail({
        from,
        to: se.email as string,
        subject: `[YaProFe] Nueva venta — pedido #${orderId}`,
        text: sellerBody,
      });
    } catch (e) {
      console.error('[orderEmails] vendedor', sid, e);
    }
  }

  const [admins] = await pool.execute<RowDataPacket[]>(
    `SELECT u.email FROM profiles p JOIN users u ON u.id = p.id WHERE p.role = 'admin' AND COALESCE(p.is_active,1) = 1`
  );
  const adminEmails = admins.map((a) => a.email as string).filter(Boolean);
  if (adminEmails.length > 0) {
    const adminBody =
      `Pedido #${orderId} marcado como PAGADO.\n\n` +
      `Comprador: ${order.buyer_email}\n` +
      `Total: S/ ${totalSol}\n\n` +
      `Ítems:\n${itemLines.join('\n')}\n`;
    try {
      await transport.sendMail({
        from,
        to: adminEmails[0],
        bcc: adminEmails.length > 1 ? adminEmails.slice(1) : undefined,
        subject: `[YaProFe Admin] Venta confirmada #${orderId}`,
        text: adminBody,
      });
    } catch (e) {
      console.error('[orderEmails] admins', e);
    }
  }
}
