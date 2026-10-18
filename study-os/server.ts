import express from 'express';
import { createPrivateApi } from './server/privateApi.js';
// Use JS specifiers for modules Vercel transpiles from TypeScript.
// No provider call or filesystem ledger runs at process startup.
const app = express();
app.use(createPrivateApi(process.env));
export default app;
