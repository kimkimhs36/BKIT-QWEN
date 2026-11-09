/**
 * Browser-local UUIDv4 IDs, including HTTP LAN previews where randomUUID is
 * unavailable because it requires a secure context. Never use Math.random.
 */
export function randomLocalId(
  source: Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>> = globalThis.crypto,
): string {
  if (typeof source.randomUUID === 'function') return source.randomUUID();
  const bytes = new Uint8Array(16);
  source.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (n) => n.toString(16).padStart(2, '0')).join('');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join('-');
}
