import express from 'express';
import { createApp } from './server/app';
import { verifyBkitOwner } from './server/auth';
import { OpenAICompatibleAdapter } from './server/provider';
import { Budget } from './server/budget';

/**
 * Isolated Vercel API. No AI provider is enabled until the server has
 * real authentication and a durable, enforceable spending limit.
 */
const app = express();

const allowedOrigin = 'https://teambkit.com';
// Paid calls remain OFF until the owner explicitly enables them.
// Prepaid DeepSeek balance is the only global spending boundary at present;
// /tmp serverless request ledgers are deliberately NOT a reliable global cap.
const live = process.env.BKIT_AI_LIVE === 'true' && !!process.env.AI_API_KEY;
const model = 'deepseek-flash';
const adapter = live ? new OpenAICompatibleAdapter({
  baseURL: 'https://api.deepseek.com',
  model,
  apiKey: process.env.AI_API_KEY!,
}) : undefined;
const budget = adapter
  ? new Budget('/tmp/bkit-ai-usage', 8, 0.025)
  : undefined;

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
  adapter,
  budget,
  // Conservative peak-hour pricing for 2026 DeepSeek-V4.1 Flash.
  inputRate: 0.30,
  outputRate: 1.20,
}));
export default app;
