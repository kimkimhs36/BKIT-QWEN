import { beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { savedLogin, rememberLogin, forgetLogin } from '../src/rememberLogin';
vi.stubGlobal('indexedDB', indexedDB);
describe('remembered login isolation', () => {
  beforeEach(async () => {
    await forgetLogin();
  });
  it('survives another read and deletes only the credential on logout', async () => {
    const value = { token: 'bkit_sync_' + 'a'.repeat(64), expiresAt: Date.now() + 60000 };
    await rememberLogin(value);
    expect(await savedLogin()).toEqual(value);
    await forgetLogin();
    expect(await savedLogin()).toBeNull();
  });
  it('does not restore expired or malformed credentials', async () => {
    await rememberLogin({ token: 'bkit_sync_' + 'a'.repeat(64), expiresAt: Date.now() - 1 });
    expect(await savedLogin()).toBeNull();
    await rememberLogin({
      token: 'google-token-must-not-be-persisted',
      expiresAt: Date.now() + 60000,
    });
    expect(await savedLogin()).toBeNull();
  });
});
