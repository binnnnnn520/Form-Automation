import { describe, expect, it } from 'vitest';
import { createQuestionnaireTask } from '../../src/server/tasks/taskRunner';

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
