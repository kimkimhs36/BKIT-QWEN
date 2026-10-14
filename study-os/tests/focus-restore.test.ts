import { describe, expect, it } from 'vitest';
import { shouldAutoHideFocusUi } from '../src/focusQuiet';
describe('focus controls safety', () => {
  it('auto hides only while studying without a dialog', () => {
    expect(shouldAutoHideFocusUi(true,true,false)).toBe(true);
    expect(shouldAutoHideFocusUi(false,true,false)).toBe(false);
    expect(shouldAutoHideFocusUi(true,false,false)).toBe(false);
    expect(shouldAutoHideFocusUi(true,true,true)).toBe(false);
  });
});
