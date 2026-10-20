export type AwakeSignal = {
  at: number;
  face: boolean;
  left: number | null;
  right: number | null;
  angled: boolean;
};
export type AwakeObservation = {
  closedSince: number | null;
  episodes: number[];
  latched: boolean;
  status: 'uncertain' | 'observing' | 'eyes-closed' | 'rest';
};
export const newObservation = (): AwakeObservation => ({
  closedSince: null,
  episodes: [],
  latched: false,
  status: 'uncertain',
});
/** Missing faces, occlusion or uncertain pose never count as closed eyes. Ephemeral only. */
export function observeEyes(previous: AwakeObservation, input: AwakeSignal): AwakeObservation {
  const episodes = previous.episodes.filter((t) => input.at >= t && input.at - t < 120000);
  if (
    !input.face ||
    input.angled ||
    input.left === null ||
    input.right === null ||
    !Number.isFinite(input.left) ||
    !Number.isFinite(input.right)
  )
    return { closedSince: null, episodes, latched: false, status: 'uncertain' };
  if (input.left < 0.65 || input.right < 0.65)
    return {
      closedSince: null,
      episodes,
      latched: false,
      status: episodes.length >= 3 ? 'rest' : 'observing',
    };
  const closedSince = previous.closedSince ?? input.at,
    prolonged = input.at - closedSince >= 2000;
  if (prolonged && !previous.latched) episodes.push(input.at);
  return {
    closedSince,
    episodes,
    latched: prolonged || previous.latched,
    status: episodes.length >= 3 ? 'rest' : prolonged ? 'eyes-closed' : 'observing',
  };
}
