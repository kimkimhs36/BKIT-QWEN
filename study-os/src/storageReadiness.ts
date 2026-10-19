import { sha256 } from './localZip';
import { listPaperDocuments, readPaperFile } from './paperStorage';
import { photoIds } from './photoVault';
import { readSleep } from './sleep';
import { readState } from './storage';

export type StorageAuditFinding = { level: 'error' | 'warning'; message: string };
export type StorageAudit = {
  checkedAt: string;
  tasks: number;
  problems: number;
  paperDocuments: number;
  paperPages: number;
  strokes: number;
  studyPhotos: number;
  sleepPhotos: number;
  verifiedOriginals: number;
  findings: StorageAuditFinding[];
};

/** A manually triggered, read-mostly integrity check; never rewrites user study records. */
export async function auditStudyStorage(
  storage: Storage,
  onProgress: (message: string) => void = () => {},
): Promise<StorageAudit> {
  const findings: StorageAuditFinding[] = [];
  const error = (message: string) => findings.push({ level: 'error', message });
  const warning = (message: string) => findings.push({ level: 'warning', message });

  // Probe only a disposable key; a success does not guarantee all future saves.
  const probeKey = 'bkit-storage-write-probe-' + crypto.randomUUID();
  try {
    storage.setItem(probeKey, probeKey);
    if (storage.getItem(probeKey) !== probeKey)
      error('브라우저의 임시 저장값을 다시 읽지 못했습니다.');
  } catch {
    error('브라우저의 로컬 저장 쓰기가 실패했습니다. 저장 공간과 개인 정보 보호 설정을 확인하세요.');
  } finally {
    try {
      storage.removeItem(probeKey);
    } catch {
      warning('임시 저장 검사용 항목을 삭제하지 못했습니다.');
    }
  }

  const study = readState(storage);
  const sleep = readSleep(storage);
  if (study.error) error('학습 기록을 읽거나 검증하지 못했습니다. 기존 원본을 덮어쓰지 마세요.');
  if (sleep.error) error('수면 기록을 읽거나 검증하지 못했습니다. 기존 원본을 덮어쓰지 마세요.');

  let studyPhotoSet = new Set<string>();
  let sleepPhotoSet = new Set<string>();
  try {
    studyPhotoSet = new Set(await photoIds('study'));
  } catch {
    error('학습지 사진 보관함을 읽을 수 없습니다.');
  }
  try {
    sleepPhotoSet = new Set(await photoIds('sleep'));
  } catch {
    error('수면 사진 보관함을 읽을 수 없습니다.');
  }
  const requiredStudy = new Set<string>();
  const requiredSleep = new Set<string>();
  for (const task of study.state.tasks) for (const id of task.attachmentIds ?? []) requiredStudy.add(id);
  for (const resource of study.state.learning?.resources ?? [])
    for (const id of resource.linkedMediaIds) requiredStudy.add(id);
  for (const problem of study.state.learning?.problems ?? [])
    if (problem.mediaId) requiredStudy.add(problem.mediaId);
  for (const record of sleep.state.records)
    for (const id of record.photoIds) requiredSleep.add(id);
  try {
    const landscape = storage.getItem('bkit.landscape.v1');
    if (landscape) requiredStudy.add(landscape);
    const draftRaw = storage.getItem('bkit.atelier.draft.v1');
    if (draftRaw) {
      const draft = JSON.parse(draftRaw) as { attachmentIds?: unknown };
      if (Array.isArray(draft.attachmentIds))
        for (const id of draft.attachmentIds)
          if (typeof id === 'string') requiredStudy.add(id);
    }
  } catch {
    warning('초안 또는 개인 배경의 사진 참조를 확인하지 못했습니다.');
  }
  const missingStudy = [...requiredStudy].filter((id) => !studyPhotoSet.has(id));
  const missingSleep = [...requiredSleep].filter((id) => !sleepPhotoSet.has(id));
  if (missingStudy.length) error('연결된 학습 사진 원본 ' + missingStudy.length + '개를 찾을 수 없습니다.');
  if (missingSleep.length) error('연결된 수면 사진 원본 ' + missingSleep.length + '개를 찾을 수 없습니다.');

  let documents: Awaited<ReturnType<typeof listPaperDocuments>> = [];
  try {
    documents = await listPaperDocuments();
  } catch {
    error('PDF·필기 보관함 또는 문서 스키마를 읽지 못했습니다.');
  }
  const resourceIds = new Set((study.state.learning?.resources ?? []).map((r) => r.id));
  const originalById = new Map<string, { digest: string; size: number }>();
  for (const document of documents) {
    if (document.resourceId && !resourceIds.has(document.resourceId))
      warning(document.name + ': 연결된 학습 자료를 찾을 수 없습니다.');
    const previous = originalById.get(document.fileId);
    if (previous) {
      if (previous.digest !== document.digest || previous.size !== document.size)
        error(document.name + ': 동일 원본 ID의 크기 또는 체크섬이 충돌합니다.');
      continue;
    }
    onProgress('원본 PDF·사진 검사 중 · ' + (originalById.size + 1) + '/' + documents.length);
    try {
      const bytes = await readPaperFile(document.fileId);
      if (bytes.byteLength !== document.size ||
          (await sha256(new Blob([bytes]))) !== document.digest)
        error(document.name + ': 원본 크기 또는 SHA-256 검사가 실패했습니다.');
      else originalById.set(document.fileId, { digest: document.digest, size: document.size });
    } catch {
      error(document.name + ': PDF·사진 원본이 없거나 읽을 수 없습니다.');
    }
  }

  if (!findings.length)
    warning('현재 기기 안의 검사에서는 문제를 찾지 못했습니다. 외부 ZIP 백업·실기기 저장 보장은 별도입니다.');

  return {
    checkedAt: new Date().toISOString(),
    tasks: study.state.tasks.length,
    problems: study.state.learning?.problems.length ?? 0,
    paperDocuments: documents.length,
    paperPages: documents.reduce((total, d) => total + d.pages.length, 0),
    strokes: documents.reduce(
      (total, d) => total + d.layers.reduce((n, l) => n + l.strokes.length, 0), 0,
    ),
    studyPhotos: studyPhotoSet.size,
    sleepPhotos: sleepPhotoSet.size,
    verifiedOriginals: originalById.size,
    findings,
  };
}
