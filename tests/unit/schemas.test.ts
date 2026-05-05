import { describe, expect, it } from 'vitest';
import { ModelAnswerSchema, ProfileSchema, QuestionSchema } from '../../src/shared/schemas';

describe('shared schemas', () => {
  it('accepts a minimal profile', () => {
    const parsed = ProfileSchema.parse({
      fields: { name: '张三', studentId: '20260001' },
      updatedAt: '2026-05-05T00:00:00.000Z'
    });

    expect(parsed.fields.name).toBe('张三');
  });

  it('rejects a model answer with confidence outside 0..1', () => {
    expect(() =>
      ModelAnswerSchema.parse({
        questionId: 'q1',
        value: 'A',
        confidence: 2,
        action: 'fill',
        reason: 'invalid'
      })
    ).toThrow();
  });

  it('accepts a single choice question with options', () => {
    const parsed = QuestionSchema.parse({
      id: 'q1',
      label: '请选择部门',
      kind: 'single',
      required: true,
      selector: '[data-qid="q1"]',
      options: [
        { label: '研发部', value: '研发部', selector: '[data-option="dev"]' }
      ],
      risk: 'normal'
    });

    expect(parsed.options).toHaveLength(1);
  });
});
