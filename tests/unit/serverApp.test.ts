import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/server/app';
import { createQuestionnaireTask } from '../../src/server/tasks/taskRunner';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'questionnaire-api-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('local API', () => {
  it('saves and reads profile data', async () => {
    const app = buildApp({ dataDir: dir });
    await app.ready();

    const write = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      payload: { fields: { name: '张三' }, updatedAt: '2026-05-05T00:00:00.000Z' }
    });
    expect(write.statusCode).toBe(200);

    const read = await app.inject({ method: 'GET', url: '/api/profile' });
    expect(read.json().fields.name).toBe('张三');

    await app.close();
  });

  it('runs local questionnaire tasks with stored profile and model config', async () => {
    const runTask = vi.fn(async ({ url }: { url: string }) => ({
      ...createQuestionnaireTask(url),
      status: 'complete' as const
    }));
    const app = buildApp({ dataDir: dir, runTask });
    await app.ready();

    await app.inject({
      method: 'PUT',
      url: '/api/profile',
      payload: { fields: { name: 'Alice' }, updatedAt: '2026-05-05T00:00:00.000Z' }
    });
    await app.inject({
      method: 'PUT',
      url: '/api/model-config',
      payload: { baseUrl: 'https://example.test/v1', apiKey: 'key', model: 'model', updatedAt: '2026-05-05T00:00:00.000Z' }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { url: 'https://example.test/form' }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().status).toBe('complete');
    expect(runTask).toHaveBeenCalledWith({
      url: 'https://example.test/form',
      profile: { fields: { name: 'Alice' }, updatedAt: '2026-05-05T00:00:00.000Z' },
      modelConfig: { baseUrl: 'https://example.test/v1', apiKey: 'key', model: 'model', updatedAt: '2026-05-05T00:00:00.000Z' }
    });

    await app.close();
  });
});
