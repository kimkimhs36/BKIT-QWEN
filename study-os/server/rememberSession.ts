import { createHash, randomBytes } from 'node:crypto';
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const isStudySession = (token: string) => /^bkit_sync_[a-f0-9]{64}$/.test(token);
/** Only a hash is stored in Redis. Tokens grant sync access, never paid AI or Google APIs. */
export function rememberSessions(
  command: (args: string[]) => Promise<unknown>,
  owner: string,
  client: string,
) {
  const identity = createHash('sha256')
    .update(owner.trim().toLowerCase() + ':' + client)
    .digest('hex');
  const key = (token: string) =>
    'bkit:sync-session:v1:' + identity + ':' + createHash('sha256').update(token).digest('hex');
  return {
    async create() {
      const token = 'bkit_sync_' + randomBytes(32).toString('hex');
      const expiresAt = Date.now() + SESSION_SECONDS * 1000;
      if (
        (await command(['SET', key(token), String(expiresAt), 'EX', String(SESSION_SECONDS)])) !==
        'OK'
      )
        throw new Error('Session not saved');
      return { token, expiresAt };
    },
    async valid(token: string) {
      if (!isStudySession(token)) return false;
      const value = await command(['GET', key(token)]);
      return typeof value === 'string' && Number(value) > Date.now();
    },
    async revoke(token: string) {
      if (isStudySession(token)) await command(['DEL', key(token)]);
    },
  };
}
