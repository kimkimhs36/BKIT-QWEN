import { Car } from './Car';
import { catalog, DAILY_CAP, purchase, type GarageState, type Upgrade } from './garage';
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
  function car(patch: Partial<GarageState['car']>) {
    update((v) => ({ ...v, car: { ...v.car, ...patch } }));
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
      {error && <p role="alert">{error}</p>}
      <div className={'garage-showroom scene-' + g.car.scene}>
        <span className="garage-edition">T·36 / YOUR STUDY, YOUR DRIVE</span>
        <Car car={g.car} />
        <div className="garage-spec">
          <span>TOURING 36</span>
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
            휠
            <select
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
            스포일러
            <select
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
                onClick={() => update((v) => purchase(v, id))}
              >
                {g.owned.includes(id) ? '보유 중' : item.cost + ' CR로 열기'}
              </button>
            </div>
          ))}
          <p className="garage-policy">
            답안을 제출하고 직접 확인하면 문제당 5 CR, 1분 이상 학습 후 문제 수를 기록해 종료하면 10
            CR. 자료·답안 학습은 중복 지급하지 않아요. 시간만 흐르거나 게임을 해서는 지급되지
            않아요. 하루 최대 100 CR · 설치 이후 활동부터 적용.
          </p>
          <div className="garage-actions">
            <button className="primary" onClick={onStudy}>
              집중하러 가기 ↗
            </button>
            <button className="secondary" onClick={onRace} disabled={!canRace}>
              DRAG RACE · 3분 휴식
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
              onChange={(e) => update((v) => ({ ...v, reduceMotion: e.target.checked }))}
            />
            모션 감소
          </label>
          <label>
            <input
              type="checkbox"
              checked={g.hideAnimations}
              onChange={(e) => update((v) => ({ ...v, hideAnimations: e.target.checked }))}
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
