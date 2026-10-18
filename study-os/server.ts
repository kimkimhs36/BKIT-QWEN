import express from 'express';
import { createPrivateApi } from './server/privateApi.ts';
// Explicit source extensions allow Vercel to trace the actual TypeScript files.
// No provider call or filesystem ledger runs at process startup.
const app = express();
app.use(createPrivateApi(process.env));
export default app;
