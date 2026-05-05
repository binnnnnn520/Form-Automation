import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_MODEL_NAME } from '../../src/shared/defaults';
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

  it('uses the default model when no model config exists', async () => {
    const store = new JsonStore(dir);
    const config = await store.readModelConfig();

    expect(config.model).toBe(DEFAULT_MODEL_NAME);
  });

  it('normalizes a blank saved model name to the default model', async () => {
    const store = new JsonStore(dir);
    const saved = await store.writeModelConfig({
      baseUrl: 'https://example.test/v1',
      apiKey: 'key',
      model: '   ',
      updatedAt: '2026-05-05T00:00:00.000Z'
    });

    expect(saved.model).toBe(DEFAULT_MODEL_NAME);
    await expect(store.readModelConfig()).resolves.toMatchObject({ model: DEFAULT_MODEL_NAME });
  });

  it('normalizes an existing blank model config file when reading', async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'model-config.json'), JSON.stringify({
      baseUrl: 'https://example.test/v1',
      apiKey: 'key',
      model: '',
      updatedAt: '2026-05-05T00:00:00.000Z'
    }), 'utf8');

    const store = new JsonStore(dir);
    const config = await store.readModelConfig();

    expect(config.model).toBe(DEFAULT_MODEL_NAME);
  });

  it('normalizes the legacy ModelScope deepseek-chat alias to a valid ModelScope model id', async () => {
    const store = new JsonStore(dir);
    const saved = await store.writeModelConfig({
      baseUrl: 'https://api-inference.modelscope.cn/v1/chat/completions',
      apiKey: 'key',
      model: 'deepseek-chat',
      updatedAt: '2026-05-05T00:00:00.000Z'
    });

    expect(saved.model).toBe(DEFAULT_MODEL_NAME);
  });

  it('reads JSON files that contain a UTF-8 BOM', async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'model-config.json'), `\uFEFF${JSON.stringify({
      baseUrl: 'https://example.test/v1',
      apiKey: 'key',
      model: 'model',
      updatedAt: '2026-05-05T00:00:00.000Z'
    })}`, 'utf8');

    const store = new JsonStore(dir);
    const config = await store.readModelConfig();

    expect(config.model).toBe('model');
  });
});
