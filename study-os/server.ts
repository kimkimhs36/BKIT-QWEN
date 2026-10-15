import express from 'express';
import { createApp } from './server/app';

/**
 * Dedicated Vercel API entrypoint for BKIT.
 * Paid AI endpoints stay disabled until authenticated requests, durable
 * spending limits and server-side credentials have been configured.
 * The existing GitHub Pages frontend is deployed separately.
 */
const app = express();
app.use(createApp({
  origins: ['https://teambkit.com'],
  inputRate: 0,
  outputRate: 0,
}));
export default app;
