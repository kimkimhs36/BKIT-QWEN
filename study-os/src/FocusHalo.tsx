export function FocusHalo({ progress, running }: { progress: number; running: boolean }) {
  const p = Math.min(1, Math.max(0, progress));
  return (
    <svg
      viewBox="0 0 440 440"
      className={'focus-halo ' + (running ? 'running' : 'paused')}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="focusLight">
          <stop stopColor="#ccd9ff" stopOpacity=".09" />
          <stop offset=".75" stopColor="#b6c5f8" stopOpacity=".02" />
          <stop offset="1" stopColor="#b6c5f8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="220" cy="220" r="210" fill="url(#focusLight)" className="focus-aura" />
      <circle cx="220" cy="220" r="169" fill="none" stroke="#b3bed7" strokeWidth=".6" />
      <circle
        cx="220"
        cy="220"
        r="151"
        fill="none"
        stroke="#cbd4e6"
        strokeWidth=".5"
        strokeDasharray="1 7"
      />
      {Array.from({ length: 90 }, (_, i) => {
        const a = (i / 90) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={220 + Math.sin(a) * 185}
            y1={220 - Math.cos(a) * 185}
            x2={220 + Math.sin(a) * (i % 5 === 0 ? 197 : 190)}
            y2={220 - Math.cos(a) * (i % 5 === 0 ? 197 : 190)}
            stroke={i / 90 <= p ? '#5f73dd' : '#c4cee0'}
            strokeWidth={i / 90 <= p ? 2 : 1}
          />
        );
      })}
      <circle
        cx="220"
        cy="220"
        r="169"
        fill="none"
        stroke="#677be6"
        strokeWidth="2"
        pathLength="100"
        strokeDasharray={`${p * 100} 100`}
        transform="rotate(-90 220 220)"
        className="focus-progress"
      />
      <circle
        cx={220 + Math.sin(p * Math.PI * 2) * 169}
        cy={220 - Math.cos(p * Math.PI * 2) * 169}
        r="4"
        fill="#4966d6"
      />
    </svg>
  );
}
