import { z } from 'zod';

export const ProfileSchema = z.object({
  fields: z.record(z.string(), z.string()),
  updatedAt: z.string().datetime()
});

export const ModelConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string(),
  model: z.string(),
  updatedAt: z.string().datetime()
});

export const RunnableModelConfigSchema = ModelConfigSchema.extend({
  apiKey: z.string().min(1),
  model: z.string().min(1)
});

export const QuestionOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  selector: z.string().min(1)
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(['text', 'single', 'multiple', 'select', 'unknown']),
  required: z.boolean(),
  selector: z.string().min(1),
  options: z.array(QuestionOptionSchema),
  risk: z.enum(['normal', 'sensitive', 'unsupported'])
});

export const ModelAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.union([z.string(), z.array(z.string())]),
  confidence: z.number().min(0).max(1),
  action: z.enum(['fill', 'review', 'skip']),
  reason: z.string().min(1)
});

export const FillResultSchema = z.object({
  questionId: z.string().min(1),
  status: z.enum(['filled', 'needs_review', 'skipped']),
  message: z.string().min(1)
});

export const QuestionnaireTaskSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  status: z.enum(['idle', 'analyzing', 'answering', 'filling', 'needs_review', 'failed', 'complete']),
  questions: z.array(QuestionSchema),
  answers: z.array(ModelAnswerSchema),
  fillResults: z.array(FillResultSchema),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
