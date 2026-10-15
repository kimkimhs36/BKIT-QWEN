import express from 'express';

/**
 * BKIT Vercel API boot diagnostic.
 * Intentionally contains no provider imports, secrets or paid operations:
 * isolate startup problems before enabling user-authorized endpoints.
 * Google Sheets and GitHub Pages frontend are separate.
 */
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const origin = req.get('Origin');
  if (origin && origin !== 'https://teambkit.com') {
    res.status(403).json({error: 'Origin rejected'});
    return;
  }
  if (origin) {
    res.set('Access-Control-Allow-Origin', 'https://teambkit.com');
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});
app.get('/api/health', (_req, res) => {
  res.status(200).json({mode: 'demo', push: false, service: 'bkit-api', stage: 'boot-check'});
});
app.get('/', (_req, res) => {
  res.status(200).type('text/plain').send('BKIT private API (diagnostic mode)');
});
// No paid AI requests are enabled until authenticated production smoke checks pass.
app.use('/api', (_req, res) => {
  res.status(503).json({error: 'AI temporarily disabled while verifying server startup'});
});
export default app;
