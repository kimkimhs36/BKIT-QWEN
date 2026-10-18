import { useRef, useState, type FormEvent } from 'react';
import { Moon, Sunrise, ArrowRight, Check, Download, Trash2 } from 'lucide-react';
import {
  CHECKS,
  sleepLocalInput,
  sleepFromInput,
  SLEEP_KEY,
  sleepDaySchema,
  sleepSchema,
  updateSleepRecord,
  type SleepRecord,
} from './sleep';
import type { SleepController } from './useSleepGuard';
import { storeSleepPhoto, getSleepPhoto, deleteSleepPhoto } from './sleepMedia';
import { PrivatePhotoCard } from './StudyAtelier';
import './sleep-guard.css';
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const timeLabel = (at: number | string) =>
  new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const dateLabel = (at: number | string) =>
  new Date(at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
function exportSleep() {
  const url = URL.createObjectURL(
    new Blob([localStorage.getItem(SLEEP_KEY) || '{}'], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bkit-sleep-guard.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function RecordEditor({
  record,
  onSave,
}: {
  record: SleepRecord;
  onSave: (patch: Partial<SleepRecord>) => boolean;
}) {
  const [message, setMessage] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const bed = String(f.get('actualBed') || ''),
      wake = String(f.get('actualWake') || '');
    if (bed && wake && sleepFromInput(wake) <= sleepFromInput(bed)) {
      setMessage('기상 시각은 취침 시각보다 뒤여야 합니다. 날짜도 확인해 주세요.');
      return;
    }
    if (
      onSave({
        actualBed: bed ? sleepFromInput(bed) : null,
        actualWake: wake ? sleepFromInput(wake) : null,
        reflection: String(f.get('reflection')),
      })
    )
      setMessage('수면 회고를 저장했습니다.');
  }
  return (
    <form className="sleep-record-form" onSubmit={submit}>
      <p>
        목표 {dateLabel(record.targetBed)} {timeLabel(record.targetBed)} →{' '}
        {dateLabel(record.targetWake)} {timeLabel(record.targetWake)} · 준비{' '}
        {record.checks.filter(Boolean).length}/4
      </p>
      <p className="sleep-muted">자동 감지하지 않습니다. 기억하는 시각을 직접 입력해 주세요.</p>
      <div className="sleep-fields">
        <label>
          확인한 실제 취침
          <input
            name="actualBed"
            type="datetime-local"
            defaultValue={record.actualBed ? sleepLocalInput(record.actualBed) : ''}
          />
        </label>
        <label>
          실제 기상
          <input
            name="actualWake"
            type="datetime-local"
            defaultValue={record.actualWake ? sleepLocalInput(record.actualWake) : ''}
          />
        </label>
      </div>
      <label>
        간단한 수면 회고
        <textarea
          aria-label="간단한 수면 회고"
          name="reflection"
          maxLength={1000}
          defaultValue={record.reflection}
          placeholder="아침의 기분, 내일 바꾸고 싶은 한 가지"
        />
      </label>
      <button className="sleep-primary" type="submit">
        회고 저장
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
export function SleepGuard({
  guard,
  now,
  onStudy,
}: {
  guard: SleepController;
  now: number;
  onStudy: () => void;
}) {
  const { state, status, commit, error, blocked } = guard;
  const [message, setMessage] = useState('');
  const [day, setDay] = useState(new Date(now).getDay());
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoLock = useRef(false);
  const todayRecord = state.records.find((r) => r.date === status.key);
  const [recordDate, setRecordDate] = useState('');
  const record = state.records.find((r) => r.date === recordDate) || state.records.at(-1);
  function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const result = sleepDaySchema.safeParse({ bed: f.get('bed'), wake: f.get('wake') });
    if (!result.success) {
      setMessage('취침·기상을 확인해 주세요. 수면 일정은 1시간 이상 16시간 이하입니다.');
      return;
    }
    const all = f.has('allDays');
    if (
      commit((s) => ({
        ...s,
        schedule: s.schedule.map((v, i) => (all || i === day ? result.data : v)),
        manualUntil: 0,
      }))
    )
      setMessage(
        all ? '모든 요일에 일정을 저장했습니다.' : `${DAYS[day]}요일 일정을 저장했습니다.`,
      );
  }
  async function requestNotifications() {
    if (!('Notification' in window) || !isSecureContext) {
      setMessage('이 브라우저는 알림을 지원하지 않습니다. 앱 안의 준비 상태를 이용해 주세요.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      commit((s) => ({ ...s, reminders: permission === 'granted' }));
      setMessage(
        permission === 'granted'
          ? '앱이 열려 있을 때 준비·취침 알림을 각각 한 번 안내합니다.'
          : '알림 권한이 없어도 모든 체크와 기록을 사용할 수 있습니다.',
      );
    } catch {
      setMessage('알림을 허용하지 못했습니다. 수면 일정과 기록은 계속 사용할 수 있습니다.');
    }
  }
  const check = (index: number, value: boolean) =>
    commit((s) =>
      updateSleepRecord(s, status, (r) => ({
        ...r,
        checks: r.checks.map((v, i) => (i === index ? value : v)),
        actualBed: index === 3 && value && !r.actualBed ? new Date(now).toISOString() : r.actualBed,
      })),
    );
  return (
    <section className="sleep-page" aria-label="Sleep Guard">
      <div className="sleep-hero">
        <div>
          <span className="sleep-eyebrow">REST IS PART OF PROGRESS</span>
          <h2>
            내일을 위한
            <br />
            조용한 마무리.
          </h2>
          <p>공부를 정리하고, 나의 속도로 하루를 닫아요.</p>
        </div>
        <div className="sleep-orb" aria-hidden="true">
          <Moon size={46} strokeWidth={1} />
        </div>
      </div>
      {error && (
        <p className="sleep-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="sleep-message" role="status">
          {message}
        </p>
      )}
      <div className="sleep-layout">
        <div className="sleep-stack">
          <section className="sleep-card">
            <div className="sleep-card-head">
              <h2>
                <Moon size={19} /> 나의 수면 일정
              </h2>
              <label className="sleep-toggle">
                <input
                  type="checkbox"
                  checked={state.enabled}
                  disabled={blocked}
                  onChange={(e) =>
                    commit((s) => ({
                      ...s,
                      enabled: e.target.checked,
                      manualUntil: 0,
                      pausedUntil: 0,
                    }))
                  }
                />{' '}
                Sleep Guard 사용
              </label>
            </div>
            <p className="sleep-state" role="status">
              {!state.enabled
                ? '꺼짐 · 일정을 설정하고 켜 주세요.'
                : status.skipped
                  ? '오늘만 건너뛰는 중'
                  : status.paused
                    ? `${timeLabel(state.pausedUntil)}까지 일시 중지`
                    : status.studying
                      ? '공부 중 · 야간 화면 자동 전환을 쉬고 있어요.'
                      : status.phase === 'prepare'
                        ? '취침 60분 전 · 준비할 시간이에요.'
                        : status.phase === 'night'
                          ? '취침 시간 · 화면의 밝기를 낮춰요.'
                          : '낮 시간 · 오늘도 나의 속도로.'}
            </p>
            <div className="sleep-window">
              <span>
                목표 취침<strong>{timeLabel(status.bed)}</strong>
                <small>{dateLabel(status.bed)}</small>
              </span>
              <ArrowRight aria-hidden="true" />
              <span>
                목표 기상<strong>{timeLabel(status.wake)}</strong>
                <small>{dateLabel(status.wake)}</small>
              </span>
            </div>
            <p className="sleep-muted">
              취침 날짜의 요일 기준 · 준비 시작 {dateLabel(status.prepare)}{' '}
              {timeLabel(status.prepare)} · 기기 현지 시간대
            </p>
            <form onSubmit={saveSchedule} key={day + JSON.stringify(state.schedule[day])}>
              <label>
                변경할 요일
                <select
                  aria-label="변경할 요일"
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                >
                  {DAYS.map((d, i) => (
                    <option value={i} key={d}>
                      {d}요일
                    </option>
                  ))}
                </select>
              </label>
              <div className="sleep-fields">
                <label>
                  목표 취침 시각
                  <input type="time" name="bed" required defaultValue={state.schedule[day].bed} />
                </label>
                <label>
                  목표 기상 시각
                  <input type="time" name="wake" required defaultValue={state.schedule[day].wake} />
                </label>
              </div>
              <label className="sleep-check">
                <input type="checkbox" name="allDays" /> 모든 요일에 적용
              </label>
              <button className="sleep-primary" disabled={blocked}>
                수면 일정 저장
              </button>
            </form>
            <details className="sleep-week">
              <summary>요일별 일정 보기</summary>
              <ul>
                {state.schedule.map((s, i) => (
                  <li key={i}>
                    <b>{DAYS[i]}</b>
                    <span>
                      {s.bed} → {s.wake}
                      {s.wake <= s.bed ? ' (다음 날)' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </section>
          <section className="sleep-card">
            <h2>
              <Check size={19} /> 취침 준비
            </h2>
            <p className="sleep-muted">
              {dateLabel(status.bed)} 밤 · 직접 확인하는 체크예요. 체크만으로 충분합니다.
            </p>
            <div className="sleep-checklist">
              {CHECKS.map((label, i) => (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={todayRecord?.checks[i] || false}
                    disabled={blocked}
                    onChange={(e) => check(i, e.target.checked)}
                  />
                  <span>{label}</span>
                  {i === 3 && <small>현재 시각을 취침 확인으로 기록</small>}
                </label>
              ))}
            </div>
            <p className="sleep-muted">
              ‘누웠음’은 잠든 시각의 자동 측정이 아닙니다. 실제 시각은 회고에서 수정할 수 있어요.
            </p>
            <details>
              <summary>선택 · 기기 내부 사진 인증</summary>
              <p className="sleep-muted">
                사진은 이 브라우저에만 저장하며 업로드하지 않습니다. 수면 JSON 백업에는 사진 원본이
                포함되지 않습니다.
              </p>
              <label className="sleep-upload">
                인증 사진 첨부 (최대 2장)
                <input
                  type="file"
                  accept="image/*"
                  disabled={photoBusy || blocked || (todayRecord?.photoIds.length || 0) >= 2}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file || photoLock.current) return;
                    photoLock.current = true;
                    setPhotoBusy(true);
                    const window = { ...status };
                    try {
                      const id = await storeSleepPhoto(file, todayRecord?.photoIds || []);
                      const saved = commit((s) =>
                        updateSleepRecord(s, window, (r) => ({
                          ...r,
                          photoIds: [...new Set([...r.photoIds, id])],
                        })),
                      );
                      if (!saved && !(todayRecord?.photoIds || []).includes(id))
                        await deleteSleepPhoto(id);
                    } catch {
                      setMessage(
                        '사진을 저장하지 못했습니다. JPEG·PNG 사진과 저장 공간을 확인해 주세요. 체크 인증은 계속 가능합니다.',
                      );
                    } finally {
                      photoLock.current = false;
                      setPhotoBusy(false);
                    }
                  }}
                />
              </label>
              <div className="sleep-photos">
                {todayRecord?.photoIds.map((id) => (
                  <PrivatePhotoCard
                    loadPhoto={getSleepPhoto}
                    key={id}
                    id={id}
                    onRemove={() => {
                      if (
                        commit((s) =>
                          updateSleepRecord(s, status, (r) => ({
                            ...r,
                            photoIds: r.photoIds.filter((p) => p !== id),
                          })),
                        )
                      )
                        void deleteSleepPhoto(id).catch(() =>
                          setMessage('사진 파일을 지우지 못했습니다. 저장 공간을 확인해 주세요.'),
                        );
                    }}
                  />
                ))}
              </div>
            </details>
            <div className="sleep-actions">
              <button
                className="sleep-primary"
                disabled={blocked || status.studying}
                onClick={() =>
                  commit((s) => ({
                    ...s,
                    enabled: true,
                    skipped: s.skipped.filter((d) => d !== status.key),
                    pausedUntil: 0,
                    dismissedNight: null,
                    manualUntil: Math.min(status.wake, now + 8 * 3600000),
                  }))
                }
              >
                야간 화면 시작
              </button>
              <button
                onClick={() =>
                  commit((s) => ({ ...s, manualUntil: 0, dismissedNight: status.key }))
                }
              >
                야간 화면 종료
              </button>
            </div>
          </section>
        </div>
        <div className="sleep-stack">
          <section className="sleep-card">
            <h2>
              <Sunrise size={19} /> 다음 날의 기록
            </h2>
            {!record ? (
              <>
                <p>첫 체크를 남기면 이곳에 밤의 기록이 생겨요.</p>
                <button
                  disabled={blocked}
                  onClick={() => commit((s) => updateSleepRecord(s, status, (r) => r))}
                >
                  오늘 수면 기록 만들기
                </button>
              </>
            ) : (
              <>
                <label>
                  회고할 밤
                  <select
                    aria-label="회고할 밤"
                    value={record.date}
                    onChange={(e) => setRecordDate(e.target.value)}
                  >
                    {[...state.records].reverse().map((r) => (
                      <option key={r.date} value={r.date}>
                        {r.date}
                      </option>
                    ))}
                  </select>
                </label>
                {!!record.photoIds.length && (
                  <details>
                    <summary>이 밤의 기기 내부 인증 사진</summary>
                    <div className="sleep-photos">
                      {record.photoIds.map((id) => (
                        <PrivatePhotoCard loadPhoto={getSleepPhoto} key={id} id={id} />
                      ))}
                    </div>
                  </details>
                )}
                <RecordEditor
                  key={record.date}
                  record={record}
                  onSave={(patch) =>
                    commit((s) => ({
                      ...s,
                      records: s.records.map((r) =>
                        r.date === record.date ? { ...r, ...patch } : r,
                      ),
                    }))
                  }
                />
                <button
                  className="sleep-danger"
                  disabled={blocked}
                  onClick={() => {
                    if (
                      !confirm('선택한 밤의 기록과 인증 사진을 삭제할까요? 공부 기록은 유지됩니다.')
                    )
                      return;
                    if (
                      commit((s) => ({
                        ...s,
                        records: s.records.filter((r) => r.date !== record.date),
                      }))
                    ) {
                      setRecordDate('');
                      void Promise.all(record.photoIds.map(deleteSleepPhoto)).catch(() =>
                        setMessage('일부 사진 파일을 삭제하지 못했습니다.'),
                      );
                    }
                  }}
                >
                  <Trash2 size={16} /> 이 수면 기록 삭제
                </button>
              </>
            )}
          </section>
          <section className="sleep-card">
            <h2>나에게 맞게 조절하기</h2>
            <div className="sleep-actions">
              <button
                disabled={blocked}
                onClick={() =>
                  commit((s) => ({
                    ...s,
                    skipped: status.skipped
                      ? s.skipped.filter((d) => d !== status.key)
                      : [...s.skipped.slice(-365), status.key],
                    manualUntil: 0,
                  }))
                }
              >
                {status.skipped ? '오늘 건너뛰기 취소' : '오늘만 건너뛰기'}
              </button>
              <button
                disabled={blocked}
                onClick={() =>
                  commit((s) => ({
                    ...s,
                    pausedUntil: status.paused ? 0 : now + 3600000,
                    manualUntil: 0,
                  }))
                }
              >
                {status.paused ? '일시 중지 해제' : '1시간 일시 중지'}
              </button>
            </div>
            <p>
              공부 중에는 야간 화면을 자동으로 적용하지 않아요. 언제든 나가서 공부를 계속할 수
              있습니다.
            </p>
            <button onClick={onStudy}>
              집중 화면으로 이동 <ArrowRight size={16} />
            </button>
          </section>
          <section className="sleep-card">
            <h2>알림과 기기 설정</h2>
            <p>
              알림 지원:{' '}
              {typeof Notification === 'undefined'
                ? '미지원'
                : Notification.permission === 'granted'
                  ? '허용됨'
                  : Notification.permission === 'denied'
                    ? '권한 거부됨'
                    : '권한 요청 전'}{' '}
              ·{' '}
              {window.matchMedia('(display-mode: standalone)').matches
                ? '설치형 PWA'
                : '브라우저에서 사용 중'}
            </p>
            <p className="sleep-muted">
              앱이 열려 있는 동안에만 취침 60분 전·취침 시각에 알립니다. 백그라운드 예약 알림은
              지원하지 않으며 정확한 전달을 보장하지 않습니다.
            </p>
            {state.reminders ? (
              <button onClick={() => commit((s) => ({ ...s, reminders: false }))}>
                수면 알림 끄기
              </button>
            ) : (
              <button disabled={blocked} onClick={() => void requestNotifications()}>
                브라우저 알림 켜기
              </button>
            )}
            <details>
              <summary>iPhone · iPad · Galaxy 안내</summary>
              <p>
                iPhone·iPad Safari에서는 공유 → 홈 화면에 추가로 설치하세요. 알림은 iOS 16.4 이상
                설치형 웹 앱에서 지원됩니다. Galaxy와 PC는 브라우저의 설치 메뉴를 확인하세요.
              </p>
              <p>
                다른 앱 제한은 iPhone 설정 → 스크린 타임 → 다운타임에서 직접 설정하세요. BKIT는 다른
                앱을 잠그거나 운영체제 설정을 변경할 수 없습니다. Galaxy는 설정 → 디지털 웰빙의 수면
                모드를 이용할 수 있어요.
              </p>
              <a
                href="https://support.apple.com/ko-kr/guide/iphone/iphbfa595995/ios"
                target="_blank"
                rel="noopener noreferrer"
              >
                Apple 공식 스크린 타임 안내 ↗
              </a>
            </details>
          </section>
          <section className="sleep-card">
            <h2>내 기기의 수면 데이터</h2>
            <p className="sleep-muted">
              학습 데이터와 별도로 보관합니다. 브라우저 데이터를 지우면 사라질 수 있으니 백업을
              보관하세요.
            </p>
            <button onClick={exportSleep}>
              <Download size={16} /> 수면 원본 백업
            </button>
            <label className="sleep-upload">
              수면 백업 복구
              <input
                type="file"
                accept="application/json,.json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  try {
                    if (file.size > 5_000_000) throw new Error();
                    const incoming = sleepSchema.parse(JSON.parse(await file.text()));
                    if (
                      confirm(
                        '현재 수면 기록을 이 백업으로 교체할까요? 먼저 현재 원본 백업을 보관해 주세요. 사진은 원래 기기에 남아 있습니다.',
                      )
                    ) {
                      if (guard.restore(incoming)) setMessage('수면 백업을 복구했습니다.');
                    }
                  } catch {
                    setMessage('유효한 Sleep Guard 3.0 백업이 아닙니다. 기존 데이터는 유지됩니다.');
                  }
                }}
              />
            </label>
          </section>
        </div>
      </div>
    </section>
  );
}
