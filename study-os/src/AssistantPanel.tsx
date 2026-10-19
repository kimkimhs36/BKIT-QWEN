import { useState, type FormEvent } from 'react';
import { ArrowUpRight, CheckCircle2, Send, Sparkles, XCircle } from 'lucide-react';
import type { State } from './model';
import { assistantContext, localAssistant, type AssistantAction } from './assistantLogic';
import { apiEnabled, requestAI } from './ai';
import { WaterDrop } from './WaterDrop';

type Message = { role: 'user' | 'assistant'; text: string; action?: AssistantAction; navigate?: 'school' | 'tasks' | 'progress'; saved?: boolean };
const SUGGESTIONS = ['오늘 뭐부터 공부해?', '공부 기록 피드백해줘', '내일 화학 학습지 3장 추가해줘', '시간표 보여줘'];

export function AssistantPanel({ state, onAction, onNavigate, getAccessToken }: {
  state: State;
  getAccessToken: () => string;
  onAction: (action: AssistantAction) => boolean;
  onNavigate: (tab: 'school' | 'tasks' | 'progress') => void;
}) {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    text: '안녕! BKIT 비서야. 계획과 과제, 일정, 복습까지 여기서 편하게 말해줘. 실제 과제 변경은 확인을 받은 뒤에만 저장할게.',
  }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  async function ask(value: string) {
    const question = value.trim().slice(0, 1000);
    if (!question || busy) return;
    setInput('');
    setMessages(old => [...old, { role: 'user', text: question }]);
    setBusy(true);
    try {
      const offline = localAssistant(question, state);
      // Explicit, structured local changes never rely on a remote model's guess.
      if (offline.action || !apiEnabled || !navigator.onLine || !getAccessToken()) {
        setMessages(old => [...old, { role: 'assistant', text: offline.answer, action: offline.action, navigate: offline.navigate }]);
      } else {
        try {
          const response = await requestAI('assistant', {
            question, context: assistantContext(state),
          }, getAccessToken()) as { answer?: string; mode?: string };
          const answer = typeof response.answer === 'string' && response.answer.trim().length <= 2000
            ? response.answer.trim() : offline.answer;
          setMessages(old => [...old, { role: 'assistant', text: answer, navigate: offline.navigate }]);
        } catch {
          setMessages(old => [...old, { role: 'assistant', text: offline.answer + '\nAI 서버 응답이 없어 로컬 안내로 전환했어.' }]);
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
      <p className="assistant-intro">하나의 대화창에서 과제·일정·계획·복습을 관리해. 현재 운영 서버의 일반 AI 채팅은 미지원이야. 로컬 규칙으로 과제 초안·일정·학습 기록을 안내해.</p>
      <div className="assistant-messages" role="log" aria-label="비서 대화" aria-live="polite">
        {messages.map((message, i) => (
          <article className={'assistant-message assistant-message--' + message.role} key={i}>
            <span className="assistant-speaker">{message.role === 'user' ? '나' : 'BKIT'}</span>
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
      <p className="assistant-foot"><Sparkles size={13}/> 일정·과제 자동 변경 없음 · 확인 후 저장 · 과제 브리핑 AI는 공지 정리 화면에서 별도 연결</p>
    </section>
  );
}
