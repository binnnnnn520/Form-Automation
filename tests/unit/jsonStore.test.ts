import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonStore } from '../../src/server/storage/jsonStore';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'questionnaire-store-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('JsonStore', () => {
  it('returns the default value when a file does not exist', async () => {
    const store = new JsonStore(dir);
    const profile = await store.readProfile();

    expect(profile.fields).toEqual({});
  });

  it('persists profile data', async () => {
    const store = new JsonStore(dir);
    await store.writeProfile({ fields: { name: '李四' }, updatedAt: '2026-05-05T00:00:00.000Z' });

    await expect(store.readProfile()).resolves.toEqual({
      fields: { name: '李四' },
      updatedAt: '2026-05-05T00:00:00.000Z'
    });
  });

  it('does not expose a default API key', async () => {
    const store = new JsonStore(dir);
    const config = await store.readModelConfig();

    expect(config.apiKey).toBe('');
  });
});
