import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateAnswers } from '../../src/server/model/modelAdapter';
import { ModelConfig, ProfileData, Question } from '../../src/shared/types';

const config: ModelConfig = {
  baseUrl: 'https://example.test/v1',
  apiKey: 'key',
  model: 'cheap-model',
  updatedAt: '2026-05-05T00:00:00.000Z'
};

const profile: ProfileData = {
  fields: { name: '张三' },
  updatedAt: '2026-05-05T00:00:00.000Z'
};

const questions: Question[] = [
  {
    id: 'q1',
    label: '姓名',
    kind: 'text',
    required: true,
    selector: '[data-qid="q1"]',
    options: [],
    risk: 'normal'
  }
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateAnswers', () => {
  it('parses structured JSON answers from an OpenAI-compatible response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              answers: [
                {
                  questionId: 'q1',
                  value: '张三',
                  confidence: 0.98,
                  action: 'fill',
                  reason: 'profile name'
                }
              ]
            })
          }
        }
      ]
    }), { status: 200 })));

    const answers = await generateAnswers({ config, profile, questions });

    expect(answers).toHaveLength(1);
    expect(answers[0].value).toBe('张三');
  });

  it('accepts either a base API URL or a full chat completions endpoint', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              answers: [
                {
                  questionId: 'q1',
                  value: '张三',
                  confidence: 0.98,
                  action: 'fill',
                  reason: 'profile name'
                }
              ]
            })
          }
        }
      ]
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await generateAnswers({
      config: { ...config, baseUrl: 'https://example.test/v1/chat/completions' },
      profile,
      questions
    });

    expect(fetchMock).toHaveBeenCalledWith('https://example.test/v1/chat/completions', expect.any(Object));
  });

  it('throws a readable error when the provider returns invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: 'not-json' } }]
    }), { status: 200 })));

    await expect(generateAnswers({ config, profile, questions })).rejects.toThrow('Model response was not valid JSON');
  });

  it('parses JSON wrapped in a markdown code fence', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: [
              '```json',
              '{',
              '  "answers": [',
              '    {',
              '      "questionId": "q1",',
              '      "value": "张三",',
              '      "confidence": 0.98,',
              '      "action": "fill",',
              '      "reason": "profile name"',
              '    }',
              '  ]',
              '}',
              '```'
            ].join('\n')
          }
        }
      ]
    }), { status: 200 })));

    const answers = await generateAnswers({ config, profile, questions });

    expect(answers[0].value).toBe('张三');
  });

  it('includes provider error details when the model request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: { message: 'Invalid model id: bad-model' }
    }), { status: 400 })));

    await expect(generateAnswers({ config, profile, questions })).rejects.toThrow('Model request failed with HTTP 400: Invalid model id: bad-model');
  });

  it('prompts the model to fill low-risk opinion questionnaires with safe choices', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              answers: [
                {
                  questionId: 'q1',
                  value: '张三',
                  confidence: 0.98,
                  action: 'fill',
                  reason: 'profile name'
                }
              ]
            })
          }
        }
      ]
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await generateAnswers({ config, profile, questions });

    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(firstCall[1].body));
    expect(body.messages[0].content).toContain('low-risk opinion or preference surveys');
  });
});
