import { describe, expect, it } from 'vitest';
import { randomLocalId } from '../src/randomLocalId';
import { uid } from '../src/model';

describe('HTTP LAN UUID fallback', () => {
  it('creates cryptographically random RFC 4122 version 4 IDs without randomUUID', () => {
    const fallback = { getRandomValues: crypto.getRandomValues.bind(crypto) };
    const ids = Array.from({ length: 100 }, () => randomLocalId(fallback));
    expect(new Set(ids).size).toBe(100);
    for (const id of ids)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('uses native randomUUID when supported and preserves the existing ID format', () => {
    const native = '11111111-2222-4333-8444-555555555555';
    expect(randomLocalId({ getRandomValues: crypto.getRandomValues.bind(crypto), randomUUID: () => native })).toBe(native);
    expect(uid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
