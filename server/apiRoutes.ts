import type { Express, Response, NextFunction } from 'express';
import type { PoolConnection } from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { createHash, randomBytes } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool } from './db.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  newId,
  requireAuth,
  tryGetUserIdFromAuthHeader,
  type AuthedRequest,
} from './auth.js';
import { sanitizeProductDescription } from './sanitizeHtml.js';
import { sendOrderPaidEmails, getTransport } from './orderEmails.js';
import { sendPasswordResetEmail, buildPasswordResetLink } from './passwordResetEmail.js';
import { sendVerificationEmail, buildVerifyEmailLink } from './emailVerification.js';

const uploadRoot = path.join(process.cwd(), 'uploads');

function hashPasswordResetToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

function ensureUploadDirs() {
  for (const b of ['avatars', 'banners', 'product-covers', 'product-files', 'payment-proofs']) {
    fs.mkdirSync(path.join(uploadRoot, b), { recursive: true });
  }
}

/** Convierte fila `profiles` a JSON seguro (BigInt, Dates, etc.). */
function profileRowToJson(row: RowDataPacket): Record<string, unknown> {
  const r = row as Record<string, unknown>;
  const iso = (v: unknown) => (v instanceof Date && !Number.isNaN(v.getTime()) ? v.toISOString() : undefined);
  return {
    id: String(r.id ?? ''),
    display_name: r.display_name != null ? String(r.display_name) : '',
    avatar_url: r.avatar_url ?? null,
    banner_url: r.banner_url ?? null,
    bio: r.bio ?? null,
    role: r.role,
    locale: r.locale ?? 'es',
    theme_pref: r.theme_pref ?? 'system',
    seller_handle: r.seller_handle ?? null,
    commission_rate: r.commission_rate == null ? null : Number(r.commission_rate),
    is_verified: Boolean(Number(r.is_verified)),
    is_active: Number(r.is_active ?? 1),
    total_sales: Number(r.total_sales ?? 0),
    total_revenue_cents: Number(r.total_revenue_cents ?? 0),
    created_at: iso(r.created_at) ?? String(r.created_at ?? ''),
    updated_at: iso(r.updated_at) ?? (r.updated_at != null ? String(r.updated_at) : undefined),
  };
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const q = req.query as { bucket?: string };
      const bucket = q.bucket || 'product-covers';
      const userId = (req as AuthedRequest).userId || 'anon';
      const dir = path.join(uploadRoot, bucket, userId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.bin';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 52 * 1024 * 1024 },
});

/** URL pública del archivo bajo /uploads (relativa al mismo origen del front en dev). */
function uploadPublicPath(reqFilePath: string): string {
  const rel = path.relative(uploadRoot, reqFilePath).replace(/\\/g, '/');
  return `/uploads/${rel}`;
}

async function getProfileRole(userId: string): Promise<string | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT role FROM profiles WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0]?.role ?? null;
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  getProfileRole(req.userId!)
    .then((role) => {
      if (role !== 'admin') {
        res.status(403).json({ error: 'Solo administradores' });
        return;
      }
      next();
    })
    .catch(() => res.status(500).json({ error: 'Error' }));
}

function parseTags(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw) as unknown;
      return Array.isArray(j) ? (j as string[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapProduct(p: RowDataPacket, seller: RowDataPacket | null, cat: RowDataPacket | null) {
  return {
    id: p.id,
    seller_id: p.seller_id,
    category_id: p.category_id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    short_description: p.short_description,
    product_type: p.product_type,
    price_cents: p.price_cents,
    original_price_cents: p.original_price_cents,
    currency: p.currency,
    cover_url: p.cover_url,
    preview_url: p.preview_url,
    status: p.status,
    rejection_reason: p.rejection_reason,
    tags: parseTags(p.tags),
    download_count: p.download_count,
    view_count: p.view_count,
    rating_avg: Number(p.rating_avg),
    rating_count: p.rating_count,
    featured: Boolean(p.featured),
    created_at: toIso(p.created_at),
    updated_at: toIso(p.updated_at),
    profiles: seller
      ? {
          id: seller.id,
          display_name: seller.display_name,
          avatar_url: seller.avatar_url,
          is_verified: Boolean(seller.is_verified),
          seller_handle: seller.seller_handle,
          ...((seller as { role?: string }).role
            ? { role: (seller as { role: string }).role }
            : {}),
          ...(seller.commission_rate != null
            ? { commission_rate: Number(seller.commission_rate) }
            : {}),
        }
      : undefined,
    categories: cat
      ? {
          id: cat.id,
          parent_id: cat.parent_id,
          slug: cat.slug,
          name_es: cat.name_es,
          name_en: cat.name_en,
          icon: cat.icon,
          sort_order: cat.sort_order,
        }
      : undefined,
  };
}

function toIso(d: unknown): string {
  if (!d) return new Date().toISOString();
  if (d instanceof Date) return d.toISOString();
  return new Date(d as string).toISOString();
}

/** Nombres y tamaños de archivos incluidos (sin URL de descarga) para la ficha pública. */
async function getProductFileManifest(productId: number) {
  const [files] = await pool.execute<RowDataPacket[]>(
    `SELECT file_name, file_type, file_size_bytes, sort_order FROM product_files WHERE product_id = ? ORDER BY sort_order ASC`,
    [productId]
  );
  return files.map((f) => ({
    file_name: String(f.file_name ?? ''),
    file_type: String(f.file_type ?? ''),
    file_size_bytes: Number(f.file_size_bytes ?? 0),
    sort_order: Number(f.sort_order ?? 0),
  }));
}

/** Tras marcar pedido como pagado: reparte ingreso a vendedores e incrementa descargas. */
async function applyOrderPaidEffects(conn: PoolConnection, orderId: number): Promise<void> {
  const [items] = await conn.execute<RowDataPacket[]>(
    `SELECT product_id, seller_id, seller_revenue_cents FROM order_items WHERE order_id = ?`,
    [orderId]
  );
  for (const it of items) {
    await conn.execute(
      `UPDATE profiles SET total_revenue_cents = total_revenue_cents + ?, total_sales = total_sales + 1 WHERE id = ?`,
      [Number(it.seller_revenue_cents), it.seller_id]
    );
    await conn.execute(`UPDATE products SET download_count = download_count + 1 WHERE id = ?`, [
      it.product_id,
    ]);
  }
}

/** Comisión global (% que se queda YaProFe) desde `platform_settings`. */
async function getDefaultCommissionPercent(): Promise<number> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT v FROM platform_settings WHERE k = 'default_commission_percent' LIMIT 1`
    );
    const n = Number(rows[0]?.v);
    if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
  } catch {
    /* tabla o fila ausente */
  }
  return 15;
}

function effectiveCommissionPercent(profileRate: unknown, defaultPct: number): number {
  if (profileRate == null || profileRate === '') return defaultPct;
  const n = Number(profileRate);
  if (!Number.isFinite(n)) return defaultPct;
  return Math.min(100, Math.max(0, n));
}

const SOCIAL_SETTING_KEYS = {
  twitter: 'social_twitter',
  instagram: 'social_instagram',
  facebook: 'social_facebook',
  youtube: 'social_youtube',
} as const;

async function getSettingValue(k: string): Promise<string> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT v FROM platform_settings WHERE k = ? LIMIT 1`,
      [k]
    );
    const v = rows[0]?.v;
    return v != null ? String(v).trim() : '';
  } catch {
    return '';
  }
}

function normalizeSocialUrl(input: unknown): string {
  if (input == null || typeof input !== 'string') return '';
  let t = input.trim();
  if (!t) return '';
  if (!/^https?:\/\//i.test(t)) t = `https://${t.replace(/^\/+/, '')}`;
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
  } catch {
    return '';
  }
  return t.slice(0, 2048);
}

export function registerApiRoutes(app: Express): void {
  ensureUploadDirs();

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, displayName, role } = req.body as {
        email?: string;
        password?: string;
        displayName?: string;
        role?: string;
      };
      if (!email || !password || !displayName) {
        res.status(400).json({ error: 'Email, password y nombre son obligatorios' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });
        return;
      }
      const r = role === 'seller' ? 'seller' : 'buyer';
      const id = newId();
      const ph = await hashPassword(password);
      const registerHasSmtp = Boolean(getTransport());
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const emailVerified = registerHasSmtp ? 0 : 1;
        await conn.execute(
          'INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, ?)',
          [id, email.toLowerCase().trim(), ph, emailVerified]
        );
        await conn.execute(
          `INSERT INTO profiles (id, display_name, role) VALUES (?, ?, ?)`,
          [id, displayName.trim(), r]
        );
        await conn.commit();
      } catch (e: unknown) {
        await conn.rollback();
        const err = e as { code?: string };
        if (err.code === 'ER_DUP_ENTRY') {
          res.status(400).json({ error: 'Ese email ya esta registrado' });
          return;
        }
        throw e;
      } finally {
        conn.release();
      }
      const [prows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM profiles WHERE id = ?',
        [id]
      );
      const inserted = prows[0];
      if (!inserted) {
        res.status(500).json({ error: 'No se pudo cargar el perfil recién creado' });
        return;
      }
      if (registerHasSmtp) {
        const plain = randomBytes(32).toString('hex');
        const th = hashPasswordResetToken(plain);
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await pool.execute('DELETE FROM email_verification_tokens WHERE user_id = ?', [id]);
        await pool.execute(
          'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)',
          [id, th, expiresAt]
        );
        const verifyLink = buildVerifyEmailLink(plain);
        // Enviar correo en segundo plano para no frenar la respuesta del registro.
        void sendVerificationEmail(email.toLowerCase().trim(), verifyLink).catch(e => {
          console.error('[auth/register] envío verificación (background)', e);
        });
        res.status(201).json({
          needsVerification: true,
          email: email.toLowerCase().trim(),
          profile: profileRowToJson(inserted),
          user: { id, email: email.toLowerCase().trim() },
          verificationEmailQueued: true,
        });
        return;
      }
      const token = signToken(id);
      res.json({
        token,
        profile: profileRowToJson(inserted),
        user: { id, email: email.toLowerCase().trim() },
      });
    } catch (e) {
      console.error('[auth/register]', e);
      const detail = e instanceof Error ? e.message : String(e);
      res.status(500).json({
        error: 'Error al registrar',
        detail,
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        res.status(400).json({ error: 'Email y contrasena requeridos' });
        return;
      }
      const [urows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, email, password_hash, COALESCE(email_verified, 1) AS email_verified FROM users WHERE email = ?',
        [email.toLowerCase().trim()]
      );
      const u = urows[0];
      if (!u || !(await verifyPassword(password, u.password_hash as string))) {
        res.status(401).json({ error: 'Credenciales incorrectas' });
        return;
      }
      if (Number((u as Record<string, unknown>).email_verified ?? 1) === 0) {
        res.status(403).json({
          error:
            'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja (y spam) o solicita un nuevo enlace desde registro.',
          code: 'EMAIL_NOT_VERIFIED',
        });
        return;
      }
      const [prows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM profiles WHERE id = ?',
        [u.id]
      );
      const prof = prows[0];
      if (!prof) {
        res.status(500).json({ error: 'Tu usuario no tiene perfil asociado. Contacta al administrador.' });
        return;
      }
      if (Number((prof as Record<string, unknown>).is_active ?? 1) === 0) {
        res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
        return;
      }
      const token = signToken(u.id as string);
      res.json({
        token,
        profile: profileRowToJson(prof),
        user: { id: u.id, email: u.email },
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al iniciar sesion' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT p.*, u.email FROM profiles p JOIN users u ON u.id = p.id WHERE p.id = ?`,
        [req.userId]
      );
      if (!rows[0]) {
        res.status(404).json({ error: 'Perfil no encontrado' });
        return;
      }
      const row = rows[0];
      const defaultPct = await getDefaultCommissionPercent();
      const profile = {
        id: row.id,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        banner_url: row.banner_url,
        bio: row.bio,
        role: row.role,
        locale: row.locale,
        theme_pref: row.theme_pref,
        seller_handle: row.seller_handle,
        commission_rate: row.commission_rate == null ? null : Number(row.commission_rate),
        effective_commission_percent: effectiveCommissionPercent(row.commission_rate, defaultPct),
        is_verified: Boolean(row.is_verified),
        is_active: Number(row.is_active ?? 1) === 1,
        total_sales: row.total_sales,
        total_revenue_cents: Number(row.total_revenue_cents),
        created_at: toIso(row.created_at),
        email: row.email,
      };
      res.json({ profile, user: { id: row.id, email: row.email } });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error' });
    }
  });

  /**
   * Solicitud de recuperación: envía correo con enlace `/?reset_token=...` (válido 1 h).
   * Respuesta siempre genérica si el correo existe o no (evita enumeración).
   */
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const email = (req.body as { email?: string }).email?.toLowerCase().trim();
      if (!email) {
        res.status(400).json({ error: 'Email requerido' });
        return;
      }
      const [urows] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [email]
      );
      const uid = urows[0]?.id as string | undefined;
      if (uid && getTransport()) {
        const plain = randomBytes(32).toString('hex');
        const th = hashPasswordResetToken(plain);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await pool.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [uid]);
        await pool.execute(
          'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)',
          [uid, th, expiresAt]
        );
        const resetLink = buildPasswordResetLink(plain);
        try {
          await sendPasswordResetEmail(email, resetLink);
        } catch {
          await pool.execute('DELETE FROM password_reset_tokens WHERE user_id = ? AND token_hash = ?', [uid, th]);
        }
      } else if (uid && !getTransport()) {
        console.warn('[forgot-password] SMTP no configurado; no se envía correo');
      }
      res.json({ ok: true });
    } catch (e) {
      console.error('[forgot-password]', e);
      res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
  });

  /** Restablecer contraseña con token recibido por correo (sin sesión). */
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body as { token?: string; password?: string };
      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Token requerido' });
        return;
      }
      if (!password || password.length < 6) {
        res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        return;
      }
      const th = hashPasswordResetToken(token.trim());
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > NOW(3)`,
        [th]
      );
      const userId = rows[0]?.user_id as string | undefined;
      if (!userId) {
        res.status(400).json({
          error:
            'Enlace inválido o caducado. Solicita uno nuevo desde «Olvidé mi contraseña».',
        });
        return;
      }
      const newHash = await hashPassword(password);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
        await conn.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
      res.json({ ok: true });
    } catch (e) {
      console.error('[reset-password]', e);
      res.status(500).json({ error: 'Error al restablecer la contraseña' });
    }
  });

  /** Confirma correo con token del enlace `/?verify_token=`. */
  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const token = (req.body as { token?: string }).token?.trim();
      if (!token || token.length < 32) {
        res.status(400).json({ error: 'Token inválido' });
        return;
      }
      const th = hashPasswordResetToken(token);
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT user_id FROM email_verification_tokens WHERE token_hash = ? AND expires_at > NOW(3)`,
        [th]
      );
      const userId = rows[0]?.user_id as string | undefined;
      if (!userId) {
        res.status(400).json({
          error: 'Enlace inválido o caducado. Solicita un nuevo correo de verificación.',
        });
        return;
      }
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute('UPDATE users SET email_verified = 1 WHERE id = ?', [userId]);
        await conn.execute('DELETE FROM email_verification_tokens WHERE user_id = ?', [userId]);
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
      res.json({ ok: true });
    } catch (e) {
      console.error('[verify-email]', e);
      res.status(500).json({ error: 'Error al verificar el correo' });
    }
  });

  /** Reenvía correo de verificación (misma respuesta genérica si no aplica). */
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const email = (req.body as { email?: string }).email?.toLowerCase().trim();
      if (!email) {
        res.status(400).json({ error: 'Email requerido' });
        return;
      }
      const [urows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, COALESCE(email_verified, 1) AS email_verified FROM users WHERE email = ? LIMIT 1',
        [email]
      );
      const uid = urows[0]?.id as string | undefined;
      const verified = Number((urows[0] as Record<string, unknown> | undefined)?.email_verified ?? 1);
      if (!uid || verified === 1 || !getTransport()) {
        res.json({ ok: true });
        return;
      }
      const plain = randomBytes(32).toString('hex');
      const th = hashPasswordResetToken(plain);
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await pool.execute('DELETE FROM email_verification_tokens WHERE user_id = ?', [uid]);
      await pool.execute(
        'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)',
        [uid, th, expiresAt]
      );
      const verifyLink = buildVerifyEmailLink(plain);
      try {
        await sendVerificationEmail(email, verifyLink);
      } catch (err) {
        console.error('[resend-verification]', err);
        await pool.execute('DELETE FROM email_verification_tokens WHERE user_id = ? AND token_hash = ?', [uid, th]);
      }
      res.json({ ok: true });
    } catch (e) {
      console.error('[resend-verification]', e);
      res.status(500).json({ error: 'Error al reenviar verificación' });
    }
  });

  app.patch('/api/auth/password', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword?: string;
        newPassword?: string;
      };
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Contrasena actual y nueva son obligatorias' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ error: 'La nueva contrasena debe tener al menos 6 caracteres' });
        return;
      }
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT password_hash FROM users WHERE id = ?',
        [req.userId]
      );
      const hash = rows[0]?.password_hash as string | undefined;
      if (!hash || !(await verifyPassword(currentPassword, hash))) {
        res.status(400).json({ error: 'Contrasena actual incorrecta' });
        return;
      }
      const newHash = await hashPassword(newPassword);
      await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.userId]);
      res.json({ ok: true });
    } catch (e) {
      console.error('[auth/password]', e);
      res.status(500).json({ error: 'Error al cambiar contrasena' });
    }
  });

  app.get('/api/categories', async (_req, res) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories ORDER BY sort_order ASC'
    );
    res.json(rows);
  });

  /** Enlaces a redes sociales (pie de página). Público, sin auth. */
  app.get('/api/site/social', async (_req, res) => {
    const [twitter, instagram, facebook, youtube] = await Promise.all([
      getSettingValue(SOCIAL_SETTING_KEYS.twitter),
      getSettingValue(SOCIAL_SETTING_KEYS.instagram),
      getSettingValue(SOCIAL_SETTING_KEYS.facebook),
      getSettingValue(SOCIAL_SETTING_KEYS.youtube),
    ]);
    res.json({ twitter, instagram, facebook, youtube });
  });

  app.get('/api/products/marketplace', async (req, res) => {
    try {
      const product_type = req.query.product_type as string | undefined;
      const category_id = req.query.category_id as string | undefined;
      const search = (req.query.search as string | undefined)?.trim();
      const sort = (req.query.sort as string) || 'newest';

      let sql = `
        SELECT p.*, 
          pr.id as sid, pr.display_name as sdn, pr.avatar_url as sav, pr.is_verified as sv, pr.seller_handle as ssh, pr.role as srole,
          c.id as cid, c.parent_id as cpid, c.slug as csl, c.name_es as cnes, c.name_en as cnen, c.icon as cic, c.sort_order as cso
        FROM products p
        INNER JOIN profiles pr ON pr.id = p.seller_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'published' AND COALESCE(pr.is_active, 1) = 1
      `;
      const params: unknown[] = [];

      if (product_type && product_type !== 'all') {
        sql += ' AND p.product_type = ?';
        params.push(product_type);
      }
      if (category_id) {
        sql += ' AND p.category_id = ?';
        params.push(Number(category_id));
      }
      if (search) {
        sql += ' AND (p.title LIKE ? OR p.short_description LIKE ?)';
        const like = `%${search}%`;
        params.push(like, like);
      }

      if (sort === 'popular') sql += ' ORDER BY p.download_count DESC';
      else if (sort === 'price_asc') sql += ' ORDER BY p.price_cents ASC';
      else if (sort === 'price_desc') sql += ' ORDER BY p.price_cents DESC';
      else sql += ' ORDER BY p.created_at DESC';

      const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
      const out = rows.map(r => {
        const p = { ...r };
        const seller = {
          id: r.sid,
          display_name: r.sdn,
          avatar_url: r.sav,
          is_verified: Boolean(r.sv),
          seller_handle: r.ssh,
          role: r.srole as string,
        };
        const cat = r.cid
          ? {
              id: r.cid,
              parent_id: r.cpid,
              slug: r.csl,
              name_es: r.cnes,
              name_en: r.cnen,
              icon: r.cic,
              sort_order: r.cso,
            }
          : null;
        delete (p as Record<string, unknown>).sid;
        delete (p as Record<string, unknown>).sdn;
        delete (p as Record<string, unknown>).sav;
        delete (p as Record<string, unknown>).sv;
        delete (p as Record<string, unknown>).ssh;
        delete (p as Record<string, unknown>).srole;
        delete (p as Record<string, unknown>).cid;
        delete (p as Record<string, unknown>).cpid;
        delete (p as Record<string, unknown>).csl;
        delete (p as Record<string, unknown>).cnes;
        delete (p as Record<string, unknown>).cnen;
        delete (p as Record<string, unknown>).cic;
        delete (p as Record<string, unknown>).cso;
        return mapProduct(p, seller as unknown as RowDataPacket, cat as unknown as RowDataPacket);
      });
      res.json(out);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error' });
    }
  });

  /** Reseñas públicas + datos del visitante (si envía Bearer). */
  app.get('/api/product/:id/reviews', async (req, res) => {
    try {
      const productId = Number(req.params.id);
      if (!Number.isFinite(productId)) {
        res.status(400).json({ error: 'ID invalido' });
        return;
      }
      const [pchk] = await pool.execute<RowDataPacket[]>(
        `SELECT id, seller_id FROM products WHERE id = ? AND status = 'published'`,
        [productId]
      );
      if (!pchk[0]) {
        res.status(404).json({ error: 'No encontrado' });
        return;
      }
      const sellerId = String(pchk[0].seller_id);

      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT r.id, r.rating, r.comment, r.created_at, pr.display_name AS reviewer_name, pr.avatar_url AS reviewer_avatar
         FROM reviews r
         JOIN profiles pr ON pr.id = r.reviewer_id
         WHERE r.product_id = ?
         ORDER BY r.created_at DESC`,
        [productId]
      );
      const reviews = rows.map((r) => ({
        id: r.id,
        rating: Number(r.rating),
        comment: r.comment,
        created_at: toIso(r.created_at),
        profiles: { display_name: r.reviewer_name, avatar_url: r.reviewer_avatar },
      }));

      const viewerId = tryGetUserIdFromAuthHeader(req);
      let viewer: {
        can_review: boolean;
        my_review: {
          id: number;
          rating: number;
          comment: string | null;
          created_at: string;
        } | null;
      } | null = null;

      if (viewerId) {
        const [my] = await pool.execute<RowDataPacket[]>(
          `SELECT id, rating, comment, created_at FROM reviews WHERE product_id = ? AND reviewer_id = ?`,
          [productId, viewerId]
        );
        const [paid] = await pool.execute<RowDataPacket[]>(
          `SELECT 1 FROM order_items oi
           INNER JOIN orders o ON o.id = oi.order_id
           WHERE o.buyer_id = ? AND oi.product_id = ? AND o.status = 'paid' LIMIT 1`,
          [viewerId, productId]
        );
        /** Una sola reseña por comprador; si ya existe, no mostrar formulario de nueva reseña. */
        const can = Boolean(paid[0]) && viewerId !== sellerId && !my[0];
        viewer = {
          can_review: can,
          my_review: my[0]
            ? {
                id: Number(my[0].id),
                rating: Number(my[0].rating),
                comment: (my[0].comment as string) ?? null,
                created_at: toIso(my[0].created_at),
              }
            : null,
        };
      }

      res.json({ reviews, viewer });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error' });
    }
  });

  app.post('/api/reviews', requireAuth, async (req: AuthedRequest, res) => {
    const b = req.body as { product_id?: unknown; rating?: unknown; comment?: unknown };
    const productId = Number(b.product_id);
    const rating = Number(b.rating);
    const comment =
      b.comment === null || b.comment === undefined
        ? null
        : String(b.comment).trim().slice(0, 8000) || null;
    if (!Number.isFinite(productId) || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'product_id y rating (1-5) son obligatorios' });
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [prows] = await conn.execute<RowDataPacket[]>(
        `SELECT seller_id, status FROM products WHERE id = ? FOR UPDATE`,
        [productId]
      );
      const prod = prows[0];
      if (!prod || prod.status !== 'published') {
        await conn.rollback();
        res.status(404).json({ error: 'Producto no disponible' });
        return;
      }
      if (String(prod.seller_id) === req.userId) {
        await conn.rollback();
        res.status(403).json({ error: 'No puedes reseñar tu propio producto' });
        return;
      }
      const [paid] = await conn.execute<RowDataPacket[]>(
        `SELECT 1 FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         WHERE o.buyer_id = ? AND oi.product_id = ? AND o.status = 'paid' LIMIT 1`,
        [req.userId, productId]
      );
      if (!paid[0]) {
        await conn.rollback();
        res.status(403).json({ error: 'Solo quien compro el producto puede reseñar' });
        return;
      }

      try {
        await conn.execute(
          `INSERT INTO reviews (product_id, reviewer_id, rating, comment) VALUES (?,?,?,?)`,
          [productId, req.userId, rating, comment]
        );
      } catch (insErr: unknown) {
        const err = insErr as { errno?: number; code?: string };
        if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
          await conn.rollback();
          res.status(409).json({ error: 'Ya dejaste una reseña en este producto' });
          return;
        }
        throw insErr;
      }
      await conn.execute(
        `UPDATE products SET
          rating_avg = ROUND(COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = ?), 0), 2),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?)
         WHERE id = ?`,
        [productId, productId, productId]
      );
      await conn.commit();
      res.json({ ok: true });
    } catch (e) {
      await conn.rollback();
      console.error('[reviews POST]', e);
      res.status(500).json({ error: 'Error al guardar la reseña' });
    } finally {
      conn.release();
    }
  });

  /** Detalle público de un producto publicado (para ficha de compra). */
  app.get('/api/product/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'ID invalido' });
        return;
      }
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT p.*,
          pr.id as sid, pr.display_name as sdn, pr.avatar_url as sav, pr.is_verified as sv, pr.seller_handle as ssh, pr.commission_rate as scomm, pr.is_active as sact, pr.role as srole,
          c.id as cid, c.parent_id as cpid, c.slug as csl, c.name_es as cnes, c.name_en as cnen, c.icon as cic, c.sort_order as cso
        FROM products p
        INNER JOIN profiles pr ON pr.id = p.seller_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ? AND p.status = 'published' AND COALESCE(pr.is_active, 1) = 1`,
        [id]
      );
      const r = rows[0];
      if (!r) {
        res.status(404).json({ error: 'No encontrado' });
        return;
      }
      const defaultPct = await getDefaultCommissionPercent();
      const seller = {
        id: r.sid,
        display_name: r.sdn,
        avatar_url: r.sav,
        is_verified: Boolean(r.sv),
        seller_handle: r.ssh,
        role: r.srole as string,
        commission_rate: effectiveCommissionPercent(r.scomm, defaultPct),
      };
      const cat = r.cid
        ? {
            id: r.cid,
            parent_id: r.cpid,
            slug: r.csl,
            name_es: r.cnes,
            name_en: r.cnen,
            icon: r.cic,
            sort_order: r.cso,
          }
        : null;
      const p = { ...r };
      delete (p as Record<string, unknown>).sid;
      delete (p as Record<string, unknown>).sdn;
      delete (p as Record<string, unknown>).sav;
      delete (p as Record<string, unknown>).sv;
      delete (p as Record<string, unknown>).ssh;
      delete (p as Record<string, unknown>).scomm;
      delete (p as Record<string, unknown>).sact;
      delete (p as Record<string, unknown>).srole;
      delete (p as Record<string, unknown>).cid;
      delete (p as Record<string, unknown>).cpid;
      delete (p as Record<string, unknown>).csl;
      delete (p as Record<string, unknown>).cnes;
      delete (p as Record<string, unknown>).cnen;
      delete (p as Record<string, unknown>).cic;
      delete (p as Record<string, unknown>).cso;
      await pool.execute(`UPDATE products SET view_count = view_count + 1 WHERE id = ? AND status = 'published'`, [id]);
      const base = mapProduct(p, seller as unknown as RowDataPacket, cat as unknown as RowDataPacket);
      base.view_count = Number(r.view_count) + 1;
      const file_manifest = await getProductFileManifest(id);
      res.json({ ...base, file_manifest });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error' });
    }
  });

  app.get('/api/follows/:sellerId', requireAuth, async (req: AuthedRequest, res) => {
    const sellerId = req.params.sellerId;
    if (sellerId === req.userId) {
      res.json({ following: false });
      return;
    }
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM seller_follows WHERE follower_id = ? AND seller_id = ?',
      [req.userId, sellerId]
    );
    res.json({ following: Boolean(rows[0]) });
  });

  app.post('/api/follows/:sellerId', requireAuth, async (req: AuthedRequest, res) => {
    const sellerId = req.params.sellerId;
    if (sellerId === req.userId) {
      res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
      return;
    }
    const [sellers] = await pool.execute<RowDataPacket[]>(
      `SELECT id, role FROM profiles WHERE id = ? AND COALESCE(is_active,1) = 1`,
      [sellerId]
    );
    const s = sellers[0];
    if (!s || (s.role !== 'seller' && s.role !== 'admin')) {
      res.status(404).json({ error: 'Vendedor no encontrado' });
      return;
    }
    await pool.execute(`INSERT IGNORE INTO seller_follows (follower_id, seller_id) VALUES (?, ?)`, [
      req.userId,
      sellerId,
    ]);
    res.json({ ok: true });
  });

  app.delete('/api/follows/:sellerId', requireAuth, async (req: AuthedRequest, res) => {
    await pool.execute(`DELETE FROM seller_follows WHERE follower_id = ? AND seller_id = ?`, [
      req.userId,
      req.params.sellerId,
    ]);
    res.json({ ok: true });
  });

  /** Vendedor: seguidores del perfil propio. */
  app.get('/api/seller/followers', requireAuth, async (req: AuthedRequest, res) => {
    const role = await getProfileRole(req.userId!);
    if (role !== 'seller' && role !== 'admin') {
      res.status(403).json({ error: 'Solo vendedores' });
      return;
    }
    const [[cntRow]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM seller_follows WHERE seller_id = ?`,
      [req.userId]
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT sf.follower_id, sf.created_at, pr.display_name, pr.avatar_url
       FROM seller_follows sf
       INNER JOIN profiles pr ON pr.id = sf.follower_id
       WHERE sf.seller_id = ?
       ORDER BY sf.created_at DESC
       LIMIT 200`,
      [req.userId]
    );
    res.json({
      count: Number(cntRow?.c ?? 0),
      followers: rows.map((r) => ({
        follower_id: r.follower_id,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        followed_at: toIso(r.created_at),
      })),
    });
  });

  /** Comprador: vendedores a los que sigue. */
  app.get('/api/me/following', requireAuth, async (req: AuthedRequest, res) => {
    const [[cntRow]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM seller_follows WHERE follower_id = ?`,
      [req.userId]
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT sf.seller_id, sf.created_at, pr.display_name, pr.avatar_url, pr.seller_handle
       FROM seller_follows sf
       INNER JOIN profiles pr ON pr.id = sf.seller_id
       WHERE sf.follower_id = ?
       ORDER BY sf.created_at DESC
       LIMIT 200`,
      [req.userId]
    );
    res.json({
      count: Number(cntRow?.c ?? 0),
      following: rows.map((r) => ({
        seller_id: r.seller_id,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        seller_handle: r.seller_handle,
        followed_at: toIso(r.created_at),
      })),
    });
  });

  /**
   * Checkout: crea pedido con comisión por línea según `profiles.commission_rate` del vendedor.
   * - Precio 0: marca pagado al instante (payment_method=free).
   * - Precio > 0: pending hasta admin confirme o webhook de pasarela (Stripe, etc.).
   */
  app.post('/api/checkout', requireAuth, async (req: AuthedRequest, res) => {
    const buyerId = req.userId!;
    const body = req.body as {
      product_ids?: unknown;
      payment_method?: string;
      payment_reference?: string | null;
      payment_proof_url?: string | null;
    };
    const rawIds = Array.isArray(body.product_ids) ? body.product_ids : [];
    const productIds = [...new Set(rawIds.map((x) => Number(x)).filter((n) => Number.isFinite(n)))];
    if (productIds.length === 0 || productIds.length > 30) {
      res.status(400).json({ error: 'Indica entre 1 y 30 productos' });
      return;
    }

    const payMethod = (body.payment_method || 'manual_pending').slice(0, 64);
    const payRef =
      typeof body.payment_reference === 'string' ? body.payment_reference.slice(0, 255) : null;
    const proofUrl =
      typeof body.payment_proof_url === 'string' && body.payment_proof_url.trim().length > 0
        ? body.payment_proof_url.trim().slice(0, 2048)
        : null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const defaultCommissionPct = await getDefaultCommissionPercent();

      let totalCents = 0;
      const lines: Array<{
        product_id: number;
        seller_id: string;
        unit_price_cents: number;
        commission_rate: number;
        commission_cents: number;
        seller_revenue_cents: number;
      }> = [];

      for (const pid of productIds) {
        const [prows] = await conn.execute<RowDataPacket[]>(
          `SELECT p.*, pr.commission_rate AS cr, pr.is_active AS seller_active FROM products p
           INNER JOIN profiles pr ON pr.id = p.seller_id
           WHERE p.id = ? AND p.status = 'published' FOR UPDATE`,
          [pid]
        );
        const p = prows[0];
        if (!p) {
          await conn.rollback();
          res.status(400).json({ error: `Producto ${pid} no disponible` });
          return;
        }
        if (p.seller_id === buyerId) {
          await conn.rollback();
          res.status(400).json({ error: 'No puedes comprar tu propio producto' });
          return;
        }
        if (Number((p as Record<string, unknown>).seller_active ?? 1) === 0) {
          await conn.rollback();
          res.status(400).json({ error: 'Este vendedor no está disponible' });
          return;
        }
        const [dup] = await conn.execute<RowDataPacket[]>(
          `SELECT 1 FROM order_items oi
           INNER JOIN orders o ON o.id = oi.order_id
           WHERE o.buyer_id = ? AND oi.product_id = ? AND o.status = 'paid' LIMIT 1`,
          [buyerId, pid]
        );
        if (dup[0]) {
          await conn.rollback();
          res.status(400).json({ error: `Ya compraste el producto ${pid}` });
          return;
        }

        const unit = Number(p.price_cents);
        const rate = effectiveCommissionPercent(p.cr, defaultCommissionPct);
        const commission_cents = Math.round((unit * rate) / 100);
        const seller_revenue_cents = unit - commission_cents;
        totalCents += unit;
        lines.push({
          product_id: pid,
          seller_id: p.seller_id as string,
          unit_price_cents: unit,
          commission_rate: rate,
          commission_cents,
          seller_revenue_cents,
        });
      }

      const isFree = totalCents === 0;
      const status = isFree ? 'paid' : 'pending';
      const pm = isFree ? 'free' : payMethod;
      const paidAt = isFree ? new Date() : null;

      const [ins] = await conn.execute<ResultSetHeader>(
        `INSERT INTO orders (buyer_id, status, total_cents, currency, payment_method, payment_reference, payment_proof_url, paid_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [buyerId, status, totalCents, 'PEN', pm, payRef, proofUrl, paidAt]
      );
      const orderId = ins.insertId;

      for (const ln of lines) {
        await conn.execute(
          `INSERT INTO order_items (order_id, product_id, seller_id, unit_price_cents, commission_rate, commission_cents, seller_revenue_cents)
           VALUES (?,?,?,?,?,?,?)`,
          [
            orderId,
            ln.product_id,
            ln.seller_id,
            ln.unit_price_cents,
            ln.commission_rate,
            ln.commission_cents,
            ln.seller_revenue_cents,
          ]
        );
      }

      if (isFree) {
        await applyOrderPaidEffects(conn, orderId);
      }

      await conn.commit();
      if (status === 'paid') {
        void sendOrderPaidEmails(orderId).catch((err) => console.error('[checkout orderEmails]', err));
      }
      res.json({
        order_id: orderId,
        status,
        total_cents: totalCents,
        currency: 'PEN',
        payment_method: pm,
        message: isFree
          ? 'Acceso inmediato'
          : 'Pedido registrado. Pendiente de confirmacion de pago (admin o pasarela).',
      });
    } catch (e) {
      await conn.rollback();
      console.error('[checkout]', e);
      res.status(500).json({ error: 'Error al crear pedido' });
    } finally {
      conn.release();
    }
  });

  /** ¿El usuario ya compró este producto (pagado)? */
  app.get('/api/buyer/purchase-status/:productId', requireAuth, async (req: AuthedRequest, res) => {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId)) {
      res.status(400).json({ error: 'ID invalido' });
      return;
    }
    const [ok] = await pool.execute<RowDataPacket[]>(
      `SELECT o.status FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE o.buyer_id = ? AND oi.product_id = ? AND o.status = 'paid' LIMIT 1`,
      [req.userId, productId]
    );
    res.json({ purchased: Boolean(ok[0]) });
  });

  /** Archivos descargables si el comprador tiene pedido pagado. */
  app.get('/api/buyer/library/:productId/files', requireAuth, async (req: AuthedRequest, res) => {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId)) {
      res.status(400).json({ error: 'ID invalido' });
      return;
    }
    const [ok] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE o.buyer_id = ? AND oi.product_id = ? AND o.status = 'paid' LIMIT 1`,
      [req.userId, productId]
    );
    if (!ok[0]) {
      res.status(403).json({ error: 'No tienes acceso a este recurso' });
      return;
    }
    const [files] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_files WHERE product_id = ? ORDER BY sort_order ASC',
      [productId]
    );
    res.json(
      files.map((f) => ({
        id: f.id,
        product_id: f.product_id,
        file_url: f.file_url,
        file_name: f.file_name,
        file_type: f.file_type,
        file_size_bytes: f.file_size_bytes,
        sort_order: f.sort_order,
        created_at: toIso(f.created_at),
      }))
    );
  });

  app.get('/api/profiles/:id', async (req, res) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM profiles WHERE id = ? AND role IN (\'seller\',\'buyer\',\'admin\')',
      [req.params.id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    const row = rows[0];
    res.json({
      ...row,
      is_verified: Boolean(row.is_verified),
      commission_rate: Number(row.commission_rate),
      total_revenue_cents: Number(row.total_revenue_cents),
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
    });
  });

  app.patch('/api/profiles/me', requireAuth, async (req: AuthedRequest, res) => {
    const body = req.body as Record<string, unknown>;
    const [prows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM profiles WHERE id = ?',
      [req.userId]
    );
    const role = prows[0]?.role as string;
    const updates: string[] = [];
    const vals: unknown[] = [];
    if (typeof body.display_name === 'string') {
      updates.push('display_name = ?');
      vals.push(body.display_name);
    }
    if (body.bio !== undefined) {
      updates.push('bio = ?');
      vals.push(body.bio);
    }
    if (body.avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      vals.push(body.avatar_url);
    }
    if (body.banner_url !== undefined) {
      updates.push('banner_url = ?');
      vals.push(body.banner_url);
    }
    if (role === 'seller' && typeof body.seller_handle === 'string') {
      updates.push('seller_handle = ?');
      vals.push(String(body.seller_handle).toLowerCase().replace(/[^a-z0-9-]/g, ''));
    }
    if (updates.length === 0) {
      res.json({ ok: true });
      return;
    }
    vals.push(req.userId);
    await pool.execute(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`, vals);
    res.json({ ok: true });
  });

  app.get('/api/seller/products', requireAuth, async (req: AuthedRequest, res) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(rows.map(r => mapProduct(r, null, null)));
  });

  app.get('/api/seller/sales', requireAuth, async (req: AuthedRequest, res) => {
    const df = typeof req.query.date_from === 'string' ? req.query.date_from : '';
    const dt = typeof req.query.date_to === 'string' ? req.query.date_to : '';
    const dateOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
    const conditions = ['oi.seller_id = ?'];
    const sqlParams: unknown[] = [req.userId];
    if (df && dateOk(df)) {
      conditions.push('oi.created_at >= ?');
      sqlParams.push(`${df} 00:00:00`);
    }
    if (dt && dateOk(dt)) {
      conditions.push('oi.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      sqlParams.push(dt);
    }
    const sql = `
      SELECT oi.*, o.buyer_id, o.status as order_status, o.created_at as order_created_at,
             pr.title as product_title
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products pr ON pr.id = oi.product_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY oi.created_at DESC
      LIMIT 500
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(sql, sqlParams);
    const mapped = rows.map(r => ({
      id: r.id,
      unit_price_cents: r.unit_price_cents,
      commission_cents: r.commission_cents,
      seller_revenue_cents: r.seller_revenue_cents,
      created_at: toIso(r.created_at),
      orders: {
        buyer_id: r.buyer_id,
        status: r.order_status,
        created_at: toIso(r.order_created_at),
      },
      products: { title: r.product_title },
    }));
    res.json(mapped);
  });

  /** Reseñas de los productos del vendedor (moderación). */
  app.get('/api/seller/reviews', requireAuth, async (req: AuthedRequest, res) => {
    const role = await getProfileRole(req.userId!);
    if (role !== 'seller' && role !== 'admin') {
      res.status(403).json({ error: 'Solo vendedores' });
      return;
    }
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT r.id, r.product_id, r.rating, r.comment, r.created_at,
                p.title AS product_title,
                pr.display_name AS reviewer_name, pr.avatar_url AS reviewer_avatar
         FROM reviews r
         INNER JOIN products p ON p.id = r.product_id AND p.seller_id = ?
         INNER JOIN profiles pr ON pr.id = r.reviewer_id
         ORDER BY r.created_at DESC
         LIMIT 500`,
        [req.userId]
      );
      res.json(
        rows.map((r) => ({
          id: Number(r.id),
          rating: Number(r.rating),
          comment: r.comment,
          created_at: toIso(r.created_at),
          products: { id: Number(r.product_id), title: r.product_title },
          profiles: { display_name: r.reviewer_name, avatar_url: r.reviewer_avatar },
        }))
      );
    } catch (e) {
      console.error('[seller/reviews]', e);
      res.status(500).json({ error: 'Error' });
    }
  });

  app.delete('/api/seller/reviews/:id', requireAuth, async (req: AuthedRequest, res) => {
    const reviewId = Number(req.params.id);
    if (!Number.isFinite(reviewId)) {
      res.status(400).json({ error: 'ID invalido' });
      return;
    }
    const role = await getProfileRole(req.userId!);
    if (role !== 'seller' && role !== 'admin') {
      res.status(403).json({ error: 'Solo vendedores' });
      return;
    }
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT r.id, r.product_id FROM reviews r
         INNER JOIN products p ON p.id = r.product_id AND p.seller_id = ?
         WHERE r.id = ?`,
        [req.userId, reviewId]
      );
      if (!rows[0]) {
        res.status(404).json({ error: 'No encontrado' });
        return;
      }
      const pid = Number(rows[0].product_id);
      await pool.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);
      await pool.execute(
        `UPDATE products SET
          rating_avg = ROUND(COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = ?), 0), 2),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?)
         WHERE id = ?`,
        [pid, pid, pid]
      );
      res.json({ ok: true });
    } catch (e) {
      console.error('[seller/reviews DELETE]', e);
      res.status(500).json({ error: 'Error' });
    }
  });

  app.get('/api/buyer/orders', requireAuth, async (req: AuthedRequest, res) => {
    const df = typeof req.query.date_from === 'string' ? req.query.date_from : '';
    const dt = typeof req.query.date_to === 'string' ? req.query.date_to : '';
    const dateOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
    const conditions: string[] = ['buyer_id = ?'];
    const orderParams: unknown[] = [req.userId];
    if (df && dateOk(df)) {
      conditions.push('created_at >= ?');
      orderParams.push(`${df} 00:00:00`);
    }
    if (dt && dateOk(dt)) {
      conditions.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      orderParams.push(dt);
    }
    const [orders] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM orders WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 500`,
      orderParams
    );
    const out = [];
    for (const o of orders) {
      const [items] = await pool.execute<RowDataPacket[]>(
        `SELECT oi.id, oi.unit_price_cents, p.id as pid, p.title, p.cover_url, p.product_type, p.seller_id
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`,
        [o.id]
      );
      out.push({
        id: o.id,
        status: o.status,
        total_cents: o.total_cents,
        currency: o.currency,
        created_at: toIso(o.created_at),
        order_items: items.map(it => ({
          id: it.id,
          unit_price_cents: it.unit_price_cents,
          products: {
            id: it.pid,
            title: it.title,
            cover_url: it.cover_url,
            product_type: it.product_type,
            seller_id: it.seller_id,
          },
        })),
      });
    }
    res.json(out);
  });

  app.get('/api/seller/products/:id', requireAuth, async (req: AuthedRequest, res) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM products WHERE id = ? AND seller_id = ?',
      [req.params.id, req.userId]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    res.json(mapProduct(rows[0], null, null));
  });

  app.get('/api/seller/products/:id/files', requireAuth, async (req: AuthedRequest, res) => {
    const [p] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM products WHERE id = ? AND seller_id = ?',
      [req.params.id, req.userId]
    );
    if (!p[0]) {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    const [files] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_files WHERE product_id = ? ORDER BY sort_order ASC',
      [req.params.id]
    );
    res.json(
      files.map(f => ({
        ...f,
        created_at: toIso(f.created_at),
      }))
    );
  });

  app.post('/api/seller/products', requireAuth, async (req: AuthedRequest, res) => {
    const role = await getProfileRole(req.userId!);
    if (role !== 'seller' && role !== 'admin') {
      res.status(403).json({ error: 'Solo vendedores' });
      return;
    }
    const b = req.body as Record<string, unknown>;
    const slug = String(b.slug || `p-${Date.now()}`);
    const tags = Array.isArray(b.tags) ? JSON.stringify(b.tags) : JSON.stringify([]);
    const [r] = await pool.execute<ResultSetHeader>(
      `INSERT INTO products (seller_id, category_id, title, slug, description, short_description, product_type, price_cents, original_price_cents, cover_url, tags, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.userId,
        b.category_id != null ? Number(b.category_id) : null,
        b.title,
        slug,
        sanitizeProductDescription(b.description),
        b.short_description ?? null,
        b.product_type || 'resource',
        Number(b.price_cents) || 0,
        b.original_price_cents != null ? Number(b.original_price_cents) : null,
        b.cover_url ?? null,
        tags,
        b.status || 'draft',
      ]
    );
    res.json({ id: r.insertId });
  });

  app.patch('/api/seller/products/:id', requireAuth, async (req: AuthedRequest, res) => {
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT seller_id FROM products WHERE id = ?',
      [req.params.id]
    );
    if (!existing[0]) {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    const role = await getProfileRole(req.userId!);
    if (existing[0].seller_id !== req.userId && role !== 'admin') {
      res.status(403).json({ error: 'Prohibido' });
      return;
    }
    const b = req.body as Record<string, unknown>;
    const updates: string[] = [];
    const vals: unknown[] = [];
    const fields = [
      'title',
      'short_description',
      'description',
      'product_type',
      'category_id',
      'price_cents',
      'original_price_cents',
      'cover_url',
      'status',
      'rejection_reason',
    ] as const;
    for (const f of fields) {
      if (b[f] !== undefined) {
        updates.push(`${f} = ?`);
        if (f === 'category_id') vals.push(b[f] != null ? Number(b[f]) : null);
        else if (f === 'price_cents' || f === 'original_price_cents') vals.push(b[f] != null ? Number(b[f]) : null);
        else if (f === 'description') vals.push(sanitizeProductDescription(b[f]));
        else vals.push(b[f]);
      }
    }
    if (b.featured !== undefined) {
      updates.push('featured = ?');
      vals.push(b.featured ? 1 : 0);
    }
    if (b.tags !== undefined) {
      updates.push('tags = ?');
      vals.push(JSON.stringify(b.tags));
    }
    if (updates.length === 0) {
      res.json({ ok: true });
      return;
    }
    vals.push(req.params.id);
    await pool.execute(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, vals);
    res.json({ ok: true });
  });

  app.delete('/api/seller/products/:id', requireAuth, async (req: AuthedRequest, res) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT seller_id, status FROM products WHERE id = ?',
      [req.params.id]
    );
    const p = rows[0];
    if (!p) {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    const role = await getProfileRole(req.userId!);
    if (role === 'admin') {
      await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
      return;
    }
    if (p.seller_id !== req.userId || p.status !== 'draft') {
      res.status(403).json({ error: 'Solo borradores propios' });
      return;
    }
    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  });

  app.post('/api/seller/product-files', requireAuth, async (req: AuthedRequest, res) => {
    const { product_id, files } = req.body as {
      product_id?: number;
      files?: Array<{
        file_url: string;
        file_name: string;
        file_type: string;
        file_size_bytes: number;
        sort_order?: number;
      }>;
    };
    if (!product_id || !files?.length) {
      res.status(400).json({ error: 'Datos invalidos' });
      return;
    }
    const [p] = await pool.execute<RowDataPacket[]>(
      'SELECT seller_id FROM products WHERE id = ?',
      [product_id]
    );
    if (!p[0] || p[0].seller_id !== req.userId) {
      res.status(403).json({ error: 'Prohibido' });
      return;
    }
    for (const f of files) {
      await pool.execute(
        `INSERT INTO product_files (product_id, file_url, file_name, file_type, file_size_bytes, sort_order) VALUES (?,?,?,?,?,?)`,
        [
          product_id,
          f.file_url,
          f.file_name,
          f.file_type,
          f.file_size_bytes,
          f.sort_order ?? 0,
        ]
      );
    }
    res.json({ ok: true });
  });

  app.delete('/api/seller/product-files/:id', requireAuth, async (req: AuthedRequest, res) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT pf.id, p.seller_id FROM product_files pf JOIN products p ON p.id = pf.product_id WHERE pf.id = ?`,
      [req.params.id]
    );
    if (!rows[0] || rows[0].seller_id !== req.userId) {
      res.status(403).json({ error: 'Prohibido' });
      return;
    }
    await pool.execute('DELETE FROM product_files WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  });

  app.post(
    '/api/upload',
    requireAuth,
    upload.single('file'),
    async (req: AuthedRequest, res) => {
      if (!req.file) {
        res.status(400).json({ error: 'Archivo requerido' });
        return;
      }
      // Multer guarda según ?bucket= en la URL; req.body.bucket suele venir vacío con multipart.
      // La ruta real del archivo es la fuente de verdad para la URL pública.
      const url = uploadPublicPath(req.file.path);
      res.json({ url, error: null });
    }
  );

  /** Normalized stats for AdminOverview */
  app.get('/api/admin/dashboard-stats', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
    const [profiles] = await pool.execute<RowDataPacket[]>(`SELECT role FROM profiles`);
    const [products] = await pool.execute<RowDataPacket[]>(`SELECT status, price_cents FROM products`);
    const [orders] = await pool.execute<RowDataPacket[]>(`SELECT total_cents, status FROM orders`);
    const [[{ c: totalReviews }]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as c FROM reviews`
    );
    res.json({ profiles, products, orders, totalReviews });
  });

  app.get('/api/admin/products', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, pr.display_name as seller_display_name, pr.seller_handle as seller_seller_handle, pr.avatar_url as seller_avatar_url
       FROM products p
       JOIN profiles pr ON pr.id = p.seller_id
       ORDER BY p.created_at DESC`
    );
    const out = rows.map(r => {
      const prod = mapProduct(r, null, null);
      return {
        ...prod,
        profiles: {
          display_name: r.seller_display_name,
          seller_handle: r.seller_seller_handle,
          avatar_url: r.seller_avatar_url,
        },
      };
    });
    res.json(out);
  });

  /** Ficha de producto para administrador (cualquier estado: borrador, en revisión, etc.). */
  app.get('/api/admin/products/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'ID invalido' });
        return;
      }
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT p.*,
          pr.id as sid, pr.display_name as sdn, pr.avatar_url as sav, pr.is_verified as sv, pr.seller_handle as ssh, pr.commission_rate as scomm, pr.is_active as sact, pr.role as srole,
          c.id as cid, c.parent_id as cpid, c.slug as csl, c.name_es as cnes, c.name_en as cnen, c.icon as cic, c.sort_order as cso
        FROM products p
        INNER JOIN profiles pr ON pr.id = p.seller_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?`,
        [id]
      );
      const r = rows[0];
      if (!r) {
        res.status(404).json({ error: 'No encontrado' });
        return;
      }
      const defaultPct = await getDefaultCommissionPercent();
      const seller = {
        id: r.sid,
        display_name: r.sdn,
        avatar_url: r.sav,
        is_verified: Boolean(r.sv),
        seller_handle: r.ssh,
        role: r.srole as string,
        commission_rate: effectiveCommissionPercent(r.scomm, defaultPct),
      };
      const cat = r.cid
        ? {
            id: r.cid,
            parent_id: r.cpid,
            slug: r.csl,
            name_es: r.cnes,
            name_en: r.cnen,
            icon: r.cic,
            sort_order: r.cso,
          }
        : null;
      const p = { ...r };
      delete (p as Record<string, unknown>).sid;
      delete (p as Record<string, unknown>).sdn;
      delete (p as Record<string, unknown>).sav;
      delete (p as Record<string, unknown>).sv;
      delete (p as Record<string, unknown>).ssh;
      delete (p as Record<string, unknown>).scomm;
      delete (p as Record<string, unknown>).sact;
      delete (p as Record<string, unknown>).srole;
      delete (p as Record<string, unknown>).cid;
      delete (p as Record<string, unknown>).cpid;
      delete (p as Record<string, unknown>).csl;
      delete (p as Record<string, unknown>).cnes;
      delete (p as Record<string, unknown>).cnen;
      delete (p as Record<string, unknown>).cic;
      delete (p as Record<string, unknown>).cso;
      const base = mapProduct(p, seller as unknown as RowDataPacket, cat as unknown as RowDataPacket);
      const file_manifest = await getProductFileManifest(id);
      res.json({ ...base, file_manifest });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error' });
    }
  });

  app.get('/api/admin/platform-settings', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
    const default_commission_percent = await getDefaultCommissionPercent();
    const [twitter, instagram, facebook, youtube] = await Promise.all([
      getSettingValue(SOCIAL_SETTING_KEYS.twitter),
      getSettingValue(SOCIAL_SETTING_KEYS.instagram),
      getSettingValue(SOCIAL_SETTING_KEYS.facebook),
      getSettingValue(SOCIAL_SETTING_KEYS.youtube),
    ]);
    res.json({
      default_commission_percent,
      social_twitter: twitter,
      social_instagram: instagram,
      social_facebook: facebook,
      social_youtube: youtube,
    });
  });

  app.patch('/api/admin/platform-settings', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
    const b = req.body as Record<string, unknown>;
    let did = false;

    if (Object.prototype.hasOwnProperty.call(b, 'default_commission_percent')) {
      const raw = b.default_commission_percent;
      if (raw === null || raw === '') {
        res.status(400).json({ error: 'default_commission_percent no puede estar vacio si se envia' });
        return;
      }
      const pct = Number(raw);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        res.status(400).json({ error: 'default_commission_percent debe ser un numero entre 0 y 100' });
        return;
      }
      await pool.execute(
        `INSERT INTO platform_settings (k, v) VALUES ('default_commission_percent', ?)
         ON DUPLICATE KEY UPDATE v = VALUES(v)`,
        [String(pct)]
      );
      did = true;
    }

    const socialBodyKeys = [
      'social_twitter',
      'social_instagram',
      'social_facebook',
      'social_youtube',
    ] as const;
    for (const key of socialBodyKeys) {
      if (Object.prototype.hasOwnProperty.call(b, key)) {
        const v = normalizeSocialUrl(b[key]);
        await pool.execute(
          `INSERT INTO platform_settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)`,
          [key, v]
        );
        did = true;
      }
    }

    if (!did) {
      res.status(400).json({
        error: 'Envia default_commission_percent y/o al menos un campo social_* (URL o cadena vacia para quitar)',
      });
      return;
    }

    const default_commission_percent = await getDefaultCommissionPercent();
    const [twitter, instagram, facebook, youtube] = await Promise.all([
      getSettingValue(SOCIAL_SETTING_KEYS.twitter),
      getSettingValue(SOCIAL_SETTING_KEYS.instagram),
      getSettingValue(SOCIAL_SETTING_KEYS.facebook),
      getSettingValue(SOCIAL_SETTING_KEYS.youtube),
    ]);
    res.json({
      ok: true,
      default_commission_percent,
      social_twitter: twitter,
      social_instagram: instagram,
      social_facebook: facebook,
      social_youtube: youtube,
    });
  });

  app.get('/api/admin/commission-summary', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
    const [sumRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COALESCE(SUM(oi.commission_cents), 0) AS platform_commission_cents,
        COALESCE(SUM(oi.seller_revenue_cents), 0) AS sellers_revenue_cents,
        COUNT(DISTINCT o.id) AS paid_order_count
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'paid'`
    );
    const row = sumRows[0];
    res.json({
      platform_commission_cents: Number(row?.platform_commission_cents ?? 0),
      sellers_revenue_cents: Number(row?.sellers_revenue_cents ?? 0),
      paid_order_count: Number(row?.paid_order_count ?? 0),
    });
  });

  app.get('/api/admin/users/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
    const targetId = req.params.id;
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, u.email FROM profiles p JOIN users u ON u.id = p.id WHERE p.id = ?`,
      [targetId]
    );
    const r = rows[0];
    if (!r) {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    const defaultPct = await getDefaultCommissionPercent();
    res.json({
      id: r.id,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      banner_url: r.banner_url,
      bio: r.bio,
      role: r.role,
      locale: r.locale,
      theme_pref: r.theme_pref,
      seller_handle: r.seller_handle,
      commission_rate: r.commission_rate == null ? null : Number(r.commission_rate),
      effective_commission_percent: effectiveCommissionPercent(r.commission_rate, defaultPct),
      is_verified: Boolean(r.is_verified),
      is_active: Number(r.is_active ?? 1) === 1,
      total_sales: Number(r.total_sales),
      total_revenue_cents: Number(r.total_revenue_cents),
      created_at: toIso(r.created_at),
      updated_at: toIso(r.updated_at),
      email: r.email as string,
    });
  });

  app.get('/api/admin/sellers/:sellerId/sales', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
    const sellerId = req.params.sellerId;
    const [items] = await pool.execute<RowDataPacket[]>(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.seller_id, oi.unit_price_cents, oi.commission_rate,
              oi.commission_cents, oi.seller_revenue_cents, o.status, o.buyer_id, o.created_at AS order_created_at,
              p.title AS product_title, ub.email AS buyer_email, pr.display_name AS buyer_name
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN users ub ON ub.id = o.buyer_id
       INNER JOIN profiles pr ON pr.id = o.buyer_id
       WHERE oi.seller_id = ? AND o.status = 'paid'
       ORDER BY o.created_at DESC
       LIMIT 200`,
      [sellerId]
    );
    res.json(
      items.map((it) => ({
        id: it.id,
        order_id: it.order_id,
        product_id: it.product_id,
        unit_price_cents: it.unit_price_cents,
        commission_rate: Number(it.commission_rate),
        commission_cents: it.commission_cents,
        seller_revenue_cents: it.seller_revenue_cents,
        product_title: it.product_title,
        buyer_email: it.buyer_email,
        buyer_name: it.buyer_name,
        order_created_at: toIso(it.order_created_at),
      }))
    );
  });

  app.get('/api/admin/users', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, u.email FROM profiles p JOIN users u ON u.id = p.id ORDER BY p.created_at DESC`
    );
    const defaultPct = await getDefaultCommissionPercent();
    res.json(
      rows.map(r => ({
        id: r.id,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        banner_url: r.banner_url,
        bio: r.bio,
        role: r.role,
        locale: r.locale,
        theme_pref: r.theme_pref,
        seller_handle: r.seller_handle,
        commission_rate: r.commission_rate == null ? null : Number(r.commission_rate),
        effective_commission_percent: effectiveCommissionPercent(r.commission_rate, defaultPct),
        is_verified: Boolean(r.is_verified),
        is_active: Number(r.is_active ?? 1) === 1,
        total_sales: Number(r.total_sales),
        total_revenue_cents: Number(r.total_revenue_cents),
        created_at: toIso(r.created_at),
        updated_at: toIso(r.updated_at),
        email: r.email as string,
      }))
    );
  });

  app.patch('/api/admin/profiles/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
    const targetId = req.params.id;
    const b = req.body as Record<string, unknown>;
    const updates: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown) => {
      updates.push(`${col} = ?`);
      vals.push(val);
    };

    if (b.role === 'buyer' || b.role === 'seller' || b.role === 'admin') push('role', b.role);
    if (typeof b.is_verified === 'boolean') push('is_verified', b.is_verified ? 1 : 0);
    if (typeof b.is_active === 'boolean') push('is_active', b.is_active ? 1 : 0);
    if (typeof b.display_name === 'string') {
      const dn = b.display_name.trim().slice(0, 255);
      push('display_name', dn || 'Usuario');
    }
    if (Object.prototype.hasOwnProperty.call(b, 'bio')) {
      if (b.bio === null) push('bio', null);
      else if (typeof b.bio === 'string') push('bio', b.bio.slice(0, 65000));
    }
    if (Object.prototype.hasOwnProperty.call(b, 'avatar_url')) {
      push('avatar_url', typeof b.avatar_url === 'string' ? b.avatar_url : null);
    }
    if (Object.prototype.hasOwnProperty.call(b, 'banner_url')) {
      push('banner_url', typeof b.banner_url === 'string' ? b.banner_url : null);
    }
    if (b.locale === 'es' || b.locale === 'en') push('locale', b.locale);
    if (b.theme_pref === 'light' || b.theme_pref === 'dark' || b.theme_pref === 'system') {
      push('theme_pref', b.theme_pref);
    }
    if (Object.prototype.hasOwnProperty.call(b, 'commission_rate')) {
      if (b.commission_rate === null) push('commission_rate', null);
      else {
        const n = Number(b.commission_rate);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          res.status(400).json({ error: 'commission_rate debe ser 0-100 o null (usa la general)' });
          return;
        }
        push('commission_rate', n);
      }
    }
    if (Object.prototype.hasOwnProperty.call(b, 'seller_handle')) {
      const rawH = b.seller_handle;
      const h =
        rawH === null || rawH === ''
          ? null
          : String(rawH)
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9_-]/g, '')
              .slice(0, 191) || null;
      if (h) {
        const [dup] = await pool.execute<RowDataPacket[]>(
          'SELECT id FROM profiles WHERE seller_handle = ? AND id <> ? LIMIT 1',
          [h, targetId]
        );
        if (dup[0]) {
          res.status(409).json({ error: 'Ese handle de vendedor ya esta en uso' });
          return;
        }
      }
      push('seller_handle', h);
    }

    if (typeof b.email === 'string') {
      const em = b.email.trim().toLowerCase().slice(0, 255);
      if (em.length > 3 && em.includes('@')) {
        const [eu] = await pool.execute<RowDataPacket[]>(
          'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
          [em, targetId]
        );
        if (eu[0]) {
          res.status(409).json({ error: 'Ese email ya esta en uso' });
          return;
        }
        await pool.execute('UPDATE users SET email = ? WHERE id = ?', [em, targetId]);
      }
    }

    if (!updates.length) {
      res.json({ ok: true });
      return;
    }
    vals.push(targetId);
    await pool.execute(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`, vals);
    res.json({ ok: true });
  });

  app.get('/api/admin/orders', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const df = typeof req.query.date_from === 'string' ? req.query.date_from : '';
      const dt = typeof req.query.date_to === 'string' ? req.query.date_to : '';
      const dateOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
      const conditions: string[] = [];
      const sqlParams: unknown[] = [];
      if (df && dateOk(df)) {
        conditions.push('o.created_at >= ?');
        sqlParams.push(`${df} 00:00:00`);
      }
      if (dt && dateOk(dt)) {
        conditions.push('o.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
        sqlParams.push(dt);
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT o.*, u.email AS buyer_email, pr.display_name AS buyer_name
         FROM orders o
         JOIN users u ON u.id = o.buyer_id
         JOIN profiles pr ON pr.id = o.buyer_id
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT 500`,
        sqlParams
      );
      const out: unknown[] = [];
      for (const o of rows) {
        const [items] = await pool.execute<RowDataPacket[]>(
          `SELECT oi.*, p.title AS product_title FROM order_items oi
           JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
          [o.id]
        );
        out.push({
          id: o.id,
          buyer_id: o.buyer_id,
          buyer_email: o.buyer_email,
          buyer_name: o.buyer_name,
          status: o.status,
          total_cents: o.total_cents,
          currency: o.currency,
          payment_method: o.payment_method,
          payment_reference: o.payment_reference,
          payment_proof_url: (o as { payment_proof_url?: string | null }).payment_proof_url ?? null,
          paid_at: o.paid_at ? toIso(o.paid_at) : null,
          created_at: toIso(o.created_at),
          order_items: items.map((it) => ({
            id: it.id,
            product_id: it.product_id,
            seller_id: it.seller_id,
            unit_price_cents: it.unit_price_cents,
            commission_rate: Number(it.commission_rate),
            commission_cents: it.commission_cents,
            seller_revenue_cents: it.seller_revenue_cents,
            product_title: it.product_title,
          })),
        });
      }
      res.json(out);
    } catch (e) {
      console.error('[admin/orders]', e);
      res.status(500).json({ error: 'Error' });
    }
  });

  app.patch('/api/admin/orders/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
    const orderId = Number(req.params.id);
    const status = (req.body as { status?: string }).status;
    if (!Number.isFinite(orderId) || (status !== 'paid' && status !== 'cancelled')) {
      res.status(400).json({ error: 'status debe ser paid o cancelled' });
      return;
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ords] = await conn.execute<RowDataPacket[]>(
        'SELECT * FROM orders WHERE id = ? FOR UPDATE',
        [orderId]
      );
      const o = ords[0];
      if (!o) {
        await conn.rollback();
        res.status(404).json({ error: 'Pedido no encontrado' });
        return;
      }
      if (o.status !== 'pending') {
        await conn.rollback();
        res.status(400).json({ error: 'Solo pedidos pendientes pueden confirmarse o cancelarse' });
        return;
      }
      if (status === 'cancelled') {
        await conn.execute(`UPDATE orders SET status = 'cancelled' WHERE id = ?`, [orderId]);
        await conn.commit();
        res.json({ ok: true });
        return;
      }
      await conn.execute(`UPDATE orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP(3) WHERE id = ?`, [
        orderId,
      ]);
      await applyOrderPaidEffects(conn, orderId);
      await conn.commit();
      void sendOrderPaidEmails(orderId).catch((err) => console.error('[admin orderEmails]', err));
      res.json({ ok: true });
    } catch (e) {
      await conn.rollback();
      console.error('[admin/order patch]', e);
      res.status(500).json({ error: 'Error' });
    } finally {
      conn.release();
    }
  });

  app.delete('/api/admin/reviews/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
    const reviewId = Number(req.params.id);
    if (!Number.isFinite(reviewId)) {
      res.status(400).json({ error: 'ID invalido' });
      return;
    }
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT product_id FROM reviews WHERE id = ?`, [reviewId]);
    const pid = rows[0]?.product_id;
    await pool.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);
    if (pid != null) {
      await pool.execute(
        `UPDATE products SET
          rating_avg = ROUND(COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = ?), 0), 2),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?)
         WHERE id = ?`,
        [pid, pid, pid]
      );
    }
    res.json({ ok: true });
  });

  app.get('/api/admin/reviews', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT r.*, p.title as product_title, pr.display_name as reviewer_name, pr.avatar_url as reviewer_avatar
       FROM reviews r
       JOIN products p ON p.id = r.product_id
       JOIN profiles pr ON pr.id = r.reviewer_id
       ORDER BY r.created_at DESC`
    );
    res.json(
      rows.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: toIso(r.created_at),
        products: { id: r.product_id, title: r.product_title },
        profiles: { display_name: r.reviewer_name, avatar_url: r.reviewer_avatar },
      }))
    );
  });

  app.post('/api/admin/categories', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
    const b = req.body as Record<string, unknown>;
    const [r] = await pool.execute<ResultSetHeader>(
      `INSERT INTO categories (slug, name_es, name_en, icon, sort_order) VALUES (?,?,?,?,?)`,
      [b.slug, b.name_es, b.name_en || b.name_es, b.icon || null, Number(b.sort_order) || 0]
    );
    res.json({ id: r.insertId });
  });

  app.patch('/api/admin/categories/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
    const b = req.body as Record<string, unknown>;
    const updates: string[] = [];
    const vals: unknown[] = [];
    for (const k of ['name_es', 'name_en', 'slug', 'icon', 'sort_order']) {
      if (b[k] !== undefined) {
        updates.push(`${k} = ?`);
        vals.push(k === 'sort_order' ? Number(b[k]) : b[k]);
      }
    }
    if (!updates.length) {
      res.json({ ok: true });
      return;
    }
    vals.push(req.params.id);
    await pool.execute(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, vals);
    res.json({ ok: true });
  });

  app.delete('/api/admin/categories/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
    await pool.execute('UPDATE products SET category_id = NULL WHERE category_id = ?', [req.params.id]);
    await pool.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  });

  app.post('/api/push/subscribe', requireAuth, async (req: AuthedRequest, res) => {
    const { endpoint, keys } = req.body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: 'Suscripcion invalida' });
      return;
    }
    await pool.execute(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key, user_agent)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE p256dh=VALUES(p256dh), auth_key=VALUES(auth_key), user_id=VALUES(user_id)`,
      [
        req.userId,
        endpoint.slice(0, 2048),
        keys.p256dh,
        keys.auth,
        (req.headers['user-agent'] as string) || null,
      ]
    );
    res.json({ ok: true });
  });

  app.get('/api/push/vapid-public-key', (_req, res) => {
    const k = process.env.VAPID_PUBLIC_KEY || '';
    res.json({ publicKey: k });
  });

  /** Public list of published products for a seller profile (must stay after /api/seller/products routes) */
  app.get('/api/seller/:sellerId/products', async (req, res) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM products WHERE seller_id = ? AND status = 'published' ORDER BY created_at DESC`,
      [req.params.sellerId]
    );
    res.json(rows.map(r => mapProduct(r, null, null)));
  });
}
