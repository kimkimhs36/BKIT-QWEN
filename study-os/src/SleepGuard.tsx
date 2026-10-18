import { useEffect, useState, useRef } from 'react';
import { Moon, Settings2, X, Check, Coffee, Sun, Smartphone, Wind } from 'lucide-react';
import {
  SLEEP_STORAGE_KEY, readSleepSettings,
  sleepStatus, type SleepSettings,
} from './sleepGuardLogic';

const DEVICE_SETUP_KEY = 'bkit.sleep-devices.v1';
type DeviceSetup = { iphone: boolean; ipad: boolean };
function loadDeviceSetup(): DeviceSetup {
  try {
    const saved = JSON.parse(window.localStorage.getItem(DEVICE_SETUP_KEY) || '{}') as Partial<DeviceSetup>;
    return { iphone: saved.iphone === true, ipad: saved.ipad === true };
  } catch { return { iphone: false, ipad: false }; }
}

/** Intentionally offline / zero AI calls, and opt-in. Does not pretend to detect actual sleep. */
export function SleepGuard() {
  const [settings, setSettings] = useState<SleepSettings>(readSleepSettings);
  const [now, setNow] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const [showRoutine, setShowRoutine] = useState(false);
  const [showDeviceGuide, setShowDeviceGuide] = useState(false);
  const [deviceSetup, setDeviceSetup] = useState<DeviceSetup>(loadDeviceSetup);
  const dialogRef = useRef<HTMLElement | null>(null);
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
    try { window.localStorage.setItem(DEVICE_SETUP_KEY, JSON.stringify(deviceSetup)); } catch { /* private mode */ }
  }, [deviceSetup]);

  // Prevent keyboard focus from drifting into the Study OS behind a modal.
  useEffect(() => {
    if (!editing && !showRoutine && !status.showGuard) return;
    const dialog = document.querySelector<HTMLElement>(
      editing ? '.bkit-sleep-sheet[role="dialog"]' :
      status.showGuard ? '.bkit-sleep-night[role="dialog"]' : '.bkit-sleep-sheet[role="dialog"]',
    );
    if (!dialog) return;
    dialogRef.current = dialog;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editing) { e.preventDefault(); setEditing(false); return; }
      if (e.key === 'Escape' && showRoutine && !status.showGuard) { e.preventDefault(); setShowRoutine(false); return; }
      if (e.key !== 'Tab') return;
      const options = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      )).filter((el) => el.getClientRects().length > 0);
      if (!options.length) { e.preventDefault(); return; }
      const first = options[0], last = options[options.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      dialogRef.current = null;
    };
  }, [editing, showRoutine, status.showGuard]);

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
  const startRestNow = () => {
    // Explicit voluntary rest starts a quiet screen now; it does not report actual sleep.
    change({ enabled: true, restUntil: Date.now() + 10 * 60 * 60_000, postponeUntil: 0 });
    setEditing(false);
    setShowRoutine(false);
    setNow(new Date());
  };
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
              <span>화면 내려놓기 목표 {status.screenOffAt} · 취침 {status.bedtime}</span>
              <button type="button" onClick={() => setShowRoutine(true)}>마무리하기</button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="bkit-sleep-backdrop" role="presentation">
          <section className="bkit-sleep-sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="bkit-sleep-settings-heading">
            <div className="bkit-sleep-head">
              <div><span className="bkit-sleep-eyebrow">BKIT · SLEEP GUARD</span>
                <h2 id="bkit-sleep-settings-heading"><Settings2 size={19} aria-hidden="true" /> 수면 보호 설정</h2></div>
              <button type="button" className="bkit-sleep-icon" aria-label="설정 닫기" onClick={() => setEditing(false)}><X size={20} /></button>
            </div>
            <p>수면 가드는 실제로 잠들었는지 측정하지 않아. BKIT 화면을 보고 있을 때 취침 시간에 맞춰 안내해. 웹을 닫거나 다른 앱을 쓰고 있으면 기기를 잠그거나 사용 여부를 감지할 수 없어.</p>
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
              <span>화면 내려놓기 <strong>{status.screenOffAt}</strong> → 침대에 들 목표 <strong>{status.bedtime}</strong> → 기상 <strong>{status.wakeTomorrow}</strong></span>
            </div>
            <p className="bkit-sleep-detail">이 시각은 실제 잠든 시간을 측정한 결과가 아닌 <b>목표 일정</b>이야. Apple 스크린 타임은 첫 번째 시각부터 제한을 거는 편이 좋아.</p>
            <p className="bkit-sleep-detail">기본값은 07:00 기상 / 8시간 30분이야. 실제 잠드는 데 시간이 걸리므로 취침 준비는 1시간 전에 시작하는 것이 좋아.</p>
            <div className="bkit-sleep-device">
              <strong><Smartphone size={17} aria-hidden="true" /> iPhone · iPad가 우선</strong>
              <p>BKIT 웹을 보고 있지 않은 밤에는 여기의 수면 화면이 나타나지 않아. 실제 앱 사용 중단은 Apple 스크린 타임으로 설정해야 해.</p>
              <button type="button" className="bkit-sleep-guide-toggle" aria-expanded={showDeviceGuide} onClick={() => setShowDeviceGuide((prev) => !prev)}>
                {showDeviceGuide ? '설정 방법 접기' : 'iPhone · iPad 취침 제한 설정 방법'}
              </button>
              <div className="bkit-sleep-device-checks" aria-label="수동 설정 체크리스트">
                <label><input type="checkbox" checked={deviceSetup.iphone} onChange={(e) => setDeviceSetup((v) => ({ ...v, iphone: e.target.checked }))} /> iPhone에서 직접 설정함</label>
                <label><input type="checkbox" checked={deviceSetup.ipad} onChange={(e) => setDeviceSetup((v) => ({ ...v, ipad: e.target.checked }))} /> iPad에서 직접 설정함</label>
              </div>
              <p className="bkit-sleep-detail">체크는 본인이 설정했다고 표시하는 메모야. BKIT가 Apple 기기 설정을 읽거나 다른 기기의 완료 여부를 확인한 것은 아니야. 브라우저 사이에 자동 공유되지 않아.</p>
              {showDeviceGuide && <div className="bkit-sleep-device-steps">
                <p><b>1.</b> 설정 → 스크린 타임 → 다운타임(시간 지정)에서 {status.screenOffAt}~{status.wakeTomorrow} 제한 설정하기. iOS 버전에 따라 메뉴 이름은 달라질 수 있어.</p>
                <p><b>2.</b> 다운타임 동안 차단 옵션과 항상 허용 앱을 확인하기. 전화·긴급 연락은 유지하기</p>
                <p><b>3.</b> 설정 → 집중 모드 → 수면에서 알림을 줄이고, 건강 앱의 수면 일정을 확인하기</p>
                <p><b>4.</b> 두 기기에서 동일하게 동작하도록 스크린 타임 기기 간 공유 설정을 확인하기</p>
                <a href="https://support.apple.com/ko-kr/guide/iphone/iphbfa595995/ios" target="_blank" rel="noopener noreferrer">Apple 공식 스크린 타임 안내 ↗</a>
              </div>}
            </div>
            <button type="button" className="bkit-sleep-secondary" onClick={startRestNow}><Moon size={17} aria-hidden="true" /> 지금 바로 화면 내려놓기</button>
            <button type="button" className="bkit-sleep-primary" onClick={() => setEditing(false)}><Check size={18} aria-hidden="true" /> 설정 저장하고 닫기</button>
          </section>
        </div>
      )}

      {showRoutine && !status.showGuard && (
        <div className="bkit-sleep-backdrop">
          <section className="bkit-sleep-sheet" role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="bkit-sleep-routine-heading">
            <div className="bkit-sleep-head"><h2 id="bkit-sleep-routine-heading">자기 전 3분 정리</h2>
              <button type="button" className="bkit-sleep-icon" aria-label="닫기" onClick={() => setShowRoutine(false)}><X size={20}/></button></div>
            <ul className="bkit-sleep-checklist">
              <li><Check size={16} /> 공부·개발 작업 마무리하기</li>
              <li><Smartphone size={16} /> iPhone과 iPad는 침대 밖에 두고 화면 끄기</li>
              <li><Wind size={16} /> 조명 낮추고 편안하게 호흡하기</li>
              <li><Sun size={16} /> 내일 아침 자연광 쬐기</li>
            </ul>
            <p className="bkit-sleep-detail">카페인은 오후·저녁에 피하는 게 좋아. 브라우저 화면을 오래 볼 필요는 없어.</p>
            <button type="button" className="bkit-sleep-primary" onClick={() => setShowRoutine(false)}>마무리했어</button>
          </section>
        </div>
      )}

      {status.showGuard && !editing && (
        <div className="bkit-sleep-night" role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="bkit-sleep-night-title">
          <div className="bkit-sleep-night-content">
            <Moon size={31} strokeWidth={1.3} aria-hidden="true" />
            <span className="bkit-sleep-eyebrow">BKIT · GOOD NIGHT</span>
            <h2 id="bkit-sleep-night-title">오늘은 여기까지.</h2>
            <p>내일도 공부할 수 있도록, iPhone과 iPad를 내려놓자.</p>
            <p className="bkit-sleep-night-muted">{status.manualRest ? '스스로 선택한 휴식 시간이야.' : '오늘의 공부가 끝났다면 더 이상 화면을 볼 필요 없어.'} 잠을 빨리 청하려고 애쓰지 않아도 괜찮아.</p>
            <button type="button" className="bkit-sleep-primary" onClick={() => setShowRoutine(true)}>잠들 준비하기</button>
            {showRoutine && (
              <div className="bkit-sleep-night-routine" role="status">
                <p><Check size={15} /> 작업을 마무리하고 기기를 멀리 두기</p>
                <p><Wind size={15} /> 편안하게 숨을 들이쉬고 천천히 내쉬기</p>
                <p><Coffee size={15} /> 늦은 카페인·강한 조명 피하기</p>
              </div>
            )}
            <button type="button" className="bkit-sleep-muted-button" onClick={postpone}>꼭 필요한 일이 있어 · 30분만 연장</button>
            <button type="button" className="bkit-sleep-muted-button" onClick={() => { change({ enabled: false, postponeUntil: 0 }); setEditing(true); }}>수면 가드 설정 변경</button>
          </div>
        </div>
      )}
      <span className="sr-only">수면 가드는 의학적 진단·치료 기능이 아니며 공부를 완료했다고 기록하지 않습니다.</span>
    </div>
  );
}
