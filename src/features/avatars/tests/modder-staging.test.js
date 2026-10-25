import { describe, expect, it } from 'vitest';
import {
  getModderSession,
  saveModderSession,
  clearModderSession,
  checkAvatarFilenameCollision,
  createStagedState,
  rebuildAvatarOverrides,
  undoLastStagedAction,
  discardStagedItem,
  consolidateStagedOperations,
  buildStagedItemsBreakdown,
} from '../index.js';

describe('modder-session', () => {
  it('reads, writes, and clears modder session', () => {
    const memory = new Map();
    const mockStorage = {
      getItem: (key) => memory.get(key) || null,
      setItem: (key, val) => memory.set(key, val),
      removeItem: (key) => memory.delete(key),
    };

    expect(getModderSession(mockStorage)).toBeNull();
    saveModderSession({ token: 'tok_123', email: 'mod@nuvio.com' }, mockStorage);

    const session = getModderSession(mockStorage);
    expect(session).toEqual({ token: 'tok_123', email: 'mod@nuvio.com' });

    clearModderSession(mockStorage);
    expect(getModderSession(mockStorage)).toBeNull();
  });
});

describe('modder-collision', () => {
  const allAvatars = [
    { id: '1', style: 'default', franchise: 'anime', fileName: 'naruto.webp' },
    { id: '2', style: 'default', franchise: 'anime', fileName: 'sasuke.webp' },
  ];

  it('detects catalog collisions with case and extension normalization', () => {
    const res = checkAvatarFilenameCollision({
      style: 'default',
      franchise: 'anime',
      targetFilename: 'NARUTO',
      allAvatars,
    });
    expect(res.hasCollision).toBe(true);
    expect(res.conflictingFileName).toBe('naruto.webp');
  });

  it('ignores collisions when avatar is deleted in overrides or matches excludeAvatarId', () => {
    const overrides = new Map([['1', { isDeleted: true }]]);
    const res = checkAvatarFilenameCollision({
      style: 'default',
      franchise: 'anime',
      targetFilename: 'naruto.webp',
      allAvatars,
      overrides,
    });
    expect(res.hasCollision).toBe(false);

    const resExclude = checkAvatarFilenameCollision({
      style: 'default',
      franchise: 'anime',
      targetFilename: 'sasuke.webp',
      excludeAvatarId: '2',
      allAvatars,
    });
    expect(resExclude.hasCollision).toBe(false);
  });

  it('detects collision with staged batch upload files', () => {
    const history = [
      {
        type: 'BATCH_UPLOAD',
        style: 'default',
        franchise: 'gaming',
        files: [{ filename: 'mario.webp' }],
      },
    ];
    const res = checkAvatarFilenameCollision({
      style: 'default',
      franchise: 'gaming',
      targetFilename: 'mario.webp',
      allAvatars,
      history,
    });
    expect(res.hasCollision).toBe(true);
    expect(res.isStagedBatch).toBe(true);
  });
});

describe('modder-staging and undo', () => {
  it('manages staged state, overrides and undo', () => {
    const state = createStagedState();
    expect(state.history).toEqual([]);
    expect(state.avatarOverrides.size).toBe(0);

    state.history.push({
      id: 'batch_1',
      type: 'BATCH_UPLOAD',
      style: 'default',
      franchise: 'gaming',
      files: [{ filename: 'link.webp' }],
    });
    state.history.push({
      type: 'UPDATE_AVATAR',
      avatarId: 'av_1',
      newFilename: 'zelda_v2.webp',
      newCharacterName: 'Princess Zelda',
      newBase64: 'base64_data',
    });

    state.avatarOverrides = rebuildAvatarOverrides(state.history);
    expect(state.avatarOverrides.get('av_1').newFilename).toBe('zelda_v2.webp');

    const undoUpdate = undoLastStagedAction(state);
    expect(undoUpdate.lastAction.type).toBe('UPDATE_AVATAR');
    expect(state.avatarOverrides.has('av_1')).toBe(false);

    const undoBatch = undoLastStagedAction(state);
    expect(undoBatch.lastAction.type).toBe('BATCH_UPLOAD');
    expect(state.history.length).toBe(0);
  });

  it('discards individual items from batch or avatar edits', () => {
    const state = createStagedState();
    state.history.push({
      id: 'batch_1',
      type: 'BATCH_UPLOAD',
      files: [{ filename: 'a.webp' }, { filename: 'b.webp' }],
    });
    state.history.push({
      type: 'DELETE_AVATAR',
      avatarId: 'av_99',
    });
    state.avatarOverrides = rebuildAvatarOverrides(state.history);

    const discardedFile = discardStagedItem(state, 'batch_file:batch_1:0');
    expect(discardedFile.removed.filename).toBe('a.webp');
    expect(state.history[0].files.length).toBe(1);

    const discardedDelete = discardStagedItem(state, 'delete_avatar:av_99');
    expect(discardedDelete.type).toBe('AVATAR_CHANGE');
    expect(state.avatarOverrides.has('av_99')).toBe(false);
  });
});

describe('modder-consolidation and breakdown', () => {
  it('consolidates additions, renames, replacements and deletions', () => {
    const history = [
      {
        type: 'BATCH_UPLOAD',
        style: 'default',
        franchise: 'anime',
        files: [{ filename: 'goku.webp', characterName: 'Goku', base64: 'b64_goku' }],
      },
    ];
    const allAvatars = [
      { id: '1', style: 'default', franchise: 'anime', fileName: 'vegeta.webp', characterName: 'Vegeta', path: 'p1' },
      { id: '2', style: 'default', franchise: 'anime', fileName: 'piccolo.webp', characterName: 'Piccolo', path: 'p2' },
      { id: '3', style: 'default', franchise: 'anime', fileName: 'gohan.webp', characterName: 'Gohan', path: 'p3' },
    ];
    const overrides = new Map([
      ['1', { isDeleted: true }],
      ['2', { isModified: true, newFilename: 'piccolo_super.webp', newCharacterName: 'Super Piccolo' }],
      ['3', { isModified: true, newFilename: 'gohan.webp', newBase64: 'b64_gohan' }],
    ]);

    const ops = consolidateStagedOperations({ history, overrides, allAvatars });
    expect(ops.addedFiles).toHaveLength(1);
    expect(ops.addedFiles[0].filename).toBe('goku.webp');
    expect(ops.deletedFiles).toHaveLength(1);
    expect(ops.deletedFiles[0].filename).toBe('vegeta.webp');
    expect(ops.renamedFiles).toHaveLength(1);
    expect(ops.renamedFiles[0].newFilename).toBe('piccolo_super.webp');
    expect(ops.replacedFiles).toHaveLength(1);
    expect(ops.replacedFiles[0].filename).toBe('gohan.webp');

    const breakdown = buildStagedItemsBreakdown({ history, overrides, allAvatars });
    expect(breakdown).toHaveLength(4);
    expect(breakdown.some(b => b.actionType === 'NEW_FILE')).toBe(true);
    expect(breakdown.some(b => b.actionType === 'DELETE' && b.isStrikethrough)).toBe(true);
    expect(breakdown.some(b => b.actionType === 'RENAME')).toBe(true);
    expect(breakdown.some(b => b.actionType === 'REPLACE')).toBe(true);
  });
});
