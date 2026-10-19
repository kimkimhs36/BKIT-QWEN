import { z } from 'zod';
import { documentSchema, type PaperDocument } from './paperModel';
import {
  paperSnapshot,
  listPaperDocuments,
  restorePaperSnapshot,
  rollbackPaperSnapshot,
  type PaperFile,
} from './paperStorage';
import { LocalZipWriter, sha256 } from './localZip';
import { uid } from './model';
export const paperManifestSchema = z.object({
  path: z.literal('data/paper.json'),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  originals: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        path: z.string().regex(/^media\/paper\/[0-9]+\.bin$/),
        size: z
          .number()
          .int()
          .positive()
          .max(20 * 1024 * 1024),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .max(1000),
});
export type PaperManifest = z.infer<typeof paperManifestSchema>;
const indexSchema = z.object({
  version: z.literal(1),
  documents: z.array(documentSchema).max(1000),
});
export async function exportPaperBackup(writer: LocalZipWriter, remaining: number) {
  const snapshot = await paperSnapshot();
  const manifest: PaperManifest = { path: 'data/paper.json', sha256: '', originals: [] };
  let size = 0;
  for (const f of snapshot.files) {
    const blob = new Blob([f.bytes]);
    size += blob.size;
    if (size > remaining || blob.size > 20 * 1024 * 1024)
      throw new Error(
        'PDF·사진 원본 합계 250MB 한도를 초과합니다. 자료를 제외하지 않고 백업을 중단합니다.',
      );
    const meta = {
      id: f.id,
      path: `media/paper/${manifest.originals.length}.bin`,
      size: blob.size,
      sha256: await sha256(blob),
    };
    manifest.originals.push(meta);
    await writer.add(meta.path, blob);
  }
  for (const d of snapshot.documents) {
    const f = manifest.originals.find((f) => f.id === d.fileId);
    if (!f || f.sha256 !== d.digest || f.size !== d.size)
      throw new Error(d.name + ': PDF·사진 원본 누락 또는 손상');
  }
  const data = new Blob([
    JSON.stringify(indexSchema.parse({ version: 1, documents: snapshot.documents })),
  ]);
  if (data.size > 20 * 1024 * 1024)
    throw new Error(
      '필기 메타데이터가 20MB 한도를 초과합니다. 필기를 제외하지 않고 백업을 중단합니다.',
    );
  manifest.sha256 = await sha256(data);
  await writer.add(manifest.path, data);
  return { manifest, baseline: snapshot.documents };
}
export async function assertPaperUnchanged(baseline: PaperDocument[]) {
  if (JSON.stringify(await listPaperDocuments()) !== JSON.stringify(baseline))
    throw new Error('백업 작업 중 PDF·필기가 바뀌었습니다. 다시 시도하세요.');
}
export type InspectedPaper = {
  documents: PaperDocument[];
  files: PaperFile[];
  baseline: PaperDocument[];
  conflicts: string[];
};
export async function inspectPaperBackup(
  manifest: PaperManifest | undefined,
  files: Map<string, Blob>,
): Promise<InspectedPaper> {
  const baseline = await listPaperDocuments();
  if (!manifest) return { documents: [], files: [], baseline, conflicts: [] };
  const data = files.get(manifest.path);
  if (!data || data.size > 20 * 1024 * 1024 || (await sha256(data)) !== manifest.sha256)
    throw new Error('필기 데이터 누락 또는 무결성 검사 실패');
  const { documents } = indexSchema.parse(JSON.parse(await data.text()));
  if (new Set(documents.map((d) => d.id)).size !== documents.length)
    throw new Error('문서 ID 중복');
  const originals: PaperFile[] = [],
    ids = new Set<string>(),
    paths = new Set<string>();
  for (const f of manifest.originals) {
    const blob = files.get(f.path);
    if (
      ids.has(f.id) ||
      paths.has(f.path) ||
      !blob ||
      blob.size !== f.size ||
      (await sha256(blob)) !== f.sha256
    )
      throw new Error('PDF 원본 누락·중복 또는 무결성 검사 실패');
    ids.add(f.id);
    paths.add(f.path);
    originals.push({ id: f.id, bytes: await blob.arrayBuffer() });
  }
  for (const d of documents) {
    const f = manifest.originals.find((f) => f.id === d.fileId);
    if (!f || d.digest !== f.sha256 || d.size !== f.size) throw new Error('문서 원본 연결 불일치');
  }
  return {
    documents,
    files: originals,
    baseline,
    conflicts: documents
      .filter((d) => baseline.some((b) => b.id === d.id))
      .map((d) => 'PDF·필기: ' + d.name),
  };
}
export async function restoreInspectedPaper(
  paper: InspectedPaper,
  mode: 'merge' | 'replace',
  journal: string,
) {
  const existing = await paperSnapshot(),
    remap = new Map<string, string>();
  for (const f of paper.files) {
    const old = existing.files.find((x) => x.id === f.id);
    if (old && (await sha256(new Blob([old.bytes]))) !== (await sha256(new Blob([f.bytes]))))
      remap.set(f.id, uid());
  }
  const docs = paper.documents.map((d) => ({
    ...d,
    fileId: remap.get(d.fileId) ?? d.fileId,
    revision:
      Math.max(d.revision, existing.documents.find((x) => x.id === d.id)?.revision ?? 0) + 1,
  }));
  await restorePaperSnapshot(
    docs,
    paper.files.map((f) => ({ ...f, id: remap.get(f.id) ?? f.id })),
    paper.baseline,
    mode,
    journal,
  );
  return () =>
    rollbackPaperSnapshot(
      journal,
      docs.filter((d) => mode === 'replace' || !paper.baseline.some((b) => b.id === d.id)),
    );
}
