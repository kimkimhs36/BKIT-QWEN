/**
 * Google OAuth access-token identity check for the private BKIT API.
 * Neither the spreadsheet token nor Google responses are persisted/logged.
 * Fail closed if the token cannot be verified.
 */
export async function verifyBkitOwner(
  accessToken: string,
  ownerEmail: string,
  clientId: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (
    !accessToken ||
    accessToken.length > 4096 ||
    !ownerEmail ||
    !clientId ||
    !clientId.endsWith('.apps.googleusercontent.com')
  )
    return false;
  try {
    const info = await fetcher(
      'https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(accessToken),
      { signal: AbortSignal.timeout(5000), cache: 'no-store' },
    );
    if (!info.ok) return false;
    const token: unknown = await info.json();
    if (!token || typeof token !== 'object') return false;
    const identity = token as Record<string, unknown>;
    if (identity.aud !== clientId && identity.azp !== clientId) return false;
    if (
      typeof identity.scope !== 'string' ||
      !identity.scope.split(/\s+/).includes('https://www.googleapis.com/auth/userinfo.email')
    )
      return false;

    const res = await fetcher('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + accessToken },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const person: unknown = await res.json();
    if (!person || typeof person !== 'object') return false;
    const user = person as Record<string, unknown>;
    return (
      user.email_verified === true &&
      typeof user.email === 'string' &&
      user.email.toLowerCase() === ownerEmail.toLowerCase().trim()
    );
  } catch {
    return false;
  }
}
