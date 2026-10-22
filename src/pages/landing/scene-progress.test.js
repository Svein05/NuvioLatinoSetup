import { describe, expect, it } from 'vitest';
import { accountProgress, chapterProgress, chapterTimeline, pinnedProgress } from './scene-progress.js';

describe('landing scene progress', () => {
  it('selects the chapter at the reading anchor and reverses from current geometry', () => {
    const forward = [{ top: -400, height: 700 }, { top: 300, height: 700 }];
    expect(chapterProgress(forward, 900).index).toBe(1);
    const reverse = [{ top: 0, height: 700 }, { top: 700, height: 700 }];
    expect(chapterProgress(reverse, 900).index).toBe(0);
    expect(chapterProgress(reverse, 900).progress).toBe(1);
  });

  it('keeps the final composition assembled and tolerates zero-height chapters', () => {
    expect(chapterProgress([{ top: -100, height: 0 }], 900)).toEqual({ index: 0, progress: 1 });
  });

  it('reveals activity before the avatar tray and finishes the avatar change', () => {
    expect(accountProgress({ top: 1000, height: 1710 }, 900)).toEqual({ activity: 0, avatar: 0, change: 0 });
    const midway = accountProgress({ top: -200, height: 1710 }, 900);
    expect(midway.activity).toBe(1);
    expect(midway.avatar).toBeGreaterThan(0);
    expect(midway.change).toBe(0);
    expect(accountProgress({ top: -700, height: 1710 }, 900)).toEqual({ activity: 1, avatar: 1, change: 1 });
  });

  it('completes in order and reserves the final 32 percent for reading', () => {
    expect(chapterTimeline(.15).detail).toBe(0);
    expect(chapterTimeline(.35).reveal).toBe(1);
    expect(chapterTimeline(.35).finish).toBe(0);
    expect(chapterTimeline(.68)).toEqual({ reveal: 1, detail: 1, finish: 1 });
    expect(chapterTimeline(.95)).toEqual(chapterTimeline(.68));
    expect(pinnedProgress({ top: 120, height: 1710 }, 900)).toBe(0);
    expect(pinnedProgress({ top: -840, height: 1710 }, 900)).toBe(1);
  });
});
