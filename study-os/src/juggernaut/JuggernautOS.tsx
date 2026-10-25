import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Download,
  Gauge,
  Menu,
  Moon,
  Play,
  Sun,
  Target,
  X,
} from 'lucide-react';
import {
  concepts,
  curriculum,
  errorLabels,
  questionById,
  score,
  type Concept,
  type ErrorCode,
} from './content';
import {
  KEY,
  activeAttempts,
  advance,
  documentSchema,
  dueReviews,
  emptyDocument,
  evidence,
  independent,
  mergeDocuments,
  putSession,
  recommendation,
  startSession,
  submit,
  type Session,
  type StudyDocument,
} from './engine';
import { useStudy, type Transport } from './useStudy';
import './juggernaut-os.css';

import { root, useJuggernautPath } from './routing';
function download(data: string, name: string) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function JuggernautOS({
  request,
  connected,
  theme,
  onTheme,
  guide,
  onExit,
}: {
  request: Transport;
  connected: boolean;
  theme: string;
  onTheme: () => void;
  guide: ReactNode;
  onExit: () => void;
}) {
  const store = useStudy(request, connected);
  const path = useJuggernautPath(),
    page = path.slice(root.length).split('/')[1] || 'today';
  const [menu, setMenu] = useState(false),
    [practice, setPractice] = useState(false),
    [practiceDoc, setPracticeDoc] = useState(emptyDocument);
  const [session, setSession] = useState<Session | null>(
    () =>
      store.document.sessions
        .filter((s) => s.phase !== 'complete')
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((s) => ({ ...s, tickAt: Date.now() }))[0] || null,
  );
  const [now, setNow] = useState(Date.now()),
    [notice, setNotice] = useState('');
  const live = useRef({ session, practice, document: store.document });
  live.current = { session, practice, document: store.document };
  const doc = practice ? practiceDoc : store.document;
  const attempts = activeAttempts(store.document),
    due = dueReviews(store.document, now),
    next = recommendation(store.document, now);
  function persist(s: Session, d: StudyDocument = doc) {
    setSession(s);
    if (practice) {
      setPracticeDoc(putSession(d, s));
      return true;
    }
    return store.save(putSession(d, s));
  }
  function checkpoint() {
    const s = live.current.session;
    if (!s || s.phase !== 'question' || live.current.practice) return;
    const time = Date.now();
    const paused = {
      ...s,
      elapsedMs: s.elapsedMs + Math.max(0, time - s.tickAt),
      tickAt: time,
      updatedAt: time,
    };
    store.save(putSession(live.current.document, paused));
    setSession(paused);
  }
  function navigate(target: string) {
    checkpoint();
    if (practice && target !== 'train') {
      setSession(null);
      setPractice(false);
      setPracticeDoc(emptyDocument());
    }
    history.pushState(null, '', target === 'today' ? root : root + '/' + target);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setMenu(false);
    window.scrollTo(0, 0);
  }
  function begin(kind: Session['kind'], free = false, concept?: Concept) {
    if (
      session?.phase !== 'complete' &&
      session &&
      !window.confirm(
        '진행 중인 학습을 보관하고 새 학습을 시작할까요? 기록 화면에서 다시 열 수 있어요.',
      )
    )
      return;
    const d = free ? emptyDocument() : store.document,
      s = startSession(d, kind, Date.now(), concept);
    setPractice(free);
    setSession(s);
    if (free) setPracticeDoc(putSession(d, s));
    else store.save(putSession(d, s));
    history.pushState(null, '', root + '/train');
    window.dispatchEvent(new PopStateEvent('popstate'));
    setMenu(false);
  }
  function edit(patch: Partial<Session>) {
    if (!session || session.phase !== 'question') return;
    const time = Date.now();
    persist({
      ...session,
      ...patch,
      elapsedMs: session.elapsedMs + Math.max(0, time - session.tickAt),
      tickAt: time,
      updatedAt: time,
    });
  }
  function resume(s: Session) {
    checkpoint();
    setPractice(false);
    setSession({ ...s, tickAt: Date.now() });
    history.pushState(null, '', root + '/train');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const checkpointRef = useRef(checkpoint);
  checkpointRef.current = checkpoint;
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === 'hidden') checkpointRef.current();
      else setSession((s) => (s ? { ...s, tickAt: Date.now() } : s));
    };
    const leave = () => checkpointRef.current();
    window.addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('pagehide', leave);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  useEffect(() => {
    document.title = 'BKIT JUGGERNAUT · PROJECT 2028';
    return () => {
      document.title = 'BKIT STUDY OS';
    };
  }, []);
  useEffect(() => {
    document.querySelector<HTMLElement>('.jg-main h1')?.focus();
  }, [page]);
  const nav = [
    ['today', 'COMMAND CENTER', '오늘'],
    ['diagnosis', 'DIAGNOSTICS', '진단'],
    ['train', 'TRAINING ROOM', '학습'],
    ['review', 'REVIEW ENGINE', '복습'],
    ['roadmap', 'ROADMAP', '학습 경로'],
    ['progress', 'LEARNING LOG', '기록'],
    ['guide', 'PROJECT 2028', '수능 안내'],
  ];
  const q = session ? questionById(session.questionId) : null;
  const feedback = session ? doc.attempts.find((a) => a.id === session.submittedId) : null;
  const days = Math.ceil((Date.parse(curriculum.examDate + 'T00:00:00+09:00') - now) / 86400000);
  const exportDoc = () =>
    download(
      JSON.stringify(
        session && !practice ? putSession(store.document, session) : store.document,
        null,
        2,
      ),
      'bkit-juggernaut-backup.json',
    );
  return (
    <div className="jg-os" data-theme={theme}>
      <a className="jg-skip" href="#jg-main">
        학습 내용으로 이동
      </a>
      <header className="jg-header">
        <a
          className="jg-brand"
          href={root}
          onClick={(e) => {
            e.preventDefault();
            navigate('today');
          }}
        >
          <span className="jg-mark">
            <Gauge size={25} />
          </span>
          <span>
            BKIT <b>JUGGERNAUT</b>
            <small>STUDY OS / PROJECT 2028</small>
          </span>
        </a>
        <div className="jg-header-actions">
          <span className="jg-year">
            2028학년도{' '}
            <b>
              D{days >= 0 ? '-' : '+'}
              {Math.abs(days)}
            </b>
          </span>
          <button aria-label={theme === 'dark' ? '밝은 테마' : '어두운 테마'} onClick={onTheme}>
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            className="jg-menu-toggle"
            aria-label={menu ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <div className="jg-layout">
        <aside className={'jg-sidebar' + (menu ? ' is-open' : '')}>
          <p className="jg-eyebrow">YOUR NEXT MOVE</p>
          <nav aria-label="수능관 메뉴">
            {nav.map(([id, label, ko]) => (
              <a
                key={id}
                href={id === 'today' ? root : root + '/' + id}
                aria-current={page === id ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(id);
                }}
              >
                <span>
                  {ko}
                  <small>{label}</small>
                </span>
                <ChevronRight size={15} />
              </a>
            ))}
          </nav>
          <button
            className="jg-back"
            onClick={() => {
              checkpoint();
              onExit();
            }}
          >
            <ArrowLeft size={16} /> BKIT으로 돌아가기
          </button>
          <div className="jg-sidebar-note">
            <span className="jg-dot" /> BUILD 01
            <br />한 번에 한 문제.
            <br />
            어제의 답에서 오늘을 시작합니다.
          </div>
        </aside>
        <main className="jg-main" id="jg-main">
          <div className="jg-status" role="status">
            <span className={'jg-dot' + (store.status === '동기화 실패' ? ' warning' : '')} />
            {practice ? '자유 연습 · 저장하지 않음' : store.status}
            <span>{practice ? '입력과 결과는 연습을 나가면 사라집니다.' : store.detail}</span>
            {!practice && (
              <button onClick={() => void store.sync()} disabled={!connected}>
                동기화
              </button>
            )}
          </div>
          {store.error && (
            <div className="jg-alert" role="alert">
              {store.error}
              <button onClick={exportDoc}>현재 화면 내보내기</button>
              <button
                onClick={() =>
                  store.save(session ? putSession(store.document, session) : store.document)
                }
              >
                저장 재시도
              </button>
              <button
                onClick={() => download(localStorage.getItem(KEY) || 'null', 'juggernaut-raw.json')}
              >
                원본 내보내기
              </button>
            </div>
          )}
          {notice && <p role="status">{notice}</p>}
          {page === 'today' && (
            <>
              <div className="jg-page-title">
                <div>
                  <p className="jg-eyebrow">COMMAND CENTER / 01</p>
                  <h1 tabIndex={-1}>오늘의 한 문제부터.</h1>
                  <p>완벽한 준비보다, 지금의 독립적인 답변 하나.</p>
                </div>
                <span className="jg-tag">PROJECT 2028</span>
              </div>
              <section className="jg-hero">
                <div>
                  <p className="jg-eyebrow">NEXT ACTION</p>
                  <h2>
                    {session && session.phase !== 'complete'
                      ? '멈춘 곳에서 이어가세요.'
                      : due.length
                        ? '기억을 다시 꺼낼 시간.'
                        : attempts.length
                          ? '어제의 답이 오늘의 출발점.'
                          : '지금, 첫 문제를 풀어보세요.'}
                  </h2>
                  <p>
                    {session && session.phase !== 'complete'
                      ? '답안과 힌트 사용 기록을 이어갑니다.'
                      : next.reason}
                  </p>
                  <button
                    className="jg-primary"
                    onClick={() =>
                      session && session.phase !== 'complete' ? resume(session) : begin(next.kind)
                    }
                  >
                    {session && session.phase !== 'complete'
                      ? '이전 학습 이어서 하기'
                      : attempts.length
                        ? '오늘의 학습 시작'
                        : '지금 첫 문제 시작'}
                    <ArrowRight size={18} />
                  </button>
                  <small>수학 · 중학교 선수개념 · 일차방정식</small>
                </div>
                <div className="jg-instrument">
                  <span>EXAM COUNTDOWN</span>
                  <strong>
                    {Math.max(0, days)}
                    <small>DAYS</small>
                  </strong>
                  <p>
                    2028학년도 수능
                    <br />
                    <b>2027.11.18</b>
                  </p>
                  <small>설계 기준 일정 · 공식 공고 재확인 필요</small>
                </div>
              </section>
              <div className="jg-grid jg-actions">
                <button onClick={() => begin('ignition')}>
                  <Clock3 />
                  <b>5분 시동 모드</b>
                  <span>작은 문제 하나로 시작</span>
                  <ChevronRight />
                </button>
                <button onClick={() => navigate('diagnosis')}>
                  <Target />
                  <b>기초 진단 시작</b>
                  <span>수학 한 과목부터</span>
                  <ChevronRight />
                </button>
                <button onClick={() => begin('training', true)}>
                  <BookOpen />
                  <b>저장 없는 자유 연습</b>
                  <span>기록 부담 없이 풀기</span>
                  <ChevronRight />
                </button>
              </div>
              <div className="jg-grid jg-two">
                <section className="jg-card">
                  <div className="jg-section-heading">
                    <h2>오늘의 복습 대기열</h2>
                    <span>{due.length}개</span>
                  </div>
                  {due.length ? (
                    <>
                      <p>오늘은 최대 {store.document.budget.value}개 개념을 확인합니다.</p>
                      {due.map((e) => (
                        <button
                          className="jg-row"
                          key={e.concept}
                          onClick={() => begin('review', false, e.concept)}
                        >
                          {concepts.find((c) => c.id === e.concept)!.name}
                          <ChevronRight />
                        </button>
                      ))}
                    </>
                  ) : (
                    <p>지금 밀린 복습은 없어요. 첫 답변을 저장하면 재검증 일정이 생깁니다.</p>
                  )}
                </section>
                <section className="jg-card">
                  <h2>관찰된 학습</h2>
                  <div className="jg-metrics">
                    <div>
                      <b>{attempts.length}</b>
                      <span>첫 답변</span>
                    </div>
                    <div>
                      <b>{attempts.filter(independent).length}</b>
                      <span>독립 정답 관찰</span>
                    </div>
                    <div>
                      <b>
                        {concepts.filter((c) => evidence(store.document, c.id).delayed >= 2).length}
                      </b>
                      <span>지연 검증 안정</span>
                    </div>
                  </div>
                  <p>
                    {attempts.length
                      ? '풀이 과정은 자동 검증하지 않습니다.'
                      : '아직 학습 기록이 없어요. 성장 수치는 첫 답변 후 쌓입니다.'}
                  </p>
                </section>
              </div>
            </>
          )}
          {page === 'diagnosis' && (
            <>
              <Title
                eyebrow="DIAGNOSTICS / 02"
                title="내 출발점을 확인하세요."
                text="한 과목씩, 한 문제씩. 수능 등급을 추정하지 않습니다."
              />
              <section className="jg-card">
                <div className="jg-section-heading">
                  <h2>수학 · 일차방정식 기초 진단</h2>
                  <span className="jg-tag">3개 개념</span>
                </div>
                <p>
                  등식의 성질 → 분배법칙 → 음수 계수. 오답과 힌트를 근거로 개념별 준비도를
                  관찰합니다. 언제든 중단하고 이어갈 수 있어요.
                </p>
                <button
                  className="jg-primary"
                  onClick={() =>
                    session?.kind === 'diagnosis' && session.phase !== 'complete'
                      ? resume(session)
                      : begin('diagnosis')
                  }
                >
                  수학 진단{' '}
                  {session?.kind === 'diagnosis' && session.phase !== 'complete'
                    ? '이어서 하기'
                    : '시작'}
                  <ArrowRight size={18} />
                </button>
              </section>
              <Readiness document={store.document} />
              <section className="jg-card">
                <h2>과목별 출제범위</h2>
                {curriculum.subjects.map((s) => (
                  <div className="jg-row" key={s.name}>
                    <div>
                      <b>{s.name}</b>
                      <p>{s.scope}</p>
                    </div>
                    <span>{s.name === '수학' ? '선수개념 진단 제공' : '진단 문항 검수 대기'}</span>
                  </div>
                ))}
                <p>
                  현재 진단은 중학교 선수개념입니다. 공식 수능 출제범위와 구분됩니다. 영어 등 다른
                  과목은 검증된 문항을 확보한 뒤 열립니다.
                </p>
              </section>
            </>
          )}
          {page === 'train' && (
            <>
              <Title
                eyebrow="TRAINING ROOM / 03"
                title={
                  practice
                    ? '자유 연습'
                    : session?.kind === 'diagnosis'
                      ? '수학 기초 진단'
                      : session?.kind === 'review'
                        ? '지연 재검증'
                        : '지금, 한 문제에 집중.'
                }
                text={
                  practice
                    ? '답안·힌트·시간을 기기나 서버에 저장하지 않습니다.'
                    : '개념 확인 → 독립 답변 → 피드백 → 새 문제 → 지연 검증'
                }
              />
              {!session || !q ? (
                <section className="jg-card">
                  <p>이어서 풀 문제가 없어요. 지금 시작해 볼까요?</p>
                  <button className="jg-primary" onClick={() => begin('training')}>
                    실제 학습 시작
                  </button>
                  <button onClick={() => begin('training', true)}>저장 없는 연습</button>
                </section>
              ) : session.phase === 'complete' ? (
                <section className="jg-card jg-complete">
                  <Check size={36} />
                  <h2>오늘의 답변을 남겼습니다.</h2>
                  <p>
                    {practice
                      ? '자유 연습 결과는 저장하지 않았어요.'
                      : '정답 한 번으로 숙달을 단정하지 않아요. 내일 새 문제로 다시 확인합니다.'}
                  </p>
                  <Readiness document={doc} />
                  <button
                    className="jg-primary"
                    onClick={() => {
                      setPractice(false);
                      setSession(null);
                      navigate('today');
                    }}
                  >
                    COMMAND CENTER로
                  </button>
                  <button onClick={() => begin('training', practice)}>다음 학습</button>
                </section>
              ) : (
                <div className="jg-training-layout">
                  <section className="jg-card jg-problem" aria-label="주요 문제">
                    <div className="jg-section-heading">
                      <span className="jg-tag">
                        {q.options ? '객관식' : '단답형'} · {q.level === 1 ? '기초' : '적용'}
                      </span>
                      <span className="jg-timer">
                        <Clock3 size={15} />
                        {Math.floor(
                          (session.elapsedMs +
                            (session.phase === 'question'
                              ? Math.max(0, now - session.tickAt)
                              : 0)) /
                            1000,
                        )}
                        초
                      </span>
                    </div>
                    <p className="jg-eyebrow">
                      {concepts.find((c) => c.id === q.concept)!.name} / 선수개념
                    </p>
                    <h2 className="jg-stem">{q.stem}</h2>
                    {session.phase === 'question' ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const result = submit(doc, session);
                          persist(result.session, result.document);
                        }}
                      >
                        {q.options ? (
                          <fieldset className="jg-options">
                            <legend>정답 선택</legend>
                            {q.options.map((option, i) => (
                              <label key={option}>
                                <input
                                  type="radio"
                                  aria-label={option}
                                  name="answer"
                                  value={option}
                                  checked={session.answer === option}
                                  onChange={() => edit({ answer: option })}
                                />
                                <span>{i + 1}</span>
                                {option}
                              </label>
                            ))}
                          </fieldset>
                        ) : (
                          <label className="jg-field">
                            x의 값
                            <input
                              aria-label="x의 값"
                              autoComplete="off"
                              value={session.answer}
                              onChange={(e) => edit({ answer: e.target.value.slice(0, 100) })}
                              placeholder="음수는 - 기호를 사용하세요"
                            />
                          </label>
                        )}
                        <label className="jg-field">
                          어떻게 구했나요?{' '}
                          <small>독립 해결 관찰에 사용 · 풀이의 정확성은 자동 검증하지 않음</small>
                          <textarea
                            aria-label="풀이 설명"
                            maxLength={2000}
                            value={session.reasoning}
                            onChange={(e) => edit({ reasoning: e.target.value })}
                            placeholder="예: 양변에서 같은 수를 빼고 계수로 나눴다"
                          />
                        </label>
                        <label className="jg-guess">
                          <input
                            type="checkbox"
                            checked={session.guessed}
                            onChange={(e) => edit({ guessed: e.target.checked })}
                          />
                          확신 없이 추측한 답이에요
                        </label>
                        {session.hints > 0 && (
                          <div className="jg-hint" role="status">
                            {q.hints.slice(0, session.hints).map((h, i) => (
                              <p key={h}>
                                힌트 {i + 1}. {h}
                              </p>
                            ))}
                          </div>
                        )}
                        <div className="jg-problem-actions">
                          <button
                            type="button"
                            disabled={session.hints >= 2}
                            onClick={() => edit({ hints: session.hints + 1 })}
                          >
                            힌트 {session.hints}/2
                          </button>
                          <button
                            className="jg-primary"
                            type="submit"
                            disabled={!session.answer.trim()}
                          >
                            첫 답변 제출
                            <ArrowRight size={17} />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="jg-feedback" aria-live="polite">
                        <h3>
                          {score(q.id, feedback?.answer || '')
                            ? '정답입니다.'
                            : '다시 연결해 봅시다.'}
                        </h3>
                        <p>
                          첫 답변: <b>{feedback?.answer}</b> · 힌트 {feedback?.hints || 0}회 ·{' '}
                          {feedback?.guessed ? '추측 표시' : '추측 아님'}
                        </p>
                        <p>
                          {feedback && independent(feedback)
                            ? '힌트 없는 정답을 관찰했어요. 지연 검증 전에는 완전 숙달로 보지 않습니다.'
                            : '독립 해결 근거가 부족해요. 개념을 확인하고 새 문제로 재도전하세요.'}
                        </p>
                        <div className="jg-explanation">
                          <b>정답 {q.answer}</b>
                          <p>{q.explanation}</p>
                        </div>
                        <label className="jg-field">
                          오류 원인 <small>규칙 기반 제안 · 낮은 확신도 · 직접 수정 가능</small>
                          <select
                            aria-label="오류 원인"
                            value={feedback?.error || ''}
                            onChange={(e) => {
                              if (!feedback) return;
                              const updated = {
                                ...feedback,
                                error: (e.target.value || null) as ErrorCode | null,
                                updatedAt: Date.now(),
                              };
                              const d = {
                                ...doc,
                                attempts: doc.attempts.map((a) =>
                                  a.id === updated.id ? updated : a,
                                ),
                              };
                              if (practice) setPracticeDoc(d);
                              else store.save(d);
                            }}
                          >
                            <option value="">원인 없음 / 미분류</option>
                            {Object.entries(errorLabels).map(([code, label]) => (
                              <option key={code} value={code}>
                                {code} · {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p>
                          다음 재검증:{' '}
                          {new Date(evidence(doc, q.concept).due || now).toLocaleString('ko-KR', {
                            timeZone: 'Asia/Seoul',
                          })}{' '}
                          (한국 시간)
                        </p>
                        <button
                          className="jg-primary"
                          onClick={() => persist(advance(doc, session))}
                        >
                          {(feedback && independent(feedback)) ||
                          session.kind === 'diagnosis' ||
                          session.kind === 'ignition'
                            ? '결과 확인 / 다음 단계'
                            : '개념 복구 후 새 문제 재도전'}
                          <ArrowRight size={17} />
                        </button>
                      </div>
                    )}
                    <button className="jg-pause" onClick={() => navigate('today')}>
                      {practice ? '연습 화면 나가기' : '중단하고 나중에 이어하기'}
                    </button>
                  </section>
                  <aside className="jg-card jg-concept">
                    <p className="jg-eyebrow">
                      {session.phase === 'question' ? 'CONCEPT CHECK' : 'REPAIR NOTE'}
                    </p>
                    <h2>
                      {session.phase === 'question'
                        ? '먼저 스스로 떠올려 보세요.'
                        : concepts.find((c) => c.id === q.concept)!.name}
                    </h2>
                    {session.phase === 'question' ? (
                      <>
                        <p>
                          양변에 같은 연산을 적용했나요?
                          <br />
                          마지막에 원래 식에 대입해 보세요.
                        </p>
                        <p>구체적인 개념·예제는 힌트 또는 제출 후 확인할 수 있어요.</p>
                      </>
                    ) : (
                      <>
                        <p>{concepts.find((c) => c.id === q.concept)!.note}</p>
                        <div className="jg-hint">
                          {concepts.find((c) => c.id === q.concept)!.example}
                        </div>
                      </>
                    )}
                    <small>
                      BKIT 자체 제작 수치 변형 문항
                      <br />
                      정답·선택지 대입 검증 · v1
                      <br />
                      공식 기출문항이 아닙니다.
                    </small>
                  </aside>
                </div>
              )}
            </>
          )}
          {page === 'review' && (
            <>
              <Title
                eyebrow="REVIEW ENGINE / 04"
                title="기억은 다시 꺼낼 때 단단해집니다."
                text="오답·힌트·추측 정답을 다음 학습과 연결합니다. 밀린 복습을 한꺼번에 강요하지 않아요."
              />
              <section className="jg-card">
                <label className="jg-field">
                  하루 복습 상한
                  <select
                    value={store.document.budget.value}
                    onChange={(e) =>
                      store.save({
                        ...store.document,
                        budget: { value: Number(e.target.value), updatedAt: Date.now() },
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}개 개념
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  지연된 힌트 없는 성공이면 간격을 2배(최대 30일), 도움·실패면 1일로 조정합니다.
                  초기 휴리스틱이며 학습 효과를 보장하지 않습니다.
                </p>
                {due.length === 0 && (
                  <p>지금 재검증할 개념이 없어요. 예정된 항목을 아래에서 확인하세요.</p>
                )}
                {concepts.map((c) => {
                  const e = evidence(store.document, c.id, now);
                  return (
                    <div className="jg-row" key={c.id}>
                      <div>
                        <b>{c.name}</b>
                        <p>
                          {e.due
                            ? new Date(e.due).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) +
                              ' · 한국 시간'
                            : '아직 학습 증거 없음'}
                        </p>
                      </div>
                      {e.due !== null && e.due <= now && due.some((v) => v.concept === c.id) ? (
                        <button className="jg-primary" onClick={() => begin('review', false, c.id)}>
                          새 문제로 검증
                        </button>
                      ) : (
                        <span>{e.state}</span>
                      )}
                    </div>
                  );
                })}
              </section>
              <Readiness document={store.document} />
            </>
          )}
          {page === 'roadmap' && (
            <>
              <Title
                eyebrow="ROADMAP / 05"
                title="날짜보다, 지금의 준비도에 맞게."
                text="PROJECT 2028 · 진도와 답변 근거에 따라 오늘의 경로를 조정합니다."
              />
              <section className="jg-card">
                <p className="jg-eyebrow">RECOMMENDED NEXT</p>
                <h2>{concepts.find((c) => c.id === next.concept)!.name}</h2>
                <p>{next.reason}</p>
                <button
                  className="jg-primary"
                  onClick={() => begin(next.kind, false, next.concept)}
                >
                  추천 학습 시작
                  <ArrowRight size={17} />
                </button>
                <label className="jg-field">
                  오늘 먼저 공부할 개념 바꾸기
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) begin('training', false, e.target.value as Concept);
                    }}
                  >
                    <option value="">직접 선택</option>
                    {concepts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
              <ol className="jg-roadmap">
                {[
                  '진단',
                  '선수개념 복구',
                  '수능 기본 개념',
                  '기본 문제 적용',
                  '기출·유형 훈련',
                  '실전 훈련',
                  '최종 안정화',
                ].map((name, i) => (
                  <li key={name}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h2>{name}</h2>
                      <p>
                        {i === 0
                          ? '세 개 선수개념의 관찰 근거를 확인합니다.'
                          : i === 1
                            ? '일차방정식의 약한 개념을 새 문제로 확인합니다.'
                            : '후속 개발 · 이 단계의 검증 문항은 아직 제공하지 않습니다.'}
                      </p>
                    </div>
                    <small>{i < 2 ? '이용 가능' : '준비 중'}</small>
                  </li>
                ))}
              </ol>
            </>
          )}
          {page === 'progress' && (
            <>
              <Title
                eyebrow="LEARNING LOG / 06"
                title="시간보다 답변의 근거."
                text="첫 답변은 보존합니다. 오류 원인 수정·기록 삭제 시 준비도와 복습 일정도 다시 계산합니다."
              />
              <Readiness document={store.document} />
              <section className="jg-card">
                <div className="jg-section-heading">
                  <h2>학습 기록 {attempts.length}개</h2>
                  <button onClick={exportDoc}>
                    <Download size={16} /> 기록 내보내기
                  </button>
                </div>
                {!attempts.length && (
                  <p>아직 기록이 없어요. 실제 학습 모드로 첫 문제를 풀어보세요.</p>
                )}
                {attempts
                  .slice()
                  .reverse()
                  .map((a) => (
                    <div className="jg-log" key={a.id}>
                      <div>
                        <b>{questionById(a.questionId).stem}</b>
                        <p>
                          {new Date(a.at).toLocaleString('ko-KR')} · 첫 답변 {a.answer} ·{' '}
                          {score(a.questionId, a.answer) ? '정답' : '오답'} · 힌트 {a.hints} ·{' '}
                          {a.guessed ? '추측' : '추측 아님'} · {Math.floor(a.durationMs / 1000)}초
                        </p>
                        <small>
                          풀이: {a.reasoning || '미작성'} ·{' '}
                          {independent(a) ? '독립 정답 관찰' : '독립 근거 부족'}
                        </small>
                      </div>
                      <label>
                        오류 원인
                        <select
                          aria-label={'기록 오류 원인 ' + a.id}
                          value={a.error || ''}
                          onChange={(e) =>
                            store.save({
                              ...store.document,
                              attempts: store.document.attempts.map((v) =>
                                v.id === a.id
                                  ? {
                                      ...v,
                                      error: (e.target.value || null) as ErrorCode | null,
                                      updatedAt: Date.now(),
                                    }
                                  : v,
                              ),
                            })
                          }
                        >
                          <option value="">미분류</option>
                          {Object.entries(errorLabels).map(([c, n]) => (
                            <option key={c} value={c}>
                              {c} · {n}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              '이 수능관 답변 기록을 삭제할까요? 준비도·복습 일정에서도 제외됩니다. 기존 BKIT 기록에는 영향이 없습니다.',
                            )
                          )
                            store.save({
                              ...store.document,
                              attempts: store.document.attempts.map((v) =>
                                v.id === a.id ? { ...v, deleted: true, updatedAt: Date.now() } : v,
                              ),
                            });
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                <h3>보관된 학습 세션</h3>
                {store.document.sessions
                  .filter((s) => s.phase !== 'complete')
                  .map((s) => (
                    <button className="jg-row" key={s.id} onClick={() => resume(s)}>
                      {s.kind === 'diagnosis' ? '기초 진단' : '문제풀이'} ·{' '}
                      {questionById(s.questionId).stem}
                      <Play size={16} />
                    </button>
                  ))}
                <details>
                  <summary>백업 가져오기 / 원본 복구</summary>
                  <p>
                    검증된 수능관 백업을 현재 기록에 합칩니다. 기존 BKIT 백업·저장 키는 변경하지
                    않습니다.
                  </p>
                  <input
                    aria-label="수능관 백업 파일"
                    type="file"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        if (file.size > 2e6) throw Error();
                        const restored = documentSchema.parse(JSON.parse(await file.text()));
                        if (store.blocked) {
                          setNotice(
                            '손상된 원본은 덮어쓰지 않습니다. 원본을 내보낸 후 별도 복구 지원이 필요해요.',
                          );
                          return;
                        }
                        if (store.save(mergeDocuments(store.document, restored)))
                          setNotice('백업을 검증하고 합쳤어요.');
                      } catch {
                        setNotice('백업 형식을 확인하지 못했어요. 현재 기록은 유지됩니다.');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      try {
                        const raw = localStorage.getItem(KEY + '.backup');
                        if (!raw) throw Error();
                        const parsed = documentSchema.parse(JSON.parse(raw));
                        if (store.save(mergeDocuments(store.document, parsed)))
                          setNotice('직전 기기 백업을 합쳤어요.');
                      } catch {
                        setNotice('복구 가능한 직전 백업을 찾지 못했어요.');
                      }
                    }}
                  >
                    직전 기기 백업 복구
                  </button>
                </details>
              </section>
            </>
          )}
          {page === 'guide' && <div className="jg-legacy">{guide}</div>}
          {!nav.some(([id]) => id === page) && (
            <section className="jg-card">
              <h1 tabIndex={-1}>이 경로를 찾지 못했어요.</h1>
              <button onClick={() => navigate('today')}>COMMAND CENTER로 돌아가기</button>
            </section>
          )}
          <footer className="jg-footer">
            BKIT JUGGERNAUT · BUILD 01 <span>2028학년도 / 수학 선수개념 파일럿</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Title({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="jg-page-title">
      <div>
        <p className="jg-eyebrow">{eyebrow}</p>
        <h1 tabIndex={-1}>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Readiness({ document }: { document: StudyDocument }) {
  return (
    <section className="jg-card">
      <div className="jg-section-heading">
        <h2>개념별 기초 준비도</h2>
        <span>수능 1~9등급과 무관</span>
      </div>
      {concepts.map((c) => {
        const e = evidence(document, c.id);
        return (
          <div key={c.id} className="jg-row">
            <div>
              <b>{c.name}</b>
              <p>
                {e.count}개 답변 · 확신도 {e.confidence}
              </p>
            </div>
            <span className="jg-tag">{e.state}</span>
          </div>
        );
      })}
    </section>
  );
}
