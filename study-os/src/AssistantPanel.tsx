import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, CheckCircle2, Send, Sparkles, XCircle } from 'lucide-react';
import type { State } from './model';
import { localAssistant, type AssistantAction } from './assistantLogic';
import { askLiveAssistant, checkAssistantConfig } from './assistantAI';
import { authorizeGoogleIdentity, prepareGoogleIdentity } from './cloudClient';
import { WaterDrop } from './WaterDrop';
import { loadConversation, saveConversation, clearConversation, type ConversationTurn } from './assistantConversation';

type Message = ConversationTurn & { action?: AssistantAction; navigate?: 'school' | 'tasks' | 'progress'; saved?: boolean };
const SUGGESTIONS = ['학원 가기 싫은데 숙제도 못 했어', '오늘 뭐부터 공부해?', '내일 화학 학습지 3장 추가해줘', '시간표 보여줘'];
const GREETING: Message = { role: 'assistant', text: '학원 이야기든 공부 고민이든 편하게 말해줘. BKIT에 등록한 일정과 과제를 확인하면서 같이 정리하자.' };

export function AssistantPanel({ state, onAction, onNavigate, getAccessToken }: {
  state: State;
  getAccessToken: () => string;
  onAction: (action: AssistantAction) => boolean;
  onNavigate: (tab: 'school' | 'tasks' | 'progress') => void;
}) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = loadConversation();
    return saved.length ? saved : [GREETING];
  });
  const [storageWarning, setStorageWarning] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(false);
  const [clientId, setClientId] = useState('');
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState('');
  const [live, setLive] = useState(false);
  const [verified, setVerified] = useState(false);
  const [shareContext, setShareContext] = useState(false);
  const [shareHistory, setShareHistory] = useState(false);
  const [connection, setConnection] = useState('AI 서버 상태 확인 중…');

  useEffect(() => {
    if (!saveConversation(messages)) setStorageWarning('대화를 이 기기에 저장하지 못했어. 저장 공간이나 비공개 모드를 확인해 줘.');
    else setStorageWarning('');
  }, [messages]);

  function eraseConversation() {
    if (!window.confirm('이 기기에 남은 BKIT 비서 대화를 모두 지울까? 공부 기록과 과제는 삭제되지 않아.')) return;
    if (!clearConversation()) {
      setStorageWarning('저장된 대화를 지우지 못했어. 브라우저 저장 공간을 확인해 줘.');
      return;
    }
    setShareHistory(false);
    setMessages([GREETING]);
  }

  useEffect(() => {
    let mounted = true;
    void checkAssistantConfig().then(async config => {
      if (!mounted) return;
      setAvailable(config.available);
      setClientId(config.clientId);
      setConnection(config.message);
      if (!config.available) return;
      try {
        await prepareGoogleIdentity();
        if (mounted) setReady(true);
      } catch {
        if (mounted) setConnection('Google 로그인 도구를 불러오지 못했어요. 로컬 비서는 사용할 수 있어요.');
      }
    });
    return () => { mounted = false; };
  }, []);

  async function connect() {
    if (!available || busy) return;
    // Consent is explicit. No API call (or browser popup) runs on page load.
    const existing = getAccessToken();
    if (existing) {
      setToken(existing);
      setLive(true);
      setVerified(false);
      setConnection('AI 대화가 선택됐어요. 실제 응답 성공 여부는 첫 질문으로 확인해요.');
      return;
    }
    if (!ready) {
      setConnection('Google 로그인 도구가 준비되지 않았어요. 다시 열어 주세요.');
      return;
    }
    try {
      // Must be invoked directly from this click for iOS Safari popup handling.
      const connected = await authorizeGoogleIdentity(clientId);
      setToken(connected);
      setLive(true);
      setVerified(false);
      setConnection('Google 연결 완료. 질문을 보낼 때만 AI를 호출해요.');
    } catch (error) {
      setLive(false);
      setVerified(false);
      setConnection(error instanceof Error ? error.message : 'Google 연결을 확인해 주세요.');
    }
  }

  async function ask(value: string) {
    const question = value.trim().slice(0, 1000);
    if (!question || busy) return;
    setInput('');
    setMessages(old => [...old, { role: 'user', text: question }]);
    setBusy(true);
    try {
      const recentTurns: ConversationTurn[] = messages.map((m) => ({ role: m.role, text: m.text, source: m.source }));
      const offline = localAssistant(question, state, Date.now(), recentTurns);
      // Local writes must always require a separate approval; remote AI is read-only.
      if (offline.action || !live || !available || !navigator.onLine || !(token || getAccessToken())) {
        setMessages(old => [...old, { role: 'assistant', source: 'local', text: offline.answer, action: offline.action, navigate: offline.navigate }]);
      } else {
        try {
          const answer = await askLiveAssistant(question, token || getAccessToken(), state, shareContext, undefined, shareHistory ? recentTurns : []);
          setMessages(old => [...old, { role: 'assistant', source: 'ai', text: answer, navigate: offline.navigate }]);
          setVerified(true);
          setConnection('DeepSeek가 실제 응답했어요. 저장·수정은 별도 확인이 필요해요.');
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'AI 서버 연결을 확인해 주세요.';
          setMessages(old => [...old, { role: 'assistant', source: 'local', text: offline.answer + '\nAI 응답 미완료: ' + reason + '\n위 답변은 로컬 안내예요.' }]);
          setVerified(false);
          setConnection(reason);
        }
      }
    } finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }
  function apply(index: number, action: AssistantAction) {
    const success = onAction(action);
    setMessages(old => old.map((item, i) => i === index
      ? { ...item, action: undefined, saved: success } : item)
      .concat({ role: 'assistant', text: success
        ? '확인한 변경사항을 BKIT에 저장했어. Google Sheets가 연결되어 있다면 이어서 동기화돼.'
        : '항목이 바뀌었거나 저장이 실패했어. 과제 목록을 확인하고 다시 요청해줘.' }));
  }
  return (
    <section className="assistant-panel" aria-label="BKIT 멀티 비서">
      <div className={'assistant-presence' + (busy ? ' is-listening' : '')}>
        <WaterDrop />
        <div><span>YOUR STUDY COMPANION</span><h3>복잡한 하루에, 작은 여유.</h3><p>계획부터 복습까지, 함께 풀어가요.</p></div>
      </div>
      <p className="assistant-intro">평범한 말부터 시작해도 돼. 대화는 이 기기에만 저장되고, 실제 과제 변경은 확인을 받은 뒤 진행해. 다른 기기로는 자동 동기화되지 않아.</p>
      <div className="assistant-history-controls">
        <small>이 기기에 남은 대화 {Math.max(0, messages.filter(m => m.role === 'user').length)}개 질문</small>
        <button type="button" className="text-button" onClick={eraseConversation} disabled={busy}>대화 기록 지우기</button>
      </div>
      {storageWarning && <p role="alert" className="hint">{storageWarning}</p>}
      <div className="note-card assistant-connection" role="group" aria-label="BKIT AI 연결">
        <p role="status">{connection}</p>
        {available && (
          <>
            <p className="hint">AI에는 질문만 보내요. 목표·과제 이름·과목·마감·시간표·공부 기록 요약을 함께 보내려면 아래 옵션을 직접 선택해 주세요. 크기에 따라 일부 항목만 공유해요. 사진·필기 원본·개인 메모는 보내지 않아요. 사용량에 따라 API 비용이 발생할 수 있어요.</p>
            <label className="checkbox">
              <input type="checkbox" checked={shareContext} onChange={e => setShareContext(e.target.checked)} />
              내 과제·일정·학습 기록 요약도 AI와 공유 (선택)
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={shareHistory} onChange={e => setShareHistory(e.target.checked)} />
              이전 대화 일부를 AI에 함께 전달 (선택 · 최대 최근 6개 메시지 중 용량에 맞는 일부)
            </label>
            {live ? (
              <button type="button" className="secondary" disabled={busy} onClick={() => { setLive(false); setVerified(false); setShareContext(false); setShareHistory(false); setConnection('로컬 비서로 전환했어요.'); }}>
                로컬 비서로 전환
              </button>
            ) : (
              <button type="button" className="secondary" disabled={busy || (!ready && !getAccessToken())} onClick={() => void connect()}>
                Google 계정으로 AI 연결
              </button>
            )}
          </>
        )}
        <small>{live ? (verified ? '현재 모드: DeepSeek 실제 답변 검증됨' : '현재 모드: AI 연결 선택 · 아직 실제 답변 미검증') : '현재 모드: 무료 로컬 비서'}</small>
      </div>
      <div className="assistant-messages" role="log" aria-label="비서 대화" aria-live="polite">
        {messages.map((message, i) => (
          <article className={'assistant-message assistant-message--' + message.role} key={i}>
            <span className="assistant-speaker">{message.role === 'user' ? '나' : message.source === 'ai' ? 'BKIT · AI 답변' : 'BKIT · 로컬 안내'}</span>
            <p>{message.text}</p>
            {message.action && <div className="assistant-approval">
              <button type="button" className="primary" onClick={() => apply(i, message.action!)}>
                <CheckCircle2 size={16}/> 확인하고 저장
              </button>
              <button type="button" className="secondary" onClick={() => setMessages(old => old.map((m, j) => i === j ? { ...m, action: undefined } : m))}>
                <XCircle size={16}/> 취소
              </button>
            </div>}
            {message.navigate && <button type="button" className="text-button" onClick={() => onNavigate(message.navigate!)}>
              관련 화면 열기 <ArrowUpRight size={15}/>
            </button>}
          </article>
        ))}
        {busy && <p className="assistant-wait" role="status">답변 준비 중…</p>}
      </div>
      <div className="assistant-suggestions" aria-label="빠른 질문">
        {SUGGESTIONS.map(s => <button type="button" key={s} disabled={busy} onClick={() => void ask(s)}>{s}</button>)}
      </div>
      <form className="assistant-compose" onSubmit={submit}>
        <label className="sr-only" htmlFor="assistant-question">비서에게 질문하기</label>
        <textarea id="assistant-question" rows={2} maxLength={1000} value={input}
          placeholder="예: 오늘 계획 짜줘 / 수학 학습지 완료했어"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}/>
        <button className="primary" type="submit" disabled={busy || !input.trim()} aria-label="비서에게 보내기">
          <Send size={19}/>
        </button>
      </form>
      <p className="assistant-foot"><Sparkles size={13}/> 로컬 대화 저장 · AI로 보내는 과제와 이전 대화는 각각 별도 동의 · 사용자 승인 없는 변경 없음</p>
    </section>
  );
}
