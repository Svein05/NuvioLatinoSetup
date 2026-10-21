import { describe, expect, it, vi } from 'vitest';
import { buildPublishPayload, publishModderChanges } from './publish-modder-changes.js';

describe('publish-modder-changes workflow', () => {
  it('builds publish payload from staged operations', () => {
    const stagedOps = {
      addedFiles: [{ path: 'p1', base64: 'b1' }],
      replacedFiles: [{ path: 'p2', base64: 'b2' }],
      renamedFiles: [{ oldPath: 'o3', newPath: 'n3', newBase64: 'b3' }],
      deletedFiles: [{ path: 'p4' }],
    };
    const payload = buildPublishPayload({
      stagedOps,
      token: 'tok_abc',
      email: 'user@nuvio.com',
    });

    expect(payload.password).toBe('tok_abc');
    expect(payload.email).toBe('user@nuvio.com');
    expect(payload.skipCi).toBe(true);
    expect(payload.addedFiles).toEqual([{ path: 'p1', base64: 'b1' }]);
    expect(payload.deletedFiles).toEqual(['p4']);
  });

  it('throws error when token is missing or when there are 0 operations', async () => {
    const client = { saveStagedChanges: vi.fn() };
    const stagedState = { history: [], avatarOverrides: new Map() };

    await expect(
      publishModderChanges({ client, stagedState, token: null })
    ).rejects.toThrow('Sesión no autorizada o expirada.');

    await expect(
      publishModderChanges({ client, stagedState, token: 'tok_abc' })
    ).rejects.toThrow('No hay cambios pendientes para guardar.');
  });

  it('publishes operations and calls progress callbacks', async () => {
    const client = {
      saveStagedChanges: vi.fn().mockResolvedValue({ success: true, commit: 'commit_url' }),
    };
    const stagedState = {
      history: [
        {
          type: 'BATCH_UPLOAD',
          style: 'default',
          franchise: 'anime',
          files: [{ filename: 'a.webp', base64: 'b64' }],
        },
      ],
      avatarOverrides: new Map(),
    };
    const progressEvents = [];

    const res = await publishModderChanges({
      client,
      stagedState,
      token: 'tok_abc',
      onProgress: evt => progressEvents.push(evt),
    });

    expect(res.total).toBe(1);
    expect(res.result.commit).toBe('commit_url');
    expect(progressEvents.length).toBeGreaterThanOrEqual(3);
    expect(client.saveStagedChanges).toHaveBeenCalled();
  });
});
