import { describe, expect, it, vi } from 'vitest';
import { createQuestionnaireTask, executeQuestionnaireTask } from '../../src/server/tasks/taskRunner';
import { ModelAnswer, ModelConfig, ProfileData, Question } from '../../src/shared/types';

const profile: ProfileData = {
  fields: { name: 'Alice' },
  updatedAt: '2026-05-05T00:00:00.000Z'
};

const modelConfig: ModelConfig = {
  baseUrl: 'https://example.test/v1',
  apiKey: 'key',
  model: 'model',
  updatedAt: '2026-05-05T00:00:00.000Z'
};

const questions: Question[] = [
  {
    id: 'name',
    label: 'Name',
    kind: 'text',
    required: true,
    selector: '[name="name"]',
    options: [],
    risk: 'normal'
  }
];

const answers: ModelAnswer[] = [
  {
    questionId: 'name',
    value: 'Alice',
    confidence: 0.99,
    action: 'fill',
    reason: 'profile'
  }
];

describe('createQuestionnaireTask', () => {
  it('creates an idle task with timestamps', () => {
    const task = createQuestionnaireTask('https://example.test/form');

    expect(task.url).toBe('https://example.test/form');
    expect(task.status).toBe('idle');
    expect(task.questions).toEqual([]);
  });

  it('rejects invalid URLs', () => {
    expect(() => createQuestionnaireTask('not-a-url')).toThrow('Invalid questionnaire URL');
  });
});

describe('executeQuestionnaireTask', () => {
  it('opens the questionnaire, extracts questions, generates answers, and fills the page', async () => {
    const page = { goto: vi.fn() };
    const browser = { newPage: vi.fn(async () => page), close: vi.fn() };
    const deps = {
      launchBrowser: vi.fn(async () => browser),
      extractQuestions: vi.fn(async () => ({ status: 'ok' as const, questions })),
      generateAnswers: vi.fn(async () => answers),
      fillQuestionnaire: vi.fn(async () => [{ questionId: 'name', status: 'filled' as const, message: 'filled' }])
    };

    const task = await executeQuestionnaireTask(
      { url: 'https://example.test/form', profile, modelConfig },
      deps
    );

    expect(page.goto).toHaveBeenCalledWith('https://example.test/form', { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(deps.generateAnswers).toHaveBeenCalledWith({ config: modelConfig, profile, questions });
    expect(deps.fillQuestionnaire).toHaveBeenCalledWith(page, questions, answers);
    expect(task.status).toBe('complete');
    expect(task.questions).toEqual(questions);
    expect(task.answers).toEqual(answers);
    expect(browser.close).not.toHaveBeenCalled();
  });

  it('marks the task failed and closes the browser when extraction is blocked', async () => {
    const page = { goto: vi.fn() };
    const browser = { newPage: vi.fn(async () => page), close: vi.fn() };
    const deps = {
      launchBrowser: vi.fn(async () => browser),
      extractQuestions: vi.fn(async () => ({ status: 'blocked' as const, reason: 'login required', questions: [] as [] })),
      generateAnswers: vi.fn(),
      fillQuestionnaire: vi.fn()
    };

    const task = await executeQuestionnaireTask(
      { url: 'https://example.test/form', profile, modelConfig },
      deps
    );

    expect(task.status).toBe('failed');
    expect(task.error).toBe('login required');
    expect(browser.close).toHaveBeenCalledOnce();
    expect(deps.generateAnswers).not.toHaveBeenCalled();
  });

  it('marks the task failed when no questions are extracted', async () => {
    const page = { goto: vi.fn() };
    const browser = { newPage: vi.fn(async () => page), close: vi.fn() };
    const deps = {
      launchBrowser: vi.fn(async () => browser),
      extractQuestions: vi.fn(async () => ({ status: 'ok' as const, questions: [] })),
      generateAnswers: vi.fn(),
      fillQuestionnaire: vi.fn()
    };

    const task = await executeQuestionnaireTask(
      { url: 'https://example.test/form', profile, modelConfig },
      deps
    );

    expect(task.status).toBe('failed');
    expect(task.error).toContain('No questionnaire questions were detected');
    expect(browser.close).toHaveBeenCalledOnce();
    expect(deps.generateAnswers).not.toHaveBeenCalled();
  });
});
