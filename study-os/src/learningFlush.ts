/** The existing synchronous draft guard is extended with a resume action for asynchronous ink saves. */
export function flushLearning(resume?: () => void) {
  return document.dispatchEvent(
    new CustomEvent('bkit:flush-learning-draft', { cancelable: true, detail: { resume } }),
  );
}
