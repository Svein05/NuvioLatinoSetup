import { expect, it } from 'vitest';
import images from 'virtual:optimized-images';
import { responsiveImageAttributes, setImageSourceHashes } from './responsive-image.js';

it('requires matching published bytes before enhancing a canonical remote avatar', () => {
  const [path, record] = Object.entries(images).find(([key]) => key.includes('/profile_icons/'));
  const source = 'https://raw.githubusercontent.com/Svein05/NuvioLatinoSetup/main' + path;
  setImageSourceHashes({});
  expect(responsiveImageAttributes(source)).toBe('');
  setImageSourceHashes({ [path.slice(1)]: record.blob });
  expect(responsiveImageAttributes(source)).toContain('srcset=');
  setImageSourceHashes({ [path.slice(1)]: 'different-published-bytes' });
  expect(responsiveImageAttributes(source)).toBe('');
  expect(source).toContain(path);
});
