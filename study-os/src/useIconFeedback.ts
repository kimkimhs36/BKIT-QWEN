import { useEffect } from 'react';

/** Short compositor-only feedback, independent of the decorative GPU world. */
export function useIconFeedback(disabled: boolean) {
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Set<Animation>();
    const press = (event: Event) => {
      // Safari can delay updates to a retained MediaQueryList after a setting change.
      if (disabled || matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) {
        reset();
        return;
      }
      if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return;
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-icon-feedback]')
          : null;
      const icon = button?.querySelector<HTMLElement>('[data-touch-icon]');
      if (!icon || button?.matches(':disabled')) return;
      icon.getAnimations().forEach((a) => a.cancel());
      const animation = icon.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'translateY(2px) scale(1.1,.85)', offset: 0.25 },
          { transform: 'translateY(-2px) scale(.94,1.09)', offset: 0.55 },
          { transform: 'scale(1.03,.98)', offset: 0.8 },
          { transform: 'scale(1)' },
        ],
        { duration: 360, easing: 'ease-out' },
      );
      animations.add(animation);
      const remove = () => animations.delete(animation);
      animation.onfinish = remove;
      animation.oncancel = remove;
    };
    const reset = () => {
      animations.forEach((a) => a.cancel());
      animations.clear();
    };
    media.addEventListener('change', reset);
    document.addEventListener('pointerdown', press, { passive: true });
    document.addEventListener('keydown', press);
    document.addEventListener('visibilitychange', reset);
    window.addEventListener('blur', reset);
    return () => {
      reset();
      media.removeEventListener('change', reset);
      document.removeEventListener('pointerdown', press);
      document.removeEventListener('keydown', press);
      document.removeEventListener('visibilitychange', reset);
      window.removeEventListener('blur', reset);
    };
  }, [disabled]);
}
