import { useState } from 'react';
import { uid, type State } from './model';
export function ExamPlanEditor({
  state,
  onChange,
}: {
  state: State;
  onChange: (fn: (s: State) => State) => boolean;
}) {
  const [subject, setSubject] = useState(''),
    [target, setTarget] = useState(''),
    [scope, setScope] = useState(''),
    [review, setReview] = useState(''),
    [weekly, setWeekly] = useState(''),
    [item, setItem] = useState(''),
    [message, setMessage] = useState('');
  const data = state.juggernaut ?? { examDate: null, weeklyMinutes: 300 };
  return (
    <details className="mock-exam-setup">
      <summary>과목 목표·시험 범위·준비 항목</summary>
      {data.subjects?.map((s, i) => (
        <div className="jg-plan-subject" key={s.subject}>
          <strong>
            {s.subject} · {s.target || '목표 미설정'}
          </strong>
          <p>확인한 범위: {s.scope || '아직 미확인'}</p>
          <p>남은 복습: {s.review || '아직 미확인'}</p>
          <p>이번 주: {s.weekly || '계획 전'}</p>
          <button
            onClick={() => {
              setSubject(s.subject);
              setTarget(s.target);
              setScope(s.scope);
              setReview(s.review);
              setWeekly(s.weekly);
            }}
          >
            수정
          </button>
          <button
            onClick={() =>
              onChange((v) => ({
                ...v,
                juggernaut: { ...data, subjects: data.subjects?.filter((_, n) => n !== i) },
              }))
            }
          >
            이 과목 계획 지우기
          </button>
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const entry = { subject: subject.trim(), target, scope, review, weekly };
          const saved = onChange((v) => ({
            ...v,
            juggernaut: {
              ...data,
              subjects: [
                ...(data.subjects ?? []).filter((s) => s.subject !== entry.subject),
                entry,
              ],
            },
          }));
          setMessage(saved ? '과목 계획을 저장했어요.' : '저장하지 못했어요. 입력은 유지해요.');
          if (saved) {
            setSubject('');
            setTarget('');
            setScope('');
            setReview('');
            setWeekly('');
          }
        }}
      >
        <label>
          계획할 과목
          <input
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label>
          나의 과목 목표
          <textarea
            maxLength={3000}
            rows={2}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </label>
        <label>
          직접 확인한 시험 범위
          <textarea
            maxLength={3000}
            rows={2}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          />
        </label>
        <label>
          남은 복습
          <textarea
            maxLength={3000}
            rows={2}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
        </label>
        <label>
          이번 주 할 행동
          <textarea
            maxLength={3000}
            rows={2}
            value={weekly}
            onChange={(e) => setWeekly(e.target.value)}
          />
        </label>
        <button
          disabled={
            !subject.trim() ||
            ((data.subjects?.length ?? 0) >= 12 &&
              !data.subjects?.some((s) => s.subject === subject.trim()))
          }
        >
          과목 계획 저장
        </button>
      </form>
      <h4>내가 확인할 시험 준비</h4>
      {data.preparation?.map((p) => (
        <label key={p.id}>
          <input
            type="checkbox"
            checked={p.done}
            onChange={(e) => {
              const done = e.target.checked;
              onChange((v) => ({
                ...v,
                juggernaut: {
                  ...data,
                  preparation: data.preparation?.map((x) => (x.id === p.id ? { ...x, done } : x)),
                },
              }));
            }}
          />
          {p.text}
        </label>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            onChange((v) => ({
              ...v,
              juggernaut: {
                ...data,
                preparation: [
                  ...(data.preparation ?? []),
                  { id: uid(), text: item.trim(), done: false },
                ],
              },
            }))
          )
            setItem('');
        }}
      >
        <label>
          준비 항목 추가
          <input maxLength={200} value={item} onChange={(e) => setItem(e.target.value)} />
        </label>
        <button disabled={!item.trim() || (data.preparation?.length ?? 0) >= 20}>
          준비 항목 저장
        </button>
      </form>
      <p role="status">{message}</p>
    </details>
  );
}
