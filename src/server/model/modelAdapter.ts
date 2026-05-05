import { z } from 'zod';
import { ModelAnswerSchema, RunnableModelConfigSchema } from '../../shared/schemas';
import { ModelAnswer, ModelConfig, ProfileData, Question } from '../../shared/types';

const ChatResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string()
      })
    })
  ).min(1)
});

const AnswerEnvelopeSchema = z.object({
  answers: z.array(ModelAnswerSchema)
});

export interface GenerateAnswersInput {
  config: ModelConfig;
  profile: ProfileData;
  questions: Question[];
}

export async function generateAnswers(input: GenerateAnswersInput): Promise<ModelAnswer[]> {
  const config = RunnableModelConfigSchema.parse(input.config);
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: JSON.stringify({ profile: input.profile.fields, questions: input.questions }) }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Model request failed with HTTP ${response.status}`);
  }

  const parsed = ChatResponseSchema.parse(await response.json());
  const content = parsed.choices[0].message.content;

  let decoded: unknown;
  try {
    decoded = JSON.parse(content);
  } catch {
    throw new Error('Model response was not valid JSON');
  }

  return AnswerEnvelopeSchema.parse(decoded).answers;
}

export async function testModelConnection(config: ModelConfig): Promise<{ ok: boolean; message: string }> {
  try {
    await generateAnswers({
      config,
      profile: { fields: {}, updatedAt: new Date().toISOString() },
      questions: [
        {
          id: 'connection-test',
          label: 'Return the word ok',
          kind: 'text',
          required: false,
          selector: '#connection-test',
          options: [],
          risk: 'normal'
        }
      ]
    });
    return { ok: true, message: 'Model connection succeeded' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Model connection failed' };
  }
}

function systemPrompt(): string {
  return [
    'You fill low-risk public questionnaire fields from user-provided local profile data.',
    'Return only JSON with this shape: {"answers":[{"questionId":"...","value":"...","confidence":0.9,"action":"fill","reason":"..."}]}.',
    'Use action "review" for subjective or uncertain questions.',
    'Use action "skip" for sensitive questions involving politics, health privacy, legal commitments, financial authorization, or identity misuse.',
    'Never invent personal data that is not present in the profile.'
  ].join('\n');
}
