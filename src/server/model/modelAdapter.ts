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
  assertProviderConfig(config);
  const url = chatCompletionsUrl(config.baseUrl);
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
    throw new Error(`Model request failed with HTTP ${response.status}${await providerErrorDetails(response)}`);
  }

  const parsed = ChatResponseSchema.parse(await response.json());
  const content = parsed.choices[0].message.content;

  let decoded: unknown;
  try {
    decoded = JSON.parse(extractJsonContent(content));
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

function chatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  return /\/chat\/completions$/i.test(normalized) ? normalized : `${normalized}/chat/completions`;
}

function assertProviderConfig(config: ModelConfig): void {
  const isOpenAIEndpoint = /^https:\/\/api\.openai\.com(?:\/|$)/i.test(config.baseUrl);
  const looksLikeModelScope = /^ms-/i.test(config.apiKey) || /^deepseek-ai\//i.test(config.model);
  if (isOpenAIEndpoint && looksLikeModelScope) {
    throw new Error('ModelScope 配置应使用 Base URL https://api-inference.modelscope.cn/v1。当前配置把 ModelScope 的 key/模型发给了 OpenAI。');
  }
}

function extractJsonContent(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

async function providerErrorDetails(response: Response): Promise<string> {
  const raw = await response.text();
  if (!raw.trim()) {
    return '';
  }

  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
    const message = parsed.error?.message || parsed.message;
    return message ? `: ${redactSecrets(message)}` : `: ${redactSecrets(raw)}`;
  } catch {
    return `: ${redactSecrets(raw)}`;
  }
}

function redactSecrets(message: string): string {
  return message
    .replace(/\b(?:sk|ms)-[A-Za-z0-9_*.-]{6,}/gi, '[redacted]')
    .replace(/\b[A-Za-z0-9_-]{2,}\*{6,}[A-Za-z0-9_-]{2,}\b/g, '[redacted]');
}

function systemPrompt(): string {
  return [
    'You fill low-risk public questionnaire fields from user-provided local profile data.',
    'Return only JSON with this shape: {"answers":[{"questionId":"...","value":"...","confidence":0.9,"action":"fill","reason":"..."}]}.',
    'For low-risk opinion or preference surveys, choose a reasonable neutral option when the profile does not provide a specific answer.',
    'Use action "review" only when a question requires private personal facts that are missing or the available options are ambiguous.',
    'Use action "skip" for sensitive questions involving politics, health privacy, legal commitments, financial authorization, or identity misuse.',
    'Never invent personal data that is not present in the profile.'
  ].join('\n');
}
