import 'dotenv/config';
import { createApp } from './app';
import { OpenAICompatibleAdapter } from './provider';
import { Budget } from './budget';
const inputRate = Number(process.env.AI_INPUT_USD_PER_MILLION || 0),
  outputRate = Number(process.env.AI_OUTPUT_USD_PER_MILLION || 0);
const ready =
  !!process.env.AI_API_KEY &&
  Number.isFinite(inputRate) &&
  inputRate > 0 &&
  Number.isFinite(outputRate) &&
  outputRate > 0;
const adapter = ready
  ? new OpenAICompatibleAdapter({
      apiKey: process.env.AI_API_KEY!,
      baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1/',
      model: process.env.AI_MODEL || 'gpt-4.1-mini',
    })
  : undefined;
const calls = Number(process.env.AI_DAILY_CALL_LIMIT || 10),
  dollars = Number(process.env.AI_DAILY_USD_LIMIT || 0.1);
if (!Number.isInteger(calls) || calls < 1 || !Number.isFinite(dollars) || dollars <= 0)
  throw new Error('Invalid budget configuration');
const app = createApp({
  adapter,
  budget: adapter ? new Budget(process.env.AI_USAGE_DIR || '.runtime', calls, dollars) : undefined,
  inputRate,
  outputRate,
  origins: (
    process.env.APP_ORIGINS ||
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173'
  ).split(','),
});
app.listen(Number(process.env.PORT || 8787), '127.0.0.1', () =>
  console.log(
    `BKIT API: localhost:${process.env.PORT || 8787} · ${ready ? 'provider configured' : 'DEMO, no provider calls'} · Web Push not implemented`,
  ),
);
