export type QuestionKind = 'text' | 'single' | 'multiple' | 'select' | 'unknown';
export type QuestionRisk = 'normal' | 'sensitive' | 'unsupported';
export type AnswerAction = 'fill' | 'review' | 'skip';
export type TaskStatus = 'idle' | 'analyzing' | 'answering' | 'filling' | 'needs_review' | 'failed' | 'complete';

export interface ProfileData {
  fields: Record<string, string>;
  updatedAt: string;
}

export interface ModelConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  updatedAt: string;
}

export interface QuestionOption {
  label: string;
  value: string;
  selector: string;
}

export interface Question {
  id: string;
  label: string;
  kind: QuestionKind;
  required: boolean;
  selector: string;
  options: QuestionOption[];
  risk: QuestionRisk;
}

export interface ModelAnswer {
  questionId: string;
  value: string | string[];
  confidence: number;
  action: AnswerAction;
  reason: string;
}

export interface FillResult {
  questionId: string;
  status: 'filled' | 'needs_review' | 'skipped';
  message: string;
}

export interface QuestionnaireTask {
  id: string;
  url: string;
  status: TaskStatus;
  questions: Question[];
  answers: ModelAnswer[];
  fillResults: FillResult[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}
