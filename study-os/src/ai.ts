// Static previews send nothing to an AI server. Explicitly enable only after setup.
export const apiEnabled = import.meta.env.VITE_AI_API_ENABLED === 'true';
export async function requestAI(path: 'plan' | 'coach' | 'assistant', body: unknown) {
  if (!apiEnabled || !navigator.onLine) throw new Error('AI unavailable');
  const res = await fetch('/api/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(18000),
  });
  if (!res.ok) throw new Error('AI unavailable');
  return res.json();
}
