/** ZIP STORE: photos are already compressed. Blob slices avoid inflating the whole archive. */
const encoder = new TextEncoder(),
  decoder = new TextDecoder();
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export async function sha256(blob: Blob) {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, '0')).join('');
}
export class LocalZipWriter {
  private chunks: BlobPart[] = [];
  private directory: BlobPart[] = [];
  private offset = 0;
  async add(path: string, blob: Blob) {
    const name = encoder.encode(path),
      bytes = new Uint8Array(await blob.arrayBuffer()),
      crc = crc32(bytes);
    const header = new Uint8Array(30 + name.length),
      v = new DataView(header.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, blob.size, true);
    v.setUint32(22, blob.size, true);
    v.setUint16(26, name.length, true);
    header.set(name, 30);
    const central = new Uint8Array(46 + name.length),
      c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x800, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, blob.size, true);
    c.setUint32(24, blob.size, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, this.offset, true);
    central.set(name, 46);
    this.chunks.push(header, blob);
    this.directory.push(central);
    this.offset += header.length + blob.size;
  }
  finish() {
    if (this.directory.length > 12000)
      throw new Error(
        'ZIP 항목 12,000개 한도를 초과합니다. 자료를 제외하지 않고 백업을 중단합니다.',
      );
    const size = this.directory.reduce<number>((n, x) => n + (x as Uint8Array).byteLength, 0),
      end = new Uint8Array(22),
      v = new DataView(end.buffer);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, this.directory.length, true);
    v.setUint16(10, this.directory.length, true);
    v.setUint32(12, size, true);
    v.setUint32(16, this.offset, true);
    return new Blob([...this.chunks, ...this.directory, end], { type: 'application/zip' });
  }
}
export async function readLocalZip(file: Blob): Promise<Map<string, Blob>> {
  if (file.size < 22 || file.size > 300 * 1024 * 1024)
    throw new Error('백업은 300MB 이하의 BKIT ZIP 파일이어야 합니다.');
  const end = new DataView(await file.slice(-22).arrayBuffer());
  if (
    end.getUint32(0, true) !== 0x06054b50 ||
    end.getUint16(20, true) !== 0 ||
    end.getUint16(4, true) !== 0 ||
    end.getUint16(6, true) !== 0
  )
    throw new Error('지원하지 않거나 손상된 ZIP입니다. BKIT 전체 백업 파일을 선택하세요.');
  const count = end.getUint16(10, true),
    start = end.getUint32(16, true),
    size = end.getUint32(12, true);
  if (count > 12000 || start + size !== file.size - 22)
    throw new Error('ZIP 목차가 손상되었습니다.');
  const dir = new Uint8Array(await file.slice(start, start + size).arrayBuffer()),
    v = new DataView(dir.buffer),
    files = new Map<string, Blob>();
  let pos = 0;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > dir.length || v.getUint32(pos, true) !== 0x02014b50)
      throw new Error('ZIP 항목이 손상되었습니다.');
    const len = v.getUint16(pos + 28, true),
      extra = v.getUint16(pos + 30, true),
      comment = v.getUint16(pos + 32, true),
      offset = v.getUint32(pos + 42, true),
      bytes = v.getUint32(pos + 24, true),
      packed = v.getUint32(pos + 20, true),
      name = decoder.decode(dir.slice(pos + 46, pos + 46 + len));
    if (
      v.getUint16(pos + 10, true) !== 0 ||
      v.getUint16(pos + 8, true) & 1 ||
      bytes !== packed ||
      bytes > 25 * 1024 * 1024 ||
      files.has(name) ||
      !/^((data\/(local|paper)\.json)|(manifest\.json)|(media\/(study|sleep|paper)\/[a-zA-Z0-9._-]+\.bin))$/.test(
        name,
      )
    )
      throw new Error('지원하지 않는 ZIP 항목 또는 중복 경로입니다.');
    const h = new DataView(await file.slice(offset, offset + 30).arrayBuffer());
    if (
      h.byteLength !== 30 ||
      h.getUint32(0, true) !== 0x04034b50 ||
      h.getUint16(8, true) !== 0 ||
      h.getUint32(18, true) !== packed ||
      h.getUint32(22, true) !== bytes ||
      h.getUint32(14, true) !== v.getUint32(pos + 16, true)
    )
      throw new Error('ZIP 파일 헤더가 손상되었습니다.');
    const nameBytes = new Uint8Array(
      await file.slice(offset + 30, offset + 30 + h.getUint16(26, true)).arrayBuffer(),
    );
    if (decoder.decode(nameBytes) !== name) throw new Error('ZIP 파일명이 일치하지 않습니다.');
    const begin = offset + 30 + h.getUint16(26, true) + h.getUint16(28, true);
    if (begin + bytes > start) throw new Error('ZIP 파일 범위가 손상되었습니다.');
    const blob = file.slice(begin, begin + bytes);
    if (crc32(new Uint8Array(await blob.arrayBuffer())) !== v.getUint32(pos + 16, true))
      throw new Error(`${name}: 무결성 검사 실패`);
    files.set(name, blob);
    pos += 46 + len + extra + comment;
  }
  if (pos !== dir.length) throw new Error('ZIP 목차 길이가 일치하지 않습니다.');
  return files;
}
