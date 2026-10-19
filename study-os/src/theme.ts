export type BkitTheme = 'light' | 'dark';
export const THEME_KEY = 'bkit.study-os.theme.v1';

/**
 * Display preferences intentionally live outside the versioned study-record
 * schema. Switching colors never writes, migrates, or touches user study data.
 */
export function parseTheme(value: string | null | undefined): BkitTheme {
  return value === 'dark' ? 'dark' : 'light';
}

export function nextTheme(theme: BkitTheme): BkitTheme {
  return theme === 'light' ? 'dark' : 'light';
}
export function restoreTheme(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): BkitTheme {
  try { return parseTheme(storage?.getItem(THEME_KEY)); }
  catch { return 'light'; }
}
/** Returns false when browser blocks persistent storage; UI can still switch. */
export function saveTheme(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  theme: BkitTheme,
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(THEME_KEY, theme);
    return true;
  } catch { return false; }
}
export function applyTheme(theme: BkitTheme, doc: Document = document): void {
  doc.documentElement.dataset.bkitTheme = theme;
  const color = theme === 'dark' ? '#111b17' : '#f6f7f2';
  doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', color);
}
