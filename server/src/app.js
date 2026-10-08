import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';
import { loadData } from './db.js';
import productsRouter from './routes/products.js';
import billsRouter from './routes/bills.js';
import dashboardRouter from './routes/dashboard.js';

const app = express();
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5180').split(',').map((s) => s.trim());
const isSameOrigin = (req, origin) => {
  try {
    return new URL(origin).host === (req.headers['x-forwarded-host'] || req.headers.host);
  } catch {
    return false;
  }
};
app.use(cors((req, callback) => {
  const origin = req.headers.origin;
  if (!origin || origins.includes('*') || origins.includes(origin) || isSameOrigin(req, origin)) {
    return callback(null, { origin: true });
  }
  return callback(new Error('Origin is not allowed by CORS'));
}));
app.use(express.json({ limit: '1mb' }));
app.use(async (_req, _res, next) => {
  try { await loadData(); next(); } catch (error) { next(error); }
});
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'jms-textiles-billing-api' }));
app.post('/api/auth/login', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const expectedUser = process.env.ADMIN_USERNAME || 'Admin';
  const expectedPass = process.env.ADMIN_PASSWORD || 'Admin123';
  const secret = process.env.JWT_SECRET || '';
  const safeEqual = (a, b) => {
    const left = Buffer.from(String(a)); const right = Buffer.from(String(b));
    return left.length === right.length && timingSafeEqual(left, right);
  };
  if (!expectedUser || !expectedPass || secret.length < 32) {
    return res.status(503).json({ message: 'Admin login is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and a 32+ character JWT_SECRET.' });
  }
  if (!safeEqual(username, expectedUser) || !safeEqual(password, expectedPass)) {
    return res.status(401).json({ message: 'Username or password is incorrect.' });
  }
  return res.json({ token: jwt.sign({ sub: expectedUser }, secret, { expiresIn: '12h' }) });
});
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/auth/login') return next();
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT secret is not configured');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Sign in again.' });
  }
});
app.use('/api/products', productsRouter);
app.use('/api/bills', billsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));
app.use((error, _req, res, _next) => {
  if (!error.status || error.status >= 500) console.error(error);
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Server error. Check the API logs.' });
});

export default app;
