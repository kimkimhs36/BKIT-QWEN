/**
 * tasks-vision 1.1.1 initializes a usage logger with no public opt-out.
 * Keep the pinned inference engine, but omit that single initialization before bundling.
 * TaskRunner's logger calls are optional, so inference/resource cleanup is unaffected.
 * Fail closed on upstream changes; never silently restore third-party telemetry.
 */
export const LOGGER_INIT =
  'function(t,e){e=e.runningMode??"";var r=t.h.Ta();t.o=new $h(t.D(),e,r)}(t,n),';
export function localVisionOnly(code: string): string {
  if (code.split(LOGGER_INIT).length !== 2)
    throw new Error('MediaPipe local-only patch requires review for the pinned engine version');
  return code.replace(LOGGER_INIT, '');
}
