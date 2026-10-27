import { useMemo, useState, useEffect, useRef } from 'react';
import { ArrowRight, BookOpenCheck, ClipboardCheck, RotateCcw, Sparkles, Download, Play } from 'lucide-react';
import { learningConcepts, learningQuestions } from './juggernaut/catalogue';
import { questionById, score } from './juggernaut/content';
import {
  KEY, EXT_KEY, readDocument, saveDocument, activeAttempts, evidence,
  recommendation, startSession, submit, advance, putSession, emptyDocument,
  dueReviews, independent, type Session, type StudyDocument,
} from './juggernaut/engine';
import './exam-lab.css';

const todayNote = '36개의 독립 제작 수학 선수학습 문항 · 실제 수능 기출이나 공식 등급 예측이 아닙니다.';
const statuses = ['시작 전', '도움 필요', '복습 예정', '직접 해결 관찰'];
function safeExport() {
  const entries = { [KEY]: localStorage.getItem(KEY), [EXT_KEY]: localStorage.getItem(EXT_KEY) };
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' }));
  link.href = url;
  link.download = 'bkit-exam-lab-original.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
/** This view reuses the JUGGERNAUT BUILD 03 scoring/storage engine rather than
 * publishing an unfinished full-screen design or adding a second question bank.
 */
export function ExamLab() {
  const [initial] = useState(() => readDocument(localStorage));
  const [doc, setDoc] = useState<StudyDocument>(initial.document);
  const [error, setError] = useState(initial.error);
  const blocked = !!initial.error;
  const [session, setSession] = useState<Session | null>(
    () => initial.document.sessions
      .filter(s => s.phase !== 'complete')
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(s => ({ ...s, tickAt: Date.now() }))[0] || null,
  );
  const [free, setFree] = useState(false);
  const [freeDoc, setFreeDoc] = useState(emptyDocument);
  const [notice, setNotice] = useState('');
  const [finished, setFinished] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const viewDoc = free ? freeDoc : doc;
  const attempts = activeAttempts(doc);
  const recommendationToday = useMemo(() => recommendation(doc), [doc]);
  const reviews = useMemo(() => dueReviews(doc), [doc]);
  const pausedSession = doc.sessions
    .filter(s => s.phase !== 'complete')
    .sort((a,b) => b.updatedAt - a.updatedAt)[0];
  const q = session ? questionById(session.questionId) : null;
  const feedback = session?.submittedId
    ? viewDoc.attempts.find(a => a.id === session.submittedId) : null;

  function persist(next: StudyDocument, nextSession?: Session) {
    if (free) {
      setFreeDoc(next);
      if (nextSession) setSession(nextSession);
      return true;
    }
    if (blocked) return false;
    try {
      const updated = saveDocument(localStorage, next);
      setDoc(updated);
      if (nextSession) setSession(nextSession);
      setError('');
      return true;
    } catch (reason) {
      setError('수능관 저장에 실패했어요. 입력을 보존한 채 현재 내용을 내보내거나 저장 공간을 확인해 주세요. ' +
        (reason instanceof Error ? reason.message : '저장 오류'));
      return false;
    }
  }

  function begin(kind: Session['kind'], skill?: (typeof learningConcepts)[number]['id'], practice = false) {
    if (session && session.phase === 'question' &&
      !window.confirm('진행 중인 문제의 입력을 유지하려면 먼저 풀이를 마무리해 주세요. 새 연습을 시작할까요?')) return;
    const source = practice ? emptyDocument() : doc;
    const next = startSession(source, kind, Date.now(), skill);
    setFinished(false);
    setNotice('');
    if (practice) {
      setFree(true);
      setFreeDoc(putSession(source, next));
      setSession(next);
    } else {
      setFree(false);
      setSession(null);
      // The previous mode can be free: write directly to permanent storage in this branch.
      // Never save a real exercise to the throwaway practice document.
      if (!blocked) {
        try {
          const saved = saveDocument(localStorage, putSession(source, next));
          setDoc(saved);
          setSession(next);
          setError('');
          setNotice('이 기기에 학습 시작이 저장됐어요.');
        } catch (reason) {
          setSession(null);
          setError('학습 시작을 저장하지 못했어요. ' +
            (reason instanceof Error ? reason.message : '저장 공간을 확인해 주세요.'));
        }
      }
    }
  }

  function update(patch: Partial<Session>) {
    if (!session || session.phase !== 'question') return;
    const t = Date.now();
    const next = {
      ...session, ...patch,
      elapsedMs: session.elapsedMs + Math.max(0, t - session.tickAt),
      tickAt: t, updatedAt: t,
    };
    // Keep typed answer visible even if the storage device becomes full.
    setSession(next);
    if (free) setFreeDoc(putSession(freeDoc, next));
    else persist(putSession(doc, next));
  }

  function answer() {
    if (!session || session.phase !== 'question' || !session.answer.trim()) return;
    const result = submit(viewDoc, session, Date.now());
    if (persist(putSession(result.document, result.session), result.session))
      setNotice('답안을 확인했어요. 도움을 받고 해결한 기록과 혼자 해결한 기록은 구분돼요.');
  }

  function next() {
    if (!session || session.phase !== 'feedback') return;
    const nextSession = advance(viewDoc, session, Date.now());
    if (persist(putSession(viewDoc, nextSession), nextSession) &&
        nextSession.phase === 'complete') {
      setFinished(true);
      setNotice(free ? '자유 연습 완료 · 기록은 저장되지 않았어요.' : '이번 학습을 기록했어요. 수능 성적을 예측하지는 않아요.');
    }
  }
  function pause() {
    if (!session || session.phase !== 'question') {
      setSession(null);
      setFree(false);
      setFinished(false);
      setNotice('기록을 변경하지 않고 학습 화면을 닫았어요.');
      return;
    }
    if (free) {
      setSession(null);
      setFree(false);
      setFinished(false);
      setNotice('자유 연습을 닫았어요. 답변은 저장되지 않았어요.');
      return;
    }
    const t = Date.now();
    const saved = { ...session, elapsedMs: session.elapsedMs + Math.max(0, t-session.tickAt),
      tickAt: t, updatedAt: t };
    if (persist(putSession(doc, saved), saved)) {
      setSession(null);
      setNotice('이 기기에 보관했어요. 다시 열면 이어서 할 수 있어요.');
    }
  }

  // Do not count time when Safari is backgrounded: checkpoint and reset the clock.
  useEffect(() => {
    const handle = () => {
      const s = sessionRef.current;
      if (!s || s.phase !== 'question' || free || blocked) return;
      const now = Date.now();
      const checkpoint = document.visibilityState === 'hidden'
        ? { ...s, elapsedMs: s.elapsedMs + Math.max(0, now - s.tickAt), tickAt: now, updatedAt: now }
        : { ...s, tickAt: now, updatedAt: now };
      try {
        saveDocument(localStorage, putSession(readDocument(localStorage).document, checkpoint));
        sessionRef.current = checkpoint;
        if (document.visibilityState === 'visible') setSession(checkpoint);
      } catch {
        // The visible save actions report failures; never overwrite corrupt stored bytes.
      }
    };
    document.addEventListener('visibilitychange', handle);
    window.addEventListener('pagehide', handle);
    return () => {
      document.removeEventListener('visibilitychange', handle);
      window.removeEventListener('pagehide', handle);
    };
  }, [blocked, free]);

  return (
    <section className="exam-lab panel" aria-label="BKIT 수능관">
      <header className="exam-lab-hero">
        <span className="exam-lab-eyebrow"><Sparkles size={15}/> BKIT / THE LONG ROUTE</span>
        <h2>거대한 목표는,<br/><em>오늘의 한 문제에서.</em></h2>
        <p>수능관 · 기초 회복실</p>
        <small>{todayNote}</small>
      </header>
      <div className="exam-lab-status" role="status">
        <span>{free ? '저장하지 않는 자유 연습' : error ? '기기 저장 점검 필요' : '기기 저장 · 클라우드 자동 동기화 없음'}</span>
        <button type="button" onClick={safeExport}><Download size={14}/> 원본 JSON 보관</button>
      </div>
      {error && <p className="warning" role="alert">{error} 기존 원본은 삭제하거나 초기화하지 않았어요.</p>}
      {notice && <p className="exam-lab-notice" role="status">{notice}</p>}

      {!session || session.phase === 'complete' ? (
        <>
          <div className="exam-lab-stats" aria-label="수학 기초 학습 상태">
            <div><strong>{attempts.length}</strong><small>저장된 풀이 시도</small></div>
            <div><strong>{attempts.filter(independent).length}</strong><small>힌트 없는 풀이 기록</small></div>
            <div><strong>{reviews.length}</strong><small>현재 복습할 개념</small></div>
            <div><strong>{learningQuestions.length}</strong><small>연습 가능한 문항</small></div>
          </div>
          <section className="exam-lab-next">
            <span className="exam-lab-eyebrow">NEXT ACTION / 오늘의 한 걸음</span>
            <h3>{learningConcepts.find(c => c.id === recommendationToday.concept)?.name}</h3>
            <p>{recommendationToday.reason}</p>
            <div className="exam-lab-actions">
              {pausedSession && (
                <button type="button" className="primary" disabled={blocked}
                  onClick={() => {
                    const resumed = { ...pausedSession, tickAt: Date.now(), updatedAt: Date.now() };
                    try {
                      const restored = saveDocument(localStorage, putSession(doc, resumed));
                      setDoc(restored);
                      setSession(resumed);
                      setFree(false);
                      setFinished(false);
                      setError('');
                      setNotice('이 기기에 남겨둔 풀이를 이어가요.');
                    } catch {
                      setError('이어서 공부할 기록을 저장하지 못했어요. 원본을 내보내고 저장 공간을 확인해 주세요.');
                    }
                  }}>
                  이어서 문제 풀기 <ArrowRight size={16}/>
                </button>
              )}
              <button className={pausedSession ? '' : 'primary'} disabled={blocked} onClick={() => begin(recommendationToday.kind, recommendationToday.concept)}>
                <Play size={17}/> 실제 문제 시작 <ArrowRight size={16}/>
              </button>
              <button onClick={() => begin('ignition', undefined, true)}>저장 없이 가볍게 연습</button>
            </div>
          </section>
          <section className="exam-lab-concepts">
            <h3>기초 개념 5개</h3>
            <p>직접 답을 제출한 기록만 진도에 반영해요. 수능 등급이나 학교 성적과 연결하지 않아요.</p>
            <div className="exam-lab-concept-grid">
              {learningConcepts.map((concept, i) => {
                const e = evidence(doc, concept.id);
                const status = !e.count ? statuses[0] :
                  e.due && e.due <= Date.now() ? statuses[2] :
                    e.last && independent(e.last) ? statuses[3] : statuses[1];
                return (
                  <article key={concept.id} className="exam-lab-concept">
                    <small>FOUNDATION / {String(i+1).padStart(2,'0')}</small>
                    <h4>{concept.name}</h4>
                    <p>{concept.note}</p>
                    <span>{status} · 풀이 {e.count}회</span>
                    <button type="button" disabled={blocked} onClick={() => begin('training', concept.id)}>
                      이 개념 풀기 <ArrowRight size={15}/>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <section className="exam-lab-workspace" aria-label="한 문제 집중 학습">
          <div className="exam-lab-workspace-top">
            <span>수학 / {learningConcepts.find(c => c.id === q?.concept)?.name}</span>
            <button onClick={pause}>나중에 이어하기</button>
          </div>
          {q && <>
            <small className="exam-lab-step">{session.kind === 'review' ? '복습' : session.kind === 'diagnosis' ? '기초 진단' : '개념 연습'} · LEVEL {q.level} · {(session.visited.length)+1}번째 문제</small>
            <h3>{q.stem}</h3>
            {session.phase === 'question' ? (
              <>
                <label>내 답
                  <input inputMode="decimal" autoComplete="off"
                    value={session.answer} onChange={e => update({answer:e.target.value.slice(0,100)})}
                    placeholder="예: -2 / 0.5 / 1/2" aria-label="숫자 답안"/>
                </label>
                <label>어떻게 풀었는지 한 줄로 설명해 보기
                  <textarea value={session.reasoning}
                    onChange={e => update({reasoning:e.target.value.slice(0,2000)})}
                    placeholder="풀이 생각을 적어보세요. 도움을 받았다면 도움을 받았다고 기록돼요." rows={2}/>
                </label>
                <label className="exam-lab-check">
                  <input type="checkbox" checked={session.guessed} onChange={e=>update({guessed:e.target.checked})}/>
                  답을 추측해서 골랐어요
                </label>
                <details className="exam-lab-hints">
                  <summary>막히면 단계별 도움</summary>
                  {session.hints > 0 && q.hints.slice(0,session.hints).map((hint,i)=><p key={i}>{i+1}단계 · {hint}</p>)}
                  {session.hints < q.hints.length && <button onClick={()=>update({hints:session.hints+1})}>
                    힌트 {session.hints+1}단계 확인하기
                  </button>}
                  <small>힌트를 본 기록은 혼자 해결한 정답과 구분돼요.</small>
                </details>
                <button className="primary" onClick={answer} disabled={!session.answer.trim()}>
                  <ClipboardCheck size={17}/> 답 확인하기
                </button>
              </>
            ) : <>
              <div className="exam-lab-feedback" role="status">
                <strong>{feedback && score(feedback.questionId,feedback.answer)
                  ? '정답이에요. 풀이 과정을 확인해요.' : '다시 배울 지점을 찾았어요.'}</strong>
                <p>정답: {q.answer}</p>
                <p>{q.explanation}</p>
                <small>{feedback && independent(feedback)
                  ? '힌트 없이 풀이와 답을 남겼어요. 다른 문제로 다시 확인해야 실력이 확인돼요.'
                  : '도움 또는 풀이 기록이 부족했어요. 다음 문제로 확인해요.'}</small>
              </div>
              <button className="primary" onClick={next}><RotateCcw size={17}/> {session.kind==='ignition'?'연습 마치기':'다음 문제 또는 완료'} <ArrowRight size={16}/></button>
            </>}
          </>}
        </section>
      )}
      {finished && <p role="status">학습 한 번을 마쳤어요. 이어서 다른 개념이나 BOOKS 학습지로 연습해 보세요.</p>}
      <footer className="exam-lab-footer">
        <BookOpenCheck size={16}/>
        <p>공부 기록은 이 기기에 보관돼요. 상단 원본 내보내기 또는 BKIT 설정의 전체 ZIP 백업을 이용해 주세요. 실제 출제범위·시험일은 최신 공식 공고를 확인해야 해요.</p>
      </footer>
    </section>
  );
}
