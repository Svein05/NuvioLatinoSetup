import { expect, it } from 'vitest';
import { prepareModderBatch } from '../index.js';

const options = { style: 'NetflixStyle', franchise: 'Naruto',
  queue: [{ fileName: 'Original.webp', characterName: 'Renombrado', base64: 'synthetic' }] };

it('publishes the edited name used by the preview instead of the original filename', () => {
  expect(prepareModderBatch(options)[0]).toMatchObject({ filename: 'Renombrado.webp', characterName: 'Renombrado' });
  expect(options.queue[0].fileName).toBe('Original.webp');
});

it('rejects duplicate names and path traversal before a batch can be staged', () => {
  expect(() => prepareModderBatch({ ...options, queue: [...options.queue, ...options.queue] })).toThrow('ya está en uso');
  expect(() => prepareModderBatch({ ...options, franchise: '../Other' })).toThrow('válidos');
  expect(() => prepareModderBatch({ ...options, queue: [{ characterName: '../Other' }] })).toThrow('sin rutas');
});

it('checks collisions against the selected style, franchise and previously staged batches', () => {
  expect(() => prepareModderBatch({ ...options,
    history: [{ type: 'BATCH_UPLOAD', style: options.style, franchise: options.franchise,
      files: [{ filename: 'renombrado.webp' }] }],
  })).toThrow('ya está en uso');
});
