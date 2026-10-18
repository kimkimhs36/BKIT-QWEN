import { useEffect, useState } from 'react';
import { Moon, Settings2, X, Check, Coffee, Sun, Smartphone, Wind } from 'lucide-react';
import {
  SLEEP_STORAGE_KEY, readSleepSettings,
  sleepStatus, type SleepSettings,
} from './sleepGuardLogic';

const labelStyle = { fontSize: 13 };

/** Intentionally offline / zero AI calls, and opt-in. Does not pretend to detect actual sleep. */
export function SleepGuard() {
  const [settings, setSettings] = useState<SleepSettings>(readSleepSettings);
  const [now, setNow] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const [showRoutine, setShowRoutine] = useState(false);
  const status = sleepStatus(now, settings);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    const timer = window.setInterval(updateClock, 30_000);
    document.addEventListener('visibilitychange', updateClock);
    window.addEventListener('focus', updateClock);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', updateClock);
      window.removeEventListener('focus', updateClock);
    };
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(SLEEP_STORAGE_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
  }, [settings]);

  useEffect(() => {
    document.documentElement.dataset.bkitSleepGuardActive = String(status.showGuard);
    window.dispatchEvent(new Event('bkit:sleep-guard-state'));
    return () => {
      document.documentElement.dataset.bkitSleepGuardActive = 'false';
      window.dispatchEvent(new Event('bkit:sleep-guard-state'));
    };
  }, [status.showGuard]);

  const change = (patch: Partial<SleepSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));
  const postpone = () => {
    change({ postponeUntil: Date.now() + 30 * 60_000 });
    setNow(new Date());
  };

  return (
    <div className="bkit-sleep" data-enabled={settings.enabled}>
      {!status.showGuard && (
        <div className="bkit-sleep-entry">
          <button
            type="button" className="bkit-sleep-open"
            aria-label="수면 가드 설정 열기" onClick={() => setEditing(true)}
          ><Moon size={17} aria-hidden="true" /> 수면</button>
          {settings.enabled && status.windingDown && (
            <div className="bkit-sleep-notice" role="status">
              <span>취침 준비 · {status.minutesToBed}분 남음</span>
              <button type="button" onClick={() => setShowRoutine(true)}>마무리하기</button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="bkit-sleep-backdrop" role="presentation">
          <section className="bkit-sleep-sheet" role="dialog" aria-modal="true" aria-labelledby="bkit-sleep-settings-heading">
            <div className="bkit-sleep-head">
              <div><span className="bkit-sleep-eyebrow">BKIT · SLEEP GUARD</span>
                <h2 id="bkit-sleep-settings-heading"><Settings2 size={19} aria-hidden="true" /> 수면 보호 설정</h2></div>
              <button type="button" className="bkit-sleep-icon" aria-label="설정 닫기" onClick={() => setEditing(false)}><X size={20} /></button>
            </div>
            <p>수면 가드는 실제로 잠들었는지 측정하지 않아. 설정한 시간에 공부 화면을 잠시 가려, 컴퓨터를 끄고 쉬기 쉽게 도와줘.</p>
            <label className="bkit-sleep-switch">
              <span>수면 가드 사용</span>
              <input type="checkbox" checked={settings.enabled} onChange={(e) => change({ enabled: e.target.checked, postponeUntil: 0 })} />
            </label>
            <div className="bkit-sleep-fields">
              <label><span>평일 기상</span><input aria-label="평일 기상 시각" type="time" value={settings.weekdayWake} onChange={(e) => change({ weekdayWake: e.target.value })} /></label>
              <label><span>주말 기상</span><input aria-label="주말 기상 시각" type="time" value={settings.weekendWake} onChange={(e) => change({ weekendWake: e.target.value })} /></label>
              <label><span>수면 기회</span>
                <select aria-label="목표 수면 시간" value={settings.targetMinutes} onChange={(e) => change({ targetMinutes: Number(e.target.value) })}>
                  <option value={480}>8시간</option><option value={510}>8시간 30분</option>
                  <option value={540}>9시간</option><option value={600}>10시간</option>
                </select>
              </label>
            </div>
            <div className="bkit-sleep-summary"><Moon size={18} aria-hidden="true" />
              <span>오늘 밤 취침 목표 <strong>{status.bedtime}</strong> · 다음 날 기상 <strong>{status.wakeTomorrow}</strong></span>
            </div>
            <p className="bkit-sleep-detail">기본값은 07:00 기상 / 8시간 30분이야. 실제 잠드는 데 시간이 걸리므로 취침 준비는 1시간 전에 시작하는 것이 좋아.</p>
            <button type="button" className="bkit-sleep-primary" onClick={() => setEditing(false)}><Check size={18} aria-hidden="true" /> 저장하고 닫기</button>
          </section>
        </div>
      )}

      {showRoutine && !status.showGuard && (
        <div className="bkit-sleep-backdrop">
          <section className="bkit-sleep-sheet" role="dialog" aria-modal="true" aria-labelledby="bkit-sleep-routine-heading">
            <div className="bkit-sleep-head"><h2 id="bkit-sleep-routine-heading">자기 전 3분 정리</h2>
              <button type="button" className="bkit-sleep-icon" aria-label="닫기" onClick={() => setShowRoutine(false)}><X size={20}/></button></div>
            <ul className="bkit-sleep-checklist">
              <li><Check size={16} /> 공부·개발 작업 마무리하기</li>
              <li><Smartphone size={16} /> 휴대전화는 침대 밖에 놓기</li>
              <li><Wind size={16} /> 조명 낮추고 편안하게 호흡하기</li>
              <li><Sun size={16} /> 내일 아침 자연광 쬐기</li>
            </ul>
            <p className="bkit-sleep-detail">카페인은 오후·저녁에 피하는 게 좋아. 브라우저 화면을 오래 볼 필요는 없어.</p>
            <button type="button" className="bkit-sleep-primary" onClick={() => setShowRoutine(false)}>마무리했어</button>
          </section>
        </div>
      )}

      {status.showGuard && !editing && (
        <div className="bkit-sleep-night" role="dialog" aria-modal="true" aria-labelledby="bkit-sleep-night-title">
          <div className="bkit-sleep-night-content">
            <Moon size={31} strokeWidth={1.3} aria-hidden="true" />
            <span className="bkit-sleep-eyebrow">BKIT · GOOD NIGHT</span>
            <h2 id="bkit-sleep-night-title">오늘은 여기까지.</h2>
            <p>내일도 공부할 수 있도록, 이제 화면을 내려놓자.</p>
            <p className="bkit-sleep-night-muted">일정한 수면이 우선이야. 빨리 잠들려고 애쓰지 않아도 괜찮아.</p>
            <button type="button" className="bkit-sleep-primary" onClick={() => setShowRoutine(true)}>잠들 준비하기</button>
            {showRoutine && (
              <div className="bkit-sleep-night-routine" role="status">
                <p><Check size={15} /> 작업을 마무리하고 기기를 멀리 두기</p>
                <p><Wind size={15} /> 편안하게 숨을 들이쉬고 천천히 내쉬기</p>
                <p><Coffee size={15} /> 늦은 카페인·강한 조명 피하기</p>
              </div>
            )}
            <button type="button" className="bkit-sleep-muted-button" onClick={postpone}>필요한 일이 있어 · 30분만 연장</button>
            <button type="button" className="bkit-sleep-muted-button" onClick={() => { change({ enabled: false, postponeUntil: 0 }); setEditing(true); }}>수면 가드 설정 변경</button>
          </div>
        </div>
      )}
      <span className="sr-only" style={labelStyle} aria-live="off">
        수면 가드는 의학적 진단·치료 기능이 아니며 공부를 마쳤다고 기록하지 않습니다.
      </span>
    </div>
  );
}
