import { describe, expect, it, vi } from 'vitest';
import { verifyBkitOwner } from '../server/auth';
const ID = '1234567890-abcdefgh.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/spreadsheets';
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function makeFetch(scope=SCOPE, aud=ID, email='owner@example.com', verified=true) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).includes('tokeninfo')) return response({aud,scope,expires_in:300});
    if (String(url).includes('userinfo')) {
      if (init?.headers && (init.headers as Record<string,string>).Authorization !== 'Bearer test-token')
        throw Error('Missing bearer token');
      return response({email,email_verified:verified});
    }
    return response({},404);
  }) as unknown as typeof fetch;
}
describe('owner-only API authentication', () => {
  it('accepts a verified Google account with the expected client id', async () => {
    expect(await verifyBkitOwner('test-token','owner@example.com',ID,makeFetch())).toBe(true);
  });
  it('rejects other identities, other OAuth clients and missing scope', async () => {
    expect(await verifyBkitOwner('test-token','owner@example.com',ID,makeFetch(SCOPE,ID,'other@example.com'))).toBe(false);
    expect(await verifyBkitOwner('test-token','owner@example.com',ID,makeFetch(SCOPE,ID,'owner@example.com',false))).toBe(false);
    expect(await verifyBkitOwner('test-token','owner@example.com',ID,makeFetch(SCOPE,'unrelated-client'))).toBe(false);
    expect(await verifyBkitOwner('test-token','owner@example.com',ID,makeFetch('https://www.googleapis.com/auth/spreadsheets'))).toBe(false);
    expect(await verifyBkitOwner('','owner@example.com',ID,makeFetch())).toBe(false);
  });
  it('fails closed on Google outages', async () => {
    const failed=vi.fn(async () => { throw Error('offline'); }) as unknown as typeof fetch;
    expect(await verifyBkitOwner('test-token','owner@example.com',ID,failed)).toBe(false);
  });
});
