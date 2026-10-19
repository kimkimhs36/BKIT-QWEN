import type { GarageState } from './garage';
const colors = { sage: '#94b7a1', cream: '#e9d8ac', coral: '#d98672', blue: '#85b0ce' };
/** Original side-view SVG: no images, WebGL, remote assets or per-frame DOM trees. */
export function Car({ car, className = '' }: { car: GarageState['car']; className?: string }) {
  return (
    <svg
      className={'tohesar-car ' + className}
      viewBox="0 0 360 140"
      role="img"
      aria-label="TOHEŞAR 커스텀 자동차"
    >
      <ellipse cx="183" cy="119" rx="153" ry="8" fill="#101b19" opacity=".13" />
      {car.spoiler && <path d="M39 66v-16H20v-7h59v7H49v16" fill="#3d4d48" />}
      <path
        d="M29 79 64 65 108 29Q114 24 128 24H222Q234 24 248 39L278 66 325 77Q338 80 338 94v16H22V93Q22 84 29 79Z"
        fill={colors[car.color]}
        stroke="#344c43"
        strokeWidth="3"
      />
      <path d="m85 65 34-32h44v32Zm88-32h45q11 0 20 11l20 21h-85Z" fill="#253e3b" />
      <path d="M87 72h181M173 72v33M191 77h15" stroke="#344c43" strokeWidth="2" fill="none" />
      <path d="M25 88h24v10H23m291-10h23v10h-23" fill="#f6eccb" />
      <path d="M108 106h142m-216 0h16m252 0h30" stroke="#344c43" strokeWidth="5" />
      {[78, 283].map((x) => (
        <g key={x} className="car-wheel" style={{ transformOrigin: `${x}px 108px` }}>
          <circle cx={x} cy="108" r="24" fill="#25322f" />
          <circle cx={x} cy="108" r="15" fill={car.wheels === 'aero' ? '#d8e3db' : '#a9b8ac'} />
          {car.wheels === 'aero' ? (
            <path
              d={`M${x - 11} 98l22 20m-22 0 22-20M${x} 94v28`}
              stroke="#53665d"
              strokeWidth="3"
            />
          ) : (
            <circle cx={x} cy="108" r="8" fill="#53665d" />
          )}
          <circle cx={x} cy="108" r="3" fill="#e9eee8" />
        </g>
      ))}
    </svg>
  );
}
