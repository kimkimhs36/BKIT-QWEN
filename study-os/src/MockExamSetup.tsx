import { useState } from 'react';
import type { State } from './model';
import { learning, resourceProblems } from './learningEngine';
export function MockExamSetup({
  state,
  onStart,
}: {
  state: State;
  onStart: (id: string, minutes: number, count: number) => void;
}) {
  const data = learning(state),
    resources = data.resources.filter((r) => resourceProblems(data, r.id).length > 0);
  const [id, setId] = useState(resources[0]?.id ?? ''),
    [minutes, setMinutes] = useState(80),
    [count, setCount] = useState(0);
  const total = resourceProblems(data, id).length;
  return (
    <details className="mock-exam-setup">
      <summary>모의고사 실전 연습</summary>
      <p>
        등록한 실제 자료로 연습해요. 일시정지·휴식은 시험 시간에서 제외하고, 시간이 끝나면 답안을
        보존해요.
      </p>
      {resources.length ? (
        <>
          <label>
            시험 자료
            <select
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setCount(0);
              }}
            >
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.subject} · {r.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            시험 시간 (분)
            <input
              type="number"
              min={1}
              max={480}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
          <label>
            시험 문항 수
            <input
              type="number"
              min={1}
              max={total}
              value={count || total}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <button
            className="jg-primary"
            disabled={
              !!state.active ||
              !!state.quickTimer ||
              !Number.isInteger(minutes) ||
              minutes < 1 ||
              minutes > 480 ||
              (count || total) < 1 ||
              (count || total) > total ||
              !Number.isInteger(count)
            }
            onClick={() => onStart(id, minutes, count || total)}
          >
            이 자료로 모의시험 시작
          </button>
          {(state.active || state.quickTimer) && <p>진행 중인 학습을 먼저 저장하고 종료하세요.</p>}
        </>
      ) : (
        <p>집중 화면의 자료 라이브러리에서 문제를 먼저 등록해 주세요.</p>
      )}
    </details>
  );
}
