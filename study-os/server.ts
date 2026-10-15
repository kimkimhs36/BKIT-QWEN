import express from 'express';
import { createApp } from './server/app';
import { verifyBkitOwner } from './server/auth';

/**
 * Isolated Vercel API. No AI provider is enabled until the server has
 * real authentication and a durable, enforceable spending limit.
 */
const app = express();
const allowedOrigin = 'https://teambkit.com';
app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && origin !== allowedOrigin) {
    res.status(403).json({ error: 'Origin rejected' });
    return;
  }
  if (origin === allowedOrigin) {
    res.set('Access-Control-Allow-Origin', allowedOrigin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});
app.use('/api', async (req, res, next) => {
  if (req.path === '/health' && req.method === 'GET') {
    next();
    return;
  }
  const ownerEmail = process.env.BKIT_OWNER_EMAIL || '';
  const clientId = process.env.BKIT_GOOGLE_CLIENT_ID || '';
  if (!ownerEmail || !clientId) {
    res.status(503).json({ error: 'Private API authentication not configured' });
    return;
  }
  const header = req.get('Authorization') || '';
  const match = /^Bearer ([^\s]+)$/.exec(header);
  if (!match || !(await verifyBkitOwner(match[1], ownerEmail, clientId))) {
    res.status(401).json({ error: 'Google sign-in required' });
    return;
  }
  next();
});
app.use(createApp({
  origins: [allowedOrigin],
  inputRate: 0,
  outputRate: 0,
}));
export default app;
