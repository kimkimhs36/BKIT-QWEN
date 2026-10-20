import { motion } from 'motion/react';
/** Only changed digits enter; fixed cells keep the clock steady. Never a live announcement. */
export function AnimatedClock({ value }: { value: string }) {
  const reduced = document.documentElement.dataset.effects === 'none';
  return (
    <span className="study-clock-digits" role="img" aria-label={value}>
      {Array.from(value).map((digit, i) => (
        <span className={digit === ':' ? 'clock-colon' : 'clock-cell'} key={i} aria-hidden="true">
          <motion.span
            key={digit}
            initial={reduced ? false : { opacity: 0.5, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {digit}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
