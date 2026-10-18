import { useEffect, useRef, useState } from 'react';
import { getPhoto } from './atelierMedia';
import { readPhotoText } from './localOcr';

export function PhotoText({
  photoIds,
  disabled,
  onUse,
}: {
  photoIds: string[];
  disabled: boolean;
  onUse: (text: string, photoId: string) => void;
}) {
  const [choice, setChoice] = useState(photoIds[0]);
  const photoId = photoIds.includes(choice) ? choice : photoIds[0];
  const [result, setResult] = useState<{ photoId: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const operation = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      operation.current?.abort();
      operation.current = null;
    },
    [],
  );

  async function recognize() {
    if (operation.current || disabled) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setResult(null);
    const timer = window.setTimeout(() => {
      controller.abort();
      setBusy(false);
      setMessage('');
      setError('글자 읽기가 오래 걸리고 있어요. 잠시 뒤 다시 시도하거나 직접 입력해 주세요.');
    }, 90000);
    try {
      const photo = await getPhoto(photoId);
      if (!photo) throw new Error('사진을 찾지 못했어요. 원본을 다시 첨부해 주세요.');
      const text = await readPhotoText(photo.blob, controller.signal, setMessage);
      if (controller.signal.aborted) return;
      if (!text) throw new Error('글자를 찾지 못했어요. 밝고 선명하게 찍거나 직접 입력해 주세요.');
      setResult({ photoId, text: text.slice(0, 3000) });
      setMessage(
        text.length > 3000
          ? '앞 3,000자만 가져왔어요. 필요한 과제만 남겨 주세요.'
          : '읽은 글자를 확인해 주세요. 아직 BKIT에 저장하지 않았어요.',
      );
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(
          e instanceof Error
            ? e.message
            : '글자를 읽지 못했어요. 인터넷 연결을 확인하거나 직접 입력해 주세요.',
        );
        setMessage('');
      }
    } finally {
      clearTimeout(timer);
      if (operation.current === controller) {
        operation.current = null;
        setBusy(false);
      }
    }
  }
  function cancel() {
    operation.current?.abort();
    // Keep the operation ref until its worker has stopped. Repeated taps cannot
    // create concurrent recognition workers during engine initialization.
    setBusy(false);
    setMessage('글자 읽기를 취소했어요. 사진과 작성한 과제는 그대로예요.');
  }
  const text = result?.photoId === photoId ? result.text : '';
  return (
    <details className="photo-text">
      <summary>사진에서 글자 가져오기 · 선택</summary>
      <p>
        선명한 한글·영어 인쇄물을 이 기기에서 읽어요. 사진은 전송하지 않아요. 처음 사용할 때 약 8MB
        도구를 내려받습니다.
      </p>
      <label>
        읽을 사진
        <select
          aria-label="글자를 읽을 사진"
          value={photoId}
          disabled={busy || disabled}
          onChange={(e) => {
            setChoice(e.target.value);
            setResult(null);
            setMessage('');
            setError('');
          }}
        >
          {photoIds.map((id, i) => (
            <option key={id} value={id}>
              자료 {i + 1}
            </option>
          ))}
        </select>
      </label>
      <div className="photo-text-actions">
        <button type="button" disabled={busy || disabled} onClick={() => void recognize()}>
          {busy ? '글자 읽는 중…' : '이 사진 글자 읽기'}
        </button>
        {busy && (
          <button type="button" onClick={cancel}>
            취소
          </button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="atelier-error" role="alert">
          {error}
        </p>
      )}
      {result?.photoId === photoId && (
        <>
          <label>
            읽은 글자 · 과제마다 한 줄로 정리
            <textarea
              aria-label="사진에서 읽은 글자"
              rows={7}
              maxLength={3000}
              value={text}
              onChange={(e) => setResult({ photoId, text: e.target.value })}
            />
          </label>
          <p>
            손글씨·수식·표는 잘못 읽을 수 있어요. 과목과 마감은 다음 화면에서 직접 확인해 주세요.
          </p>
          <button
            type="button"
            disabled={disabled || busy || !text.trim()}
            onClick={() => {
              try {
                onUse(text.trim(), photoId);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            이 내용으로 과제 확인
          </button>
        </>
      )}
    </details>
  );
}
