import { useState } from 'react';
import { at, clock, dayKey } from './time';
export type OrbitEvent = { id: string; title: string; start: number; end: number; kind: string };
const point = (angle: number, r: number) => ({
  x: 250 + Math.sin(angle) * r,
  y: 250 - Math.cos(angle) * r,
});
function arc(a: number, b: number, r: number) {
  const p = point(a, r),
    q = point(b, r);
  return `M ${p.x} ${p.y} A ${r} ${r} 0 ${b - a > Math.PI ? 1 : 0} 1 ${q.x} ${q.y}`;
}
export function DayOrbit({ now, events }: { now: number; events: OrbitEvent[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const midnight = at(dayKey(now), '00:00');
  const angle = (n: number) => Math.max(0, Math.min(1, (n - midnight) / 86400000)) * Math.PI * 2;
  const currentAngle = angle(now),
    marker = point(currentAngle, 184);
  const picked = events.find((e) => e.id === selected);
  const active = events.find((e) => e.start <= now && e.end > now);
  return (
    <div className="orbit-system">
      <div className="orbit-coordinate">
        <span>FIG. 01 / DAY ORBIT</span>
        <span>24 H — KST</span>
      </div>
      <div className="orbit-face">
        <svg
          viewBox="0 0 500 500"
          className="day-orbit"
          aria-label="24시간 일정 궤도. 아래 일정 버튼으로 구간을 선택하세요"
          role="img"
        >
          <defs>
            <radialGradient id="orbitGlow">
              <stop stopColor="#d4ed91" stopOpacity=".09" />
              <stop offset="1" stopColor="#d4ed91" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="250" cy="250" r="205" fill="url(#orbitGlow)" />
          <circle cx="250" cy="250" r="184" className="orbit-track" />
          <circle cx="250" cy="250" r="150" className="orbit-inner" />
          <circle cx="250" cy="250" r="122" className="orbit-inner orbit-dashed" />
          {Array.from({ length: 96 }, (_, i) => {
            const a = (i / 96) * Math.PI * 2,
              p = point(a, 211),
              q = point(a, i % 4 === 0 ? 221 : 215);
            return (
              <line
                key={i}
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                className={i % 4 === 0 ? 'orbit-tick major' : 'orbit-tick'}
              />
            );
          })}
          {[0, 6, 12, 18].map((h) => {
            const p = point((h / 24) * Math.PI * 2, 240);
            return (
              <text key={h} x={p.x} y={p.y + 4} className="orbit-hour">
                {String(h).padStart(2, '0')}
              </text>
            );
          })}
          {events.map((e) => (
            <path
              key={e.id}
              d={arc(
                angle(e.start) + 0.008,
                Math.max(angle(e.start) + 0.01, angle(e.end) - 0.008),
                e.kind === 'study' ? 164 : 184,
              )}
              className={`orbit-event ${e.kind} ${selected === e.id ? 'chosen' : ''}`}
              onClick={() => setSelected(selected === e.id ? null : e.id)}
            >
              <title>
                {e.title} {clock(e.start)}–{clock(e.end)}
              </title>
            </path>
          ))}
          <path d={arc(0, Math.max(0.001, currentAngle), 150)} className="orbit-elapsed" />
          <line x1="250" y1="250" x2={marker.x} y2={marker.y} className="orbit-hand" />
          <circle cx={marker.x} cy={marker.y} r="8" className="orbit-now-halo" />
          <circle cx={marker.x} cy={marker.y} r="3.5" fill="#def99c" />
          <circle cx="250" cy="250" r="4" fill="#def99c" />
        </svg>
        <div className="orbit-center">
          <span>{picked ? 'SELECTED WINDOW' : 'CURRENT WINDOW'}</span>
          <strong>{picked?.title || active?.title || '자유로운 시간'}</strong>
          <small>
            {picked
              ? `${clock(picked.start)} — ${clock(picked.end)}`
              : `${Math.floor((now - midnight) / 864000)}% OF YOUR DAY`}
          </small>
        </div>
      </div>
      <div className="orbit-legend">
        <span>
          <i />
          학습
        </span>
        <span>
          <i />
          고정 일정
        </span>
        <span>
          <i />
          수면
        </span>
      </div>
      <div className="orbit-picks" aria-label="궤도 구간 선택">
        {events
          .filter((e) => e.end > now)
          .slice(0, 5)
          .map((e) => (
            <button
              key={e.id}
              aria-pressed={selected === e.id}
              onClick={() => setSelected(selected === e.id ? null : e.id)}
            >
              {clock(e.start)} <span>{e.title}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
