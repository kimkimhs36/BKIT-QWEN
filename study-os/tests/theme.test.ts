import { describe, expect, it } from 'vitest';
import { parseTheme, restoreTheme, saveTheme, nextTheme, THEME_KEY } from '../src/theme';

describe('theme switching is independent of protected study data', () => {
  it('defaults to the established light interface for old or missing preferences', () => {
    expect(parseTheme(null)).toBe('light');
    expect(parseTheme('system')).toBe('light');
    expect(parseTheme('DARK')).toBe('light');
  });
  it('persists explicit dark mode without writing or reading the study state key', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (name: string) => values.get(name) ?? null,
      setItem: (name: string, value: string) => { values.set(name, value); },
    };
    values.set('bkit.study-os.v1', '{"original":"user-data"}');
    expect(nextTheme(restoreTheme(storage))).toBe('dark');
    expect(saveTheme(storage, 'dark')).toBe(true);
    expect(restoreTheme(storage)).toBe('dark');
    expect(values.get(THEME_KEY)).toBe('dark');
    expect(values.get('bkit.study-os.v1')).toBe('{"original":"user-data"}');
  });
  it('supports changing dark back to light', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
  });
  it('is nonfatal when local storage is disabled or full', () => {
    const denied = {
      getItem: (_: string): string | null => { throw Error('blocked'); },
      setItem: (_: string, __: string): void => { throw Error('blocked'); },
    };
    expect(restoreTheme(denied)).toBe('light');
    expect(saveTheme(denied, 'dark')).toBe(false);
  });
});
