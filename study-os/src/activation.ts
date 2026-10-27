import { z } from 'zod';
import { dayKey } from './time';
export const ACTIVATION_KEY = 'bkit.activation-local.v1';
const metricNames = [
  'taskSaved',
  'taskReopened',
  'timetableNextDay',
  'studyStarted',
  'studySaved',
  'resourceReused',
  'storageFailure',
] as const;
export type ActivationMetric = (typeof metricNames)[number];
const schema = z.object({
  enabled: z.boolean(),
  since: z.string(),
  counts: z.record(z.number().int().nonnegative()),
  timetableDay: z.string().optional(),
  resources: z.record(z.string()),
});
export function readActivation() {
  const raw = localStorage.getItem(ACTIVATION_KEY);
  return raw
    ? schema.parse(JSON.parse(raw))
    : ({ enabled: false, since: dayKey(), counts: {}, resources: {} } as z.infer<typeof schema>);
}
/** Explicit opt-in. Aggregate only; no text, photos, URLs, external SDK or network. */
export function activation(metric: ActivationMetric, reference?: string) {
  try {
    const data = readActivation();
    if (!data.enabled) return;
    const today = dayKey();
    if (metric === 'timetableNextDay') {
      if (!data.timetableDay) {
        data.timetableDay = today;
        localStorage.setItem(ACTIVATION_KEY, JSON.stringify(data));
        return;
      }
      if (data.timetableDay >= today || data.counts.timetableNextDay) return;
    }
    if (metric === 'resourceReused') {
      if (!reference) return;
      const first = data.resources[reference];
      if (!first) {
        if (Object.keys(data.resources).length < 1000) data.resources[reference] = today;
        localStorage.setItem(ACTIVATION_KEY, JSON.stringify(data));
        return;
      }
      if (Date.parse(today) - Date.parse(first) < 3 * 86400000) return;
      data.resources[reference] = today;
    }
    data.counts[metric] = (data.counts[metric] || 0) + 1;
    localStorage.setItem(ACTIVATION_KEY, JSON.stringify(data));
  } catch {
    /* Optional metrics must never block study or retry a failed product write. */
  }
}
