import { useState } from 'react';
import { ArrowUpRight, Check, CornerDownLeft, Plus } from 'lucide-react';
import { type Task, uid } from './model';
import { addDays, at, dayKey, iso, weekday } from './time';
export function parseCapture(text: string, now = Date.now()) {
  const today = dayKey(now);
  const subject =
    text.match(
      /수학|영어|국어|경제|물리|화학|생명과학|지구과학|과학|사회|한국사|역사|정보|일본어|중국어/,
    )?.[0] || '기타';
  const kind: Task['kind'] = /수행평가/.test(text)
    ? '수행평가'
    : /시험|시험공부/.test(text)
      ? '시험공부'
      : /약속|예약|개인 일정/.test(text)
        ? '개인 일정'
        : '숙제';
  let due = '';
  if (/모레/.test(text)) due = addDays(today, 2);
  else if (/내일/.test(text)) due = addDays(today, 1);
  else if (/오늘/.test(text)) due = today;
  else {
    const match = text.match(/(일|월|화|수|목|금|토)요일/);
    if (match) {
      let diff = ('일월화수목금토'.indexOf(match[1]) - weekday(today) + 7) % 7;
      if (/다음\s*주/.test(text)) diff += 7;
      due = addDays(today, diff);
    }
  }
  const minutes = Math.max(1, Math.min(480, Number(text.match(/(\d+)\s*분/)?.[1] || 25)));
  return { subject, kind, due, minutes };
}
export function QuickCapture({
  onSave,
  onDetailed,
}: {
  onSave: (task: Task) => boolean;
  onDetailed: () => void;
}) {
  const [text, setText] = useState('');
  const [overrides, setOverrides] = useState<Partial<ReturnType<typeof parseCapture>>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const parsed = { ...parseCapture(text), ...overrides };
  return (
    <form
      className={'quick-capture ' + (saved ? 'capture-saved' : '')}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() || saved) return;
        try {
          const task: Task = {
            id: uid(),
            title: text.trim(),
            subject: parsed.subject.trim() || '기타',
            kind: parsed.kind,
            due: parsed.due ? iso(at(parsed.due, '23:59')) : null,
            minutes: parsed.minutes,
            remaining: parsed.minutes,
            priority: 2,
            status: 'todo',
            submitted: false,
            optional: false,
            notes: '',
            link: '',
          };
          if (onSave(task)) setSaved(true);
        } catch {
          setError('마감과 예상 시간을 확인하세요.');
        }
      }}
    >
      <p className="capture-eyebrow">CAPTURE NOW. CLEAR YOUR MIND.</p>
      <label className="capture-input">
        <span className="sr-only">할 일을 한 문장으로</span>
        <textarea
          autoFocus
          rows={2}
          maxLength={200}
          required
          placeholder="내일 수학 숙제 20문제"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
      </label>
      <div className="capture-chips">
        <label>
          <span>과목</span>
          <input
            aria-label="빠른 등록 과목"
            value={parsed.subject}
            maxLength={200}
            onChange={(e) => setOverrides({ ...overrides, subject: e.target.value })}
          />
        </label>
        <label>
          <span>마감 · KST</span>
          <input
            aria-label="빠른 등록 마감"
            type="date"
            value={parsed.due}
            onChange={(e) => setOverrides({ ...overrides, due: e.target.value })}
          />
        </label>
        <label>
          <span>종류</span>
          <select
            aria-label="빠른 등록 종류"
            value={parsed.kind}
            onChange={(e) => setOverrides({ ...overrides, kind: e.target.value as Task['kind'] })}
          >
            {['숙제', '수행평가', '시험공부', '개인 일정'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          <span>예상 시간 · 분</span>
          <input
            aria-label="빠른 등록 예상 시간"
            type="number"
            min={1}
            max={480}
            required
            value={parsed.minutes}
            onChange={(e) => setOverrides({ ...overrides, minutes: Number(e.target.value) })}
          />
        </label>
      </div>
      <p className="capture-note">
        문장에서 찾은 값입니다. 칩을 눌러 수정하세요. 마감 미입력 시 기한 없이 저장합니다.
      </p>
      {!text && (
        <div className="capture-examples">
          {[
            '금요일까지 수학 학원 숙제 20문제',
            '내일 영어 수행평가 준비',
            '경제 학습지 3장 풀기',
          ].map((x) => (
            <button type="button" key={x} onClick={() => setText(x)}>
              {x}
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}
      <div className="capture-bottom">
        <button type="button" className="text-button" onClick={onDetailed}>
          상세 입력 <Plus size={14} />
        </button>
        <button className="primary" type="submit" disabled={!text.trim() || saved}>
          {saved ? (
            <>
              <Check size={17} /> 저장 완료
            </>
          ) : (
            <>
              오늘에 담기 <CornerDownLeft size={17} />
            </>
          )}
        </button>
      </div>
      <small className="capture-method">규칙 기반 빠른 입력 · AI API 미사용</small>
    </form>
  );
}
