// A paused session and an open dialog must always keep their controls visible.
export function shouldAutoHideFocusUi(inStudy: boolean, running: boolean, modalOpen: boolean): boolean {
  return inStudy && running && !modalOpen;
}
