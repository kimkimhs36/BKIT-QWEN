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

it('adds restart checkpoints to existing credentials atomically and cannot restore a revoked login', async () => {
  const { loginRecord, saveLoginCheckpoint } = await import('../src/rememberLogin');
  const value = { token: 'bkit_sync_' + 'a'.repeat(64), expiresAt: Date.now() + 60000 };
  await rememberLogin(value);
  await saveLoginCheckpoint(value.token, { version: 3, digest: 'checkpoint' });
  expect((await loginRecord())?.checkpoint).toEqual({ version: 3, digest: 'checkpoint' });
  await forgetLogin();
  await saveLoginCheckpoint(value.token, { version: 4, digest: 'late-response' });
  expect(await loginRecord()).toBeNull();
});

it('a stale authentication failure cannot delete a newer saved credential', async () => {
  const old = 'bkit_sync_' + 'a'.repeat(64),
    next = 'bkit_sync_' + 'b'.repeat(64);
  await rememberLogin({ token: next, expiresAt: Date.now() + 60000 });
  await forgetLogin(old);
  expect((await savedLogin())?.token).toBe(next);
  await forgetLogin(next);
  expect(await savedLogin()).toBeNull();
});
