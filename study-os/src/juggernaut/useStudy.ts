import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import {
  legacyDocumentSchema,
  partitionDocument,
  mergeDocuments,
  readDocument,
  saveDocument,
  type StudyDocument,
} from './engine';
const remoteSchema = z.object({
  version: z.number().int().nonnegative(),
  document: legacyDocumentSchema.nullable(),
});
export type Transport = (init?: RequestInit) => Promise<Response>;
export function useStudy(request: Transport, connected: boolean) {
  const [initial] = useState(() => readDocument(localStorage));
  const [document, setDocument] = useState(initial.document),
    [error, setError] = useState(initial.error);
  const [status, setStatus] = useState('기기에 저장됨'),
    [detail, setDetail] = useState('기기 보관 · 새 문자식 기록은 클라우드 연결 대상이 아닙니다.');
  const current = useRef(document),
    transport = useRef(request),
    available = useRef(connected),
    blocked = useRef(!!initial.error),
    busy = useRef(false),
    alive = useRef(true),
    generation = useRef(0);
  const unsaved = useRef(false);
  current.current = document;
  transport.current = request;
  available.current = connected;
  const save = (next: StudyDocument) => {
    if (blocked.current) return false;
    setStatus('저장 중');
    try {
      const persisted = saveDocument(localStorage, next);
      current.current = persisted;
      setDocument(persisted);
      unsaved.current = false;
      setStatus('기기에 저장됨');
      setDetail(
        available.current
          ? '서버 저장 확인 대기 · 기기 원본 유지'
          : '본인 계정 연결 전 · 기기 원본 유지',
      );
      setError('');
      return true;
    } catch {
      current.current = next;
      setDocument(next);
      unsaved.current = true;
      setError(
        '저장에 실패했어요. 입력한 화면은 유지돼요. 공간을 확보한 뒤 다시 시도하거나 현재 화면 내보내기를 이용하세요.',
      );
      setStatus('기기 저장 실패');
      return false;
    }
  };
  async function sync() {
    if (busy.current || blocked.current || unsaved.current || !available.current) return;
    if (!navigator.onLine) {
      setStatus('기기에 저장됨');
      setDetail('오프라인 · 연결되면 자동 동기화합니다.');
      return;
    }
    busy.current = true;
    const epoch = generation.current;
    const valid = () => alive.current && epoch === generation.current && available.current;
    setStatus('저장 중');
    try {
      // CAS conflicts retry a bounded number of times. No last-writer snapshot overwrite.
      for (let i = 0; i < 3; i++) {
        const response = await transport.current();
        if (!valid()) return;
        if (!response.ok)
          throw Error(
            response.status === 401
              ? '로그인이 만료되었어요. BKIT 설정에서 다시 연결해 주세요.'
              : `클라우드 읽기 실패 (${response.status})`,
          );
        const remote = remoteSchema.parse(await response.json());
        if (!valid()) return;
        const merged = remote.document
          ? mergeDocuments(current.current, remote.document)
          : current.current;
        if (!save(merged)) throw Error('받은 기록의 기기 저장을 확인하지 못했어요.');
        const legacy = partitionDocument(merged).legacy;
        const sent = JSON.stringify(legacy);
        const write = await transport.current({
          method: 'PUT',
          body: JSON.stringify({ expectedVersion: remote.version, document: legacy }),
        });
        if (!valid()) return;
        if (write.status === 409) continue;
        if (!write.ok)
          throw Error(
            write.status === 401
              ? '로그인이 만료되었어요. 기기 기록은 유지됩니다.'
              : `클라우드 쓰기 실패 (${write.status})`,
          );
        const ack = z.object({ version: z.number().int().positive() }).parse(await write.json());
        if (!valid()) return;
        if (JSON.stringify(partitionDocument(current.current).legacy) === sent) {
          setStatus(
            partitionDocument(current.current).extension.attempts.length ||
              partitionDocument(current.current).extension.sessions.length
              ? '기존 기록 서버 저장 · 새 기록 기기 보관'
              : '서버에 저장됨',
          );
          setDetail(`기존 문항 서버 확인 버전 ${ack.version} · 새 문자식 기록은 기기에만 보관`);
        } else {
          setStatus('기기에 저장됨');
          setDetail('새 변경사항을 다음 동기화에 보냅니다.');
        }
        return;
      }
      throw Error('다른 기기와 동기화가 겹쳤어요. 잠시 후 다시 시도해 주세요.');
    } catch (e) {
      if (valid()) {
        setStatus('동기화 실패');
        setDetail(
          e instanceof Error ? e.message : '서버 응답을 확인하지 못했어요. 기기 기록은 유지됩니다.',
        );
      }
    } finally {
      busy.current = false;
    }
  }
  const syncRef = useRef(sync);
  syncRef.current = sync;
  useEffect(() => {
    alive.current = true;
    const reload = (e: StorageEvent) => {
      if (e.key?.startsWith('bkit.juggernaut.')) {
        const read = readDocument(localStorage);
        if (read.error) {
          blocked.current = true;
          setError(read.error);
        } else {
          const merged = mergeDocuments(current.current, read.document);
          current.current = merged;
          setDocument(merged);
          setStatus('기기에 저장됨');
        }
      }
    };
    const online = () => void syncRef.current();
    const offline = () => {
      generation.current++;
      setStatus('기기에 저장됨');
      setDetail('오프라인 · 기기 원본 유지');
    };
    window.addEventListener('storage', reload);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    const timer = setInterval(online, 30000);
    return () => {
      alive.current = false;
      generation.current++;
      clearInterval(timer);
      window.removeEventListener('storage', reload);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);
  useEffect(() => {
    generation.current++;
    if (!connected) {
      setStatus('기기에 저장됨');
      setDetail('서버 저장은 BKIT 본인 계정 연결 후 확인합니다.');
    }
  }, [connected]);
  // Do not retry endlessly when a failed response merely changes status.
  const signature = JSON.stringify(document);
  useEffect(() => {
    if (!connected) return;
    const timer = setTimeout(() => void syncRef.current(), 1800);
    return () => clearTimeout(timer);
  }, [signature, connected]);
  return { document, save, error, status, detail, sync, blocked: blocked.current };
}
