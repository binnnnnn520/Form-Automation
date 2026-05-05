import { describe, expect, it } from 'vitest';
import { normalizeImportedUrl } from '../../src/client/qr';

describe('normalizeImportedUrl', () => {
  it('accepts https URLs', () => {
    expect(normalizeImportedUrl('https://wj.example.test/a')).toBe('https://wj.example.test/a');
  });

  it('rejects non-URL text', () => {
    expect(() => normalizeImportedUrl('hello')).toThrow('Imported content is not a valid URL');
  });
});
