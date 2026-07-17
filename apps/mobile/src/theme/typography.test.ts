import {
  CHIP_REFLOW_FONT_SCALE,
  clampedFontScale,
  FONT_SCALE_CLAMP,
  shouldReflowChips,
} from './typography';

describe('Dynamic Type clamps (product 12)', () => {
  it('passes ordinary scales through untouched', () => {
    expect(clampedFontScale(() => 1)).toBe(1);
    expect(clampedFontScale(() => 1.2)).toBe(1.2);
  });

  it('clamps accessibility sizes so a Letter line keeps its karaoke rhythm', () => {
    // At 3× a 30pt serif line reflows to two words per screen and the synced
    // text the wow depends on falls apart (product 08). 1.4 is the ceiling.
    expect(clampedFontScale(() => 3)).toBe(FONT_SCALE_CLAMP.max);
  });

  it('clamps tiny scales up to the floor — serif below ~26pt stops reading as display', () => {
    expect(clampedFontScale(() => 0.5)).toBe(FONT_SCALE_CLAMP.min);
  });

  describe('chip → list reflow (05 §4)', () => {
    it('keeps chips below the breakpoint', () => {
      expect(shouldReflowChips(() => 1)).toBe(false);
      expect(shouldReflowChips(() => CHIP_REFLOW_FONT_SCALE)).toBe(false);
    });

    it('reflows past the breakpoint — wrapping chips are unreadable at large type', () => {
      expect(shouldReflowChips(() => CHIP_REFLOW_FONT_SCALE + 0.01)).toBe(true);
      expect(shouldReflowChips(() => 2)).toBe(true);
    });
  });
});
