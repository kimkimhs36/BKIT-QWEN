import { useEffect } from 'react';
/** Visual viewport follows the software keyboard and pinch zoom on Safari.
 * Collapse the dock only for a typing keyboard, never for pinch zoom alone.
 */
export function useViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const height = viewport?.height || innerHeight;
      root.style.setProperty('--os-viewport-height', `${Math.round(height)}px`);
      const focused = document.activeElement;
      const typing =
        focused instanceof HTMLTextAreaElement ||
        (focused instanceof HTMLInputElement &&
          !['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'color'].includes(
            focused.type,
          ));
      root.dataset.osKeyboard = String(
        typing &&
          (viewport?.scale || 1) <= 1.1 &&
          document.documentElement.clientHeight - height > 120,
      );
    };
    const update = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    apply();
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      root.style.removeProperty('--os-viewport-height');
      delete root.dataset.osKeyboard;
    };
  }, []);
}
