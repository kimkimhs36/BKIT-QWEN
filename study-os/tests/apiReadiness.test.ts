import { describe, expect, it } from 'vitest';
import { checkApiHealth } from '../src/apiReadiness';
const mock = (data: unknown, status = 200): typeof fetch =>
  async () => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
describe('safe read-only BKIT API check', () => {
  it('reports server capabilities without implying AI call or login succeeded', async () => {
    const result=await checkApiHealth('https://bkit-api.vercel.app',mock({
      service:'bkit-api',mode:'configured',model:'deepseek-flash',
      authConfigured:true,budgetConfigured:true,features:{briefing:true,plan:false,coach:false,assistant:false},
    }));
    expect(result.available).toBe(true);
    expect(result.briefingReady).toBe(true);
    expect(result.authConfigured).toBe(true);
    expect(result.model).toBe('deepseek-flash');
  });
  it('does not mistake a demo server for working AI', async ()=>{
    const result=await checkApiHealth('https://bkit-api.vercel.app',mock({
      service:'bkit-api',mode:'demo',features:{briefing:false},authConfigured:true,budgetConfigured:true,
    }));
    expect(result.available).toBe(true);
    expect(result.briefingReady).toBe(false);
  });
  it('fails closed on an unrelated or malformed API response',async ()=>{
    expect((await checkApiHealth('https://bkit-api.vercel.app',mock({ok:true}))).available).toBe(false);
    expect((await checkApiHealth('https://bkit-api.vercel.app',mock({service:'bkit-api',mode:'configured'},503))).available).toBe(false);
  });
  it('rejects non-HTTPS remote origins before any fetch',async ()=>{
    let calls=0;const fetcher:typeof fetch=async ()=>{calls++;return new Response('{}');};
    const result=await checkApiHealth('http://untrusted.example',fetcher);
    expect(result.available).toBe(false);
    expect(calls).toBe(0);
  });
  it('converts network timeouts into an actionable non-destructive status',async ()=>{
    const fetcher:typeof fetch=async ()=>{throw new Error('offline');};
    const result=await checkApiHealth('https://bkit-api.vercel.app',fetcher);
    expect(result.available).toBe(false);
    expect(result.reason).toContain('기존 과제 직접 입력');
  });
});
