import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Portal } from './CommandCenter';
import type { MaterialPreferences } from '../themes/material';
const scenes = [
  {
    code: '01 / THE ARCHIVE',
    title: (
      <>
        시험의 규칙은
        <br />
        변해왔다.
      </>
    ),
    text: '1994학년도 첫 수능에서 2028학년도까지. 이제, 당신의 여정이 이 기록에 이어집니다.',
  },
  {
    code: '02 / THE POSSIBILITY',
    title: (
      <>
        미래는 아직
        <br />
        정해지지 않았다.
      </>
    ),
    text: '가보고 싶은 곳, 만들어 보고 싶은 것. 그 가능성을 위해 오늘의 작은 연결을 만듭니다.',
  },
  {
    code: '03 / YOUR NEXT MOVE',
    title: (
      <>
        그 시작은,
        <br />한 문제.
      </>
    ),
    text: '등식의 성질부터 차근차근. 스스로 답하고, 도움을 구하고, 시간이 지난 뒤 다시 확인하세요.',
  },
];
export default function Arrival({
  prefs,
  onExit,
  onStart,
}: {
  prefs: MaterialPreferences;
  onExit: () => void;
  onStart: () => void;
}) {
  const [scene, setScene] = useState(0),
    reduced = useReducedMotion();
  const quiet = reduced || prefs.lowPower || prefs.motion !== 'auto';
  useEffect(() => {
    if (quiet || scene === 2) return;
    const id = setTimeout(() => {
      if (!document.hidden) setScene((s) => Math.min(2, s + 1));
    }, 4200);
    return () => clearTimeout(id);
  }, [scene, quiet]);
  return (
    <section className="jg-arrival-stage" aria-label="THE ARRIVAL 시네마틱 진입">
      <div className="jg-arrival-top">
        <span>BKIT ORIGINAL / THE ARRIVAL</span>
        <button onClick={onExit}>
          오프닝 건너뛰기 <ArrowRight size={15} />
        </button>
      </div>
      <Portal material={prefs.id} />
      <motion.div
        className="jg-arrival-copy"
        key={scene}
        initial={quiet ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65 }}
      >
        <p className="jg-eyebrow">{scenes[scene].code}</p>
        <h1 tabIndex={-1}>{scenes[scene].title}</h1>
        <p>{scenes[scene].text}</p>
        <button className="jg-primary" onClick={scene < 2 ? () => setScene((s) => s + 1) : onStart}>
          {scene < 2 ? '다음 장면' : '학습 시작'}
          <ArrowRight size={17} />
        </button>
        {scene === 0 && (
          <a
            href="https://www.yna.co.kr/view/AKR20170512168600004"
            target="_blank"
            rel="noreferrer"
          >
            아카이브 출처 · 연합뉴스 수능 변천사 ↗
          </a>
        )}
      </motion.div>
      <div className="jg-arrival-bottom">
        <span>JUGGERNAUT / MMXXVIII</span>
        <div role="group" aria-label="오프닝 장면">
          {scenes.map((s, i) => (
            <button
              key={s.code}
              aria-label={`${i + 1}번 장면`}
              aria-pressed={scene === i}
              onClick={() => setScene(i)}
            >
              {String(i + 1).padStart(2, '0')}
            </button>
          ))}
        </div>
        <span>{quiet ? '정적 연출' : '빛을 따라, 앞으로.'}</span>
      </div>
    </section>
  );
}
