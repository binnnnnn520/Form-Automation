import { randomUUID } from 'node:crypto';
import { QuestionnaireTask } from '../../shared/types';

export function createQuestionnaireTask(url: string): QuestionnaireTask {
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid questionnaire URL');
  }

  const timestamp = new Date().toISOString();
  return {
    id: randomUUID(),
    url,
    status: 'idle',
    questions: [],
    answers: [],
    fillResults: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
