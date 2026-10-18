import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { API_URL } from './ai';
import { authorizeGoogleIdentity, prepareGoogleIdentity } from './cloudClient';
import { createMission, type Mission } from './atelier';

const responseSchema = z.object({
  mode: z.literal('live'),
  missions: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        subject: z.string().max(200),
        kind: z.enum(['숙제', '수행평가', '시험공부', '개인 일정']),
        due: z
          .string()
          .regex(/^20\d{2}-\d{2}-\d{2}$/)
          .nullable(),
        dueTime: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .nullable(),
        quantityUnit: z.enum(['problems', 'pages', 'passages', 'chapters']).nullable(),
        quantityTotal: z.number().int().min(1).max(10000).nullable(),
        minutes: z.number().int().min(1).max(480).nullable(),
      }),
    )
    .min(1)
    .max(20),
});

export function BriefingAI({
  text,
  photoIds,
  disabled,
  existing,
  onUse,
}: {
  text: string;
  photoIds: string[];
  disabled: boolean;
  existing: boolean;
  onUse: (missions: Mission[]) => void;
}) {
  const [clientId, setClientId] = useState('');
  const [enabled, setEnabled] = useState(false),
    [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const operation = useRef(false),
    token = useRef('');
  const submitted = useRef('');
  const latestText = useRef(text);
  latestText.current = text;
  const alive = useRef(true),
    request = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.abort();
      token.current = '';
    };
  }, []);
  async function prepare() {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setMessage('AI 연결 상태를 확인하고 있어요…');
    try {
      const res = await fetch(API_URL + '/api/config', {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok)
        throw new Error('AI 서버에 연결하지 못했어요. 직접 정리는 계속 사용할 수 있어요.');
      const config = z
        .object({ googleClientId: z.string(), briefingEnabled: z.boolean() })
        .parse(await res.json());
      if (!alive.current) return;
      setEnabled(config.briefingEnabled);
      setClientId(config.googleClientId);
      if (config.briefingEnabled && config.googleClientId) {
        await prepareGoogleIdentity();
        if (alive.current) setMessage('Google 계정을 연결한 뒤 정리할 수 있어요.');
      } else
        setMessage(
          'AI 서버 연결을 준비하고 있어요. 직접 정리나 사진 글자 가져오기는 바로 사용할 수 있어요.',
        );
    } catch (e) {
      if (!alive.current) return;
      setEnabled(false);
      setMessage(e instanceof Error ? e.message : '연결을 확인하지 못했어요.');
    } finally {
      operation.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function signIn() {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    try {
      // The popup opens synchronously from this tap, including on Safari.
      const connectedToken = await authorizeGoogleIdentity(clientId);
      if (!alive.current) return;
      token.current = connectedToken;
      setSignedIn(true);
      setMessage('연결됐어요. 아래 버튼을 누를 때만 입력한 글자를 보냅니다.');
    } catch (e) {
      if (!alive.current) return;
      setMessage(e instanceof Error ? e.message : 'Google 연결을 확인해 주세요.');
    } finally {
      operation.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function analyze() {
    if (operation.current || disabled || existing || !text.trim() || !token.current) return;
    operation.current = true;
    setBusy(true);
    setMessage('할 일을 정리하고 있어요…');
    submitted.current = text;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(API_URL + '/api/briefing', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token.current, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: submitted.current }),
        signal: controller.signal,
      });
      const body = await res.json();
      if (!alive.current) return;
      if (latestText.current !== submitted.current)
        throw new Error('입력 내용이 바뀌었어요. 새 내용으로 다시 정리해 주세요.');
      if (res.status === 401) {
        token.current = '';
        setSignedIn(false);
        throw new Error('Google 계정을 다시 연결해 주세요.');
      }
      if (!res.ok)
        throw new Error(typeof body.error === 'string' ? body.error : 'AI 정리를 마치지 못했어요.');
      const result = responseSchema.parse(body);
      onUse(
        result.missions.map((m) => ({
          ...createMission(m.title, [...photoIds]),
          subject: m.subject,
          kind: m.kind,
          due: m.due || '',
          dueTime: m.dueTime || '',
          quantityUnit: m.quantityUnit || '',
          quantityTotal: m.quantityTotal === null ? '' : String(m.quantityTotal),
          minutes: String(m.minutes || 25),
          checked: false,
        })),
      );
    } catch (e) {
      if (!alive.current) return;
      setMessage(
        e instanceof Error && e.name !== 'ZodError'
          ? e.message
          : 'AI 초안을 확인하지 못했어요. 직접 정리해 주세요.',
      );
    } finally {
      clearTimeout(timeout);
      request.current = null;
      operation.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <details
      className="briefing-ai photo-text"
      onToggle={(e) => {
        if (e.currentTarget.open) void prepare();
      }}
    >
      <summary>AI로 할 일 정리 · 선택</summary>
      <p>
        DeepSeek 4.1 Flash · 하루 최대 1,000원. 정리 버튼을 누르면 입력한 글자만 DeepSeek에
        보냅니다. 사진은 보내지 않아요.
      </p>
      {existing && <p>작성 중인 과제를 먼저 저장하면 새 브리핑을 AI로 정리할 수 있어요.</p>}
      {enabled && !signedIn && (
        <button
          type="button"
          disabled={busy || disabled || !clientId}
          onClick={() => void signIn()}
        >
          Google로 연결
        </button>
      )}
      {enabled && signedIn && (
        <button
          type="button"
          disabled={busy || disabled || existing || !text.trim()}
          onClick={() => void analyze()}
        >
          DeepSeek로 과제 정리
        </button>
      )}
      {message && <p role="status">{message}</p>}
      <p>
        AI가 제안한 과목·마감·분량은 다음 화면에서 직접 확인해야 저장됩니다. 계정 연결에는 이메일
        확인 권한만 사용합니다.
      </p>
    </details>
  );
}
