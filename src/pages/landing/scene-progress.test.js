import { describe, expect, it } from 'vitest';
import { accountProgress, chapterProgress } from './scene-progress.js';

describe('landing scene progress', () => {
  it('selects the chapter at the reading anchor and reverses from current geometry', () => {
    const forward = [{ top: -400, height: 700 }, { top: 300, height: 700 }];
    expect(chapterProgress(forward, 900).index).toBe(1);
    const reverse = [{ top: 0, height: 700 }, { top: 700, height: 700 }];
    expect(chapterProgress(reverse, 900).index).toBe(0);
    expect(chapterProgress(reverse, 900).spread).toBeGreaterThan(.9);
  });

  it('keeps the final composition assembled and tolerates zero-height chapters', () => {
    expect(chapterProgress([{ top: -100, height: 0 }], 900)).toEqual({
      index: 0, progress: 1, spread: Math.sin(Math.PI),
    });
  });

  it('reveals activity before the avatar tray and finishes the avatar change', () => {
    expect(accountProgress({ top: 1000, height: 600 }, 900)).toEqual({ activity: 0, avatar: 0, change: 0 });
    const midway = accountProgress({ top: 550, height: 600 }, 900);
    expect(midway.activity).toBe(1);
    expect(midway.avatar).toBeGreaterThan(0);
    expect(midway.change).toBe(0);
    expect(accountProgress({ top: 0, height: 600 }, 900)).toEqual({ activity: 1, avatar: 1, change: 1 });
  });
});
