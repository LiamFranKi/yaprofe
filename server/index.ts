import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { registerApiRoutes } from './apiRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || true,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

/** Raíz: confirma que el API está arriba (antes parecía "vacío" el puerto 4000) */
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'YaProFe API',
    health: '/api/health',
    note: 'El front (Vite) suele estar en :5173; este servidor es solo API.',
  });
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      ok: true,
      database: 'conectado',
      dbName: process.env.MYSQL_DATABASE || '(no definido en .env)',
    });
  } catch (e) {
    const err = e as Error;
    console.error('[health] MySQL:', err.message);
    res.status(500).json({
      ok: false,
      database: 'error',
      detail: err.message,
      hint: 'Revisa MYSQL_* y que MySQL este en marcha. La contrasena de root va en MYSQL_PASSWORD si aplica.',
    });
  }
});

const uploadsDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

registerApiRoutes(app);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`API YaProFe http://localhost:${PORT}`);
});
