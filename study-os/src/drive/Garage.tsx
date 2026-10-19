import { useState } from 'react';
import { Car } from './Car';
import {
  catalog,
  DAILY_CAP,
  purchase,
  stampLabels,
  transactionLabels,
  type GarageState,
  type Upgrade,
} from './garage';
import type { GarageController } from './useGarage';
import './drive.css';
export function Garage({
  controller,
  onStudy,
  onRace,
  canRace,
}: {
  controller: GarageController;
  onStudy: () => void;
  onRace: () => void;
  canRace: boolean;
}) {
  const { garage: g, update, error } = controller;
  const [confirm, setConfirm] = useState<Upgrade | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [vehicleName, setVehicleName] = useState(g.car.name);
  const [message, setMessage] = useState('');
  async function buy(item: Upgrade) {
    setBusy(true);
    let bought = false;
    const saved = await update((v) => {
      const next = purchase(v, item);
      bought = next !== v;
      return next;
    });
    setMessage(
      saved && bought
        ? catalog[item].label + ' 구매·저장 완료. 나의 사양에서 장착하세요.'
        : saved
          ? '잔액 또는 보유 상태가 바뀌었어요. 비용을 다시 확인하세요.'
          : '구매를 저장하지 못했어요. 잔액을 유지했어요.',
    );
    setBusy(false);
    setConfirm(null);
  }
  function car(patch: Partial<GarageState['car']>) {
    void update((v) => ({ ...v, car: { ...v.car, ...patch } })).then((ok) =>
      setMessage(ok ? '차량 설정 저장 완료' : '차량 설정을 저장하지 못했어요.'),
    );
  }
  return (
    <section className="tohesar" aria-label="TOHEŞAR GARAGE">
      <header className="garage-heading">
        <div>
          <span className="eyebrow">BKIT MOTOR CLUB / 01</span>
          <h2>
            TOHEŞAR <em>GARAGE</em>
          </h2>
          <p>한 문제의 완성, 나만의 자동차.</p>
        </div>
        <div className="credit-wallet">
          <small>STUDY CREDITS</small>
          <strong>
            {g.credits} <span>CR</span>
          </strong>
          <small>
            오늘 {g.day === new Date().toISOString().slice(0, 10) ? g.earnedToday : 0} / {DAILY_CAP}{' '}
            CR
          </small>
        </div>
      </header>
      <p role="status">{message}</p>
      {error && <p role="alert">{error}</p>}
      <div
        className={
          'garage-showroom scene-' +
          g.car.scene +
          ' light-' +
          g.car.lighting +
          (zoom ? ' garage-zoom' : '')
        }
      >
        <span className="garage-edition">T·36 / YOUR STUDY, YOUR DRIVE</span>
        <Car
          car={
            confirm
              ? {
                  ...g.car,
                  ...(confirm === 'aero'
                    ? { wheels: 'aero' as const }
                    : confirm === 'wing'
                      ? { spoiler: true }
                      : {}),
                }
              : g.car
          }
        />
        <button
          className="garage-zoom-button"
          aria-pressed={zoom}
          onClick={() => setZoom((v) => !v)}
        >
          {zoom ? '기본 크기' : '차량 확대'}
        </button>
        <div className="garage-spec">
          <span>
            {g.car.name}
            {confirm ? ' · 부품 미리보기' : ''}
          </span>
          <span>
            {g.car.tune === 'sprint' ? 'SPRINT / 빠른 가속 · 빠른 변속' : 'BALANCED / 편안한 변속'}
          </span>
        </div>
      </div>
      <div className="garage-grid">
        <section className="garage-panel">
          <h3>
            01 <span>나의 사양</span>
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (vehicleName.trim()) car({ name: vehicleName.trim() });
            }}
          >
            <label>
              차량 이름
              <input
                maxLength={32}
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
              />
            </label>
            <button disabled={!vehicleName.trim() || vehicleName === g.car.name}>이름 저장</button>
          </form>
          <fieldset>
            <legend>차체 색상 · 무료</legend>
            <div className="garage-options">
              {(['sage', 'cream', 'coral', 'blue'] as const).map((x, i) => (
                <button
                  key={x}
                  className={'paint paint-' + x}
                  aria-label={['세이지', '크림', '코랄', '블루'][i]}
                  aria-pressed={g.car.color === x}
                  onClick={() => car({ color: x })}
                >
                  <span>{['세이지', '크림', '코랄', '블루'][i]}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            도장 재질
            <select
              aria-label="도장 재질"
              value={g.car.finish}
              onChange={(e) => car({ finish: e.target.value as GarageState['car']['finish'] })}
            >
              <option value="metallic">METALLIC · 메탈릭</option>
              <option value="gloss">GLOSS · 유광</option>
              <option value="matte">MATTE · 무광</option>
            </select>
          </label>
          <label>
            타이어 스타일 · 외형
            <select
              aria-label="타이어 스타일 · 외형"
              value={g.car.tires}
              onChange={(e) => car({ tires: e.target.value as GarageState['car']['tires'] })}
            >
              <option value="street">STREET</option>
              <option value="sport">SPORT · 사이드월 링</option>
            </select>
          </label>
          <label>
            범퍼 · 외형
            <select
              aria-label="범퍼 · 외형"
              value={g.car.bumper}
              onChange={(e) => car({ bumper: e.target.value as GarageState['car']['bumper'] })}
            >
              <option value="touring">TOURING</option>
              <option value="sport">SPORT</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={g.car.skirt}
              onChange={(e) => car({ skirt: e.target.checked })}
            />
            사이드 스커트
          </label>
          <label>
            데칼
            <select
              aria-label="데칼"
              value={g.car.decal}
              onChange={(e) => car({ decal: e.target.value as GarageState['car']['decal'] })}
            >
              <option value="none">CLEAN</option>
              <option value="stripe">TOURING STRIPE</option>
              <option value="number">NUMBER 36</option>
            </select>
          </label>
          <label>
            차고 조명
            <select
              aria-label="차고 조명"
              value={g.car.lighting}
              onChange={(e) => car({ lighting: e.target.value as GarageState['car']['lighting'] })}
            >
              <option value="studio">STUDIO</option>
              <option value="warm">WARM</option>
              <option value="cool">COOL</option>
            </select>
          </label>
          <label>
            휠
            <select
              aria-label="휠"
              value={g.car.wheels}
              onChange={(e) => car({ wheels: e.target.value as 'classic' | 'aero' })}
            >
              <option value="classic">CLASSIC · 기본</option>
              <option value="aero" disabled={!g.owned.includes('aero')}>
                AERO {g.owned.includes('aero') ? '· 보유' : '· 잠김'}
              </option>
            </select>
          </label>
          <label>
            휠 색상 · 무료
            <select
              aria-label="휠 색상 · 무료"
              value={g.car.wheelColor}
              onChange={(e) =>
                car({ wheelColor: e.currentTarget.value as GarageState['car']['wheelColor'] })
              }
            >
              <option value="silver">SILVER</option>
              <option value="graphite">GRAPHITE</option>
              <option value="bronze">BRONZE</option>
            </select>
          </label>
          <label>
            서스펜션 높이 · 외형 전용
            <select
              aria-label="서스펜션 높이 · 외형 전용"
              value={g.car.rideHeight}
              onChange={(e) =>
                car({ rideHeight: e.currentTarget.value as GarageState['car']['rideHeight'] })
              }
            >
              <option value="standard">STANDARD</option>
              <option value="low">LOW</option>
              <option value="raised">RAISED</option>
            </select>
          </label>
          <label>
            스포일러
            <select
              aria-label="스포일러"
              value={String(g.car.spoiler)}
              onChange={(e) => car({ spoiler: e.target.value === 'true' })}
            >
              <option value="false">CLEAN · 기본</option>
              <option value="true" disabled={!g.owned.includes('wing')}>
                TOURING {g.owned.includes('wing') ? '· 보유' : '· 잠김'}
              </option>
            </select>
          </label>
          <label>
            배경 · 무료
            <select
              value={g.car.scene}
              onChange={(e) => car({ scene: e.target.value as GarageState['car']['scene'] })}
            >
              <option value="atelier">ATELIER · 차고</option>
              <option value="dusk">DUSK · 저녁</option>
              <option value="coast">COAST · 해안</option>
            </select>
          </label>
          <label>
            튜닝
            <select
              value={g.car.tune}
              onChange={(e) => car({ tune: e.target.value as 'balanced' | 'sprint' })}
            >
              <option value="balanced">BALANCED</option>
              <option value="sprint" disabled={!g.owned.includes('sprint')}>
                SPRINT {g.owned.includes('sprint') ? '· 보유' : '· 잠김'}
              </option>
            </select>
          </label>
        </section>
        <section className="garage-panel">
          <h3>
            02 <span>학습으로 여는 파츠</span>
          </h3>
          <p>무료 가상 크레딧만 사용해요. 보유한 파츠는 언제든 다시 장착할 수 있어요.</p>
          {(Object.entries(catalog) as [Upgrade, (typeof catalog)[Upgrade]][]).map(([id, item]) => (
            <div className="garage-part" key={id}>
              <div>
                <strong>{item.label}</strong>
                <small>
                  {id === 'sprint'
                    ? '가속 +12% · 변속 구간이 빨라져요'
                    : '외형 전용 · 성능은 동일해요'}
                </small>
              </div>
              <button
                disabled={g.owned.includes(id) || g.credits < item.cost}
                onClick={() => setConfirm(id)}
              >
                {g.owned.includes(id) ? '보유 중' : item.cost + ' CR로 열기'}
              </button>
            </div>
          ))}
          {confirm && (
            <section className="purchase-confirm" aria-label="부품 구매 확인">
              <p>
                {catalog[confirm].label} · {catalog[confirm].cost} CR
                <br />
                현재 {g.credits} CR → 구매 후 {Math.max(0, g.credits - catalog[confirm].cost)} CR
              </p>
              <button
                disabled={busy || g.owned.includes(confirm) || g.credits < catalog[confirm].cost}
                onClick={() => buy(confirm)}
              >
                구매 확정
              </button>
              <button disabled={busy} onClick={() => setConfirm(null)}>
                취소
              </button>
            </section>
          )}
          <details className="garage-ledger">
            <summary>스탬프·크레딧 내역</summary>
            <p>스탬프 {g.stamps.length}개 · 교환하지 않는 학습 성취 기록</p>
            {g.stamps.map((s) => (
              <p key={s.id}>✓ {stampLabels[s.id]}</p>
            ))}
            <p>이전 잔액 {g.credits - g.transactions.reduce((n, t) => n + t.amount, 0)} CR</p>
            <ol>
              {g.transactions
                .slice(-20)
                .reverse()
                .map((t) => (
                  <li key={t.id}>
                    {new Date(t.at).toLocaleDateString()} · {transactionLabels[t.reason]} ·{' '}
                    {t.amount > 0 ? '+' : ''}
                    {t.amount} CR
                  </li>
                ))}
            </ol>
            <p>최근 20건 표시 · 무료·비현금성·양도 불가 · 현금 환전 불가</p>
          </details>
          <details className="garage-ledger">
            <summary>나의 레이스 기록</summary>
            {([200, 400] as const).map((distance) => {
              const best = g.raceRecords
                .filter((r) => r.distance === distance)
                .sort((a, b) => a.elapsed - b.elapsed)[0];
              return (
                <p key={distance}>
                  {distance}m ·{' '}
                  {best
                    ? best.elapsed.toFixed(3) + 's · ' + best.topSpeed.toFixed(1) + 'km/h'
                    : '아직 기록 없음'}
                </p>
              );
            })}
            <p>레이스 시간은 학습 시간·크레딧에 포함하지 않아요.</p>
          </details>
          <details className="garage-ledger">
            <summary>BKIT × TOHEŞAR</summary>
            <p>
              BKIT은 공부의 시작·지속·복귀를 돕는 학습 플랫폼입니다. TOHEŞAR는 자동차를 중심으로
              사진·영상·도시·음악·디자인과 문화를 다루는 독립 브랜드입니다.
            </p>
            <a href="https://tohesar.com" target="_blank" rel="noopener noreferrer">
              TOHEŞAR 공식 사이트 · 선택해서 새 창으로 열기 ↗
            </a>
          </details>
          <p className="garage-policy">
            답안을 제출하고 직접 확인하면 문제당 5 CR, 1분 이상 학습 후 문제 수를 기록해 종료하면 10
            CR. 과제 완료 10 CR·수행평가 15 CR, 다음날 오답 복습 5 CR, 주간 목표 15 CR. 첫 시작은 한
            번만 2 CR. 자료·답안 학습은 중복 지급하지 않아요. 시간만 흐르거나 게임을 해서는 지급되지
            않아요. 하루 최대 100 CR · 설치 이후 활동부터 적용.
          </p>
          <div className="garage-actions">
            <button className="primary" onClick={onStudy}>
              집중하러 가기 ↗
            </button>
            <button className="secondary" onClick={onRace} disabled={!canRace}>
              DRAG RACE · 3분 쉬기
            </button>
          </div>
          {!canRace && <p>학습 타이머를 일시정지한 뒤 휴식을 시작해 주세요.</p>}
        </section>
        <section className="garage-panel garage-preferences">
          <h3>
            03 <span>조용한 드라이브</span>
          </h3>
          <label>
            <input
              type="checkbox"
              checked={g.reduceMotion}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                update((v) => ({ ...v, reduceMotion: checked }));
              }}
            />
            모션 감소
          </label>
          <label>
            <input
              type="checkbox"
              checked={g.hideAnimations}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                update((v) => ({ ...v, hideAnimations: checked }));
              }}
            />
            애니메이션 숨기기
          </label>
          <p>
            기기의 모션 감소 설정도 자동으로 따릅니다. 차량 설정은 DRIVE와 레이스에서 함께 사용해요.
          </p>
        </section>
      </div>
    </section>
  );
}
