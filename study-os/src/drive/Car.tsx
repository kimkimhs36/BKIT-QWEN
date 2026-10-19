import { useId } from 'react';
import type { GarageState } from './garage';
const colors = { sage: '#87a99b', cream: '#d9c99e', coral: '#bb6e61', blue: '#648ba6' };
export const vehicleCatalog = [
  {
    id: 'touring-36',
    name: 'TOURING 36',
    description: '오리지널 컴팩트 그랜드 투어러',
    slots: ['paint', 'wheels', 'suspension', 'aero', 'trim'],
  },
] as const;
/** Original Touring 36: one shared body, wheel and trim model for every screen. */
export function Car({ car, className = '' }: { car: GarageState['car']; className?: string }) {
  const id = useId().replace(/:/g, '');
  const body = `${id}-paint`,
    glass = `${id}-glass`,
    rim = `${id}-rim`;
  const color = colors[car.color];
  const wheelColor = { silver: '#d6ddd9', graphite: '#58625e', bronze: '#b49b70' }[car.wheelColor];
  const height = car.rideHeight === 'low' ? 4 : car.rideHeight === 'raised' ? -4 : 0;
  return (
    <svg
      className={'tohesar-car ' + className}
      viewBox="0 0 360 145"
      role="img"
      aria-label="TOHEŞAR 커스텀 자동차"
      data-color={car.color}
      data-finish={car.finish}
      data-trim={car.bumper}
    >
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={color} />
          <stop offset=".48" stopColor={car.finish === 'matte' ? color : '#d3ded6'} />
          <stop offset=".51" stopColor={color} />
          <stop offset="1" stopColor={car.finish === 'matte' ? color : '#3e5550'} />
        </linearGradient>
        <linearGradient id={glass} x2=".8" y2="1">
          <stop stopColor="#77939a" />
          <stop offset=".45" stopColor="#344c55" />
          <stop offset="1" stopColor="#182c34" />
        </linearGradient>
        <radialGradient id={rim}>
          <stop stopColor={wheelColor} />
          <stop offset=".7" stopColor={wheelColor} />
          <stop offset="1" stopColor="#394540" />
        </radialGradient>
      </defs>
      <ellipse cx="182" cy="135" rx="155" ry="5" fill="#10201d" opacity=".16" />
      <path d="M44 114h277" stroke="#172923" strokeWidth="6" />
      <g data-layer="body" transform={`translate(0 ${height})`}>
        {car.spoiler && (
          <g fill="#283b39">
            <path d="M44 76v-15h5v14m17-6V58h5v12" />
            <path d="m30 58 53-7 3 5-54 8Z" />
          </g>
        )}
        <path
          d="M24 96q1-9 12-12l50-15 38-30q8-6 20-6h68q17 0 29 15l26 23 55 12q15 4 16 17v13h-36a27 27 0 0 0-54 0H115a27 27 0 0 0-54 0H24Z"
          fill={`url(#${body})`}
          stroke="#314742"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="m101 68 31-25q5-4 15-4h21v29Zm74-29h37q11 0 22 12l19 18h-78Z"
          fill={`url(#${glass})`}
          stroke="#526760"
          strokeWidth="1.5"
        />
        <path
          d="m110 64 26-21h14m31 0h29q9 0 16 8"
          fill="none"
          stroke="#bdd2d2"
          strokeWidth="1"
          opacity=".65"
        />
        <path
          d="M174 74v35M117 77l-3 21m66-20h13m66-9 10 5"
          fill="none"
          stroke="#243c37"
          strokeWidth="1.3"
        />
        <path
          d="M33 83 91 73h166l64 13"
          stroke="#fff"
          opacity={car.finish === 'matte' ? '.12' : '.5'}
          strokeWidth={car.finish === 'gloss' ? '2.5' : '1.3'}
          fill="none"
        />
        <path d="m30 91 19-4v9l-22 3m289-10 19 4v6l-18-1Z" fill="#e7efd8" />
        <path d="m30 91 12-2v8l-14 1" fill="#a84638" />
        <path d="m319 91 14 4" stroke="#fff6df" strokeWidth="2" />
        <path d="M26 106h29m66 3h121m65-3h27" stroke="#344a44" strokeWidth="4" />
        {car.bumper === 'sport' && (
          <g fill="#253a36">
            <path d="m24 109 33-2 2 7H23Zm279-2 35 3 2 5h-38Z" />
            <path d="m318 100 18 1v4h-18Z" />
          </g>
        )}
        {car.skirt && (
          <path d="m117 109 128-1-2 7H118Z" fill="#334b45" stroke={color} strokeWidth="2" />
        )}
        {car.decal === 'stripe' && (
          <path d="M38 81 90 70h167l65 14" fill="none" stroke="#f0e8d0" strokeWidth="3" />
        )}
        {car.decal === 'number' && (
          <g>
            <rect x="195" y="82" width="25" height="21" rx="3" fill="#ece9da" />
            <text
              x="207.5"
              y="97"
              fill="#34443e"
              textAnchor="middle"
              fontSize="13"
              fontFamily="sans-serif"
              fontWeight="700"
            >
              36
            </text>
          </g>
        )}
        {car.finish === 'metallic' && (
          <path
            d="M128 37h87M50 82l39-10m143 2 43 7"
            stroke="#f5f3db"
            strokeWidth=".7"
            opacity=".7"
          />
        )}
      </g>
      {[88, 275].map((x) => (
        <g key={x} className="car-wheel" style={{ transformOrigin: `${x}px 113px` }}>
          <circle cx={x} cy="113" r="23" fill="#1b2726" />
          <circle
            cx={x}
            cy="113"
            r="21"
            fill="none"
            stroke={car.tires === 'sport' ? '#a2a994' : '#35413e'}
            strokeWidth={car.tires === 'sport' ? '1.2' : '1'}
          />
          <circle cx={x} cy="113" r="16" fill={`url(#${rim})`} stroke="#0f2421" strokeWidth="1.5" />
          <circle cx={x} cy="113" r="11.5" fill="#253631" />
          {Array.from({ length: car.wheels === 'aero' ? 6 : 5 }, (_, i) => (
            <path
              key={i}
              d={
                car.wheels === 'aero'
                  ? `M${x - 2} 110l-4-10 7 2 2 10Z`
                  : `M${x - 1.7} 111l-.7-11h4.8l-.7 11Z`
              }
              fill={wheelColor}
              transform={`rotate(${i * (car.wheels === 'aero' ? 60 : 72)} ${x} 113)`}
            />
          ))}
          <circle cx={x} cy="113" r="4" fill={wheelColor} />
          <circle cx={x} cy="113" r="1.5" fill="#233a33" />
        </g>
      ))}
    </svg>
  );
}
