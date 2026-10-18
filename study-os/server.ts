import { createPrivateApi } from './server/privateApi.ts';
// Explicit source extensions allow Vercel to trace the actual TypeScript files.
// No provider call or filesystem ledger runs at process startup.
export default createPrivateApi(process.env);
