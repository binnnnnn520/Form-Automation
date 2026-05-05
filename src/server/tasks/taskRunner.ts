import { randomUUID } from 'node:crypto';
import { chromium, Page } from 'playwright';
import { FillResult, ModelAnswer, ModelConfig, ProfileData, Question, QuestionnaireTask, TaskStatus } from '../../shared/types';
import { generateAnswers, GenerateAnswersInput } from '../model/modelAdapter';
import { extractQuestions, ExtractResult } from '../questionnaire/extractor';
import { fillQuestionnaire } from '../questionnaire/fillEngine';

export interface ExecuteQuestionnaireTaskInput {
  url: string;
  profile: ProfileData;
  modelConfig: ModelConfig;
}

interface TaskPage {
  goto(url: string, options: { waitUntil: 'domcontentloaded'; timeout: number }): Promise<unknown>;
}

interface TaskBrowser {
  newPage(): Promise<TaskPage>;
  close(): Promise<unknown> | unknown;
  on?(event: 'disconnected', listener: () => void): void;
}

export interface TaskRunnerDependencies {
  launchBrowser(): Promise<TaskBrowser>;
  extractQuestions(page: TaskPage): Promise<ExtractResult>;
  generateAnswers(input: GenerateAnswersInput): Promise<ModelAnswer[]>;
  fillQuestionnaire(page: TaskPage, questions: Question[], answers: ModelAnswer[]): Promise<FillResult[]>;
}

const reviewBrowsers = new Set<TaskBrowser>();

const defaultDependencies: TaskRunnerDependencies = {
  launchBrowser: launchReviewBrowser,
  extractQuestions: (page) => extractQuestions(page as Page),
  generateAnswers,
  fillQuestionnaire: (page, questions, answers) => fillQuestionnaire(page as Page, questions, answers)
};

export function launchReviewBrowser(): Promise<TaskBrowser> {
  return chromium.launch({ channel: 'msedge', headless: false });
}

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

export async function executeQuestionnaireTask(
  input: ExecuteQuestionnaireTaskInput,
  dependencies: TaskRunnerDependencies = defaultDependencies
): Promise<QuestionnaireTask> {
  let task = setTaskStatus(createQuestionnaireTask(input.url), 'analyzing');
  let browser: TaskBrowser | undefined;

  try {
    browser = await dependencies.launchBrowser();
    const page = await browser.newPage();
    await page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const extracted = await dependencies.extractQuestions(page);
    if (extracted.status === 'blocked') {
      await browser.close();
      return setTaskStatus(task, 'failed', { error: extracted.reason, questions: [] });
    }
    if (extracted.questions.length === 0) {
      await browser.close();
      return setTaskStatus(task, 'failed', {
        error: 'No questionnaire questions were detected. The link may be invalid, expired, blocked, or unsupported.'
      });
    }

    task = setTaskStatus(task, 'answering', { questions: extracted.questions });
    const answers = await dependencies.generateAnswers({
      config: input.modelConfig,
      profile: input.profile,
      questions: extracted.questions
    });

    task = setTaskStatus(task, 'filling', { answers });
    const fillResults = await dependencies.fillQuestionnaire(page, extracted.questions, answers);
    const finalStatus = isFullyFilled(extracted.questions, fillResults) ? 'complete' : 'needs_review';

    retainBrowserForReview(browser);
    return setTaskStatus(task, finalStatus, { fillResults });
  } catch (error) {
    if (browser) {
      await browser.close();
    }

    return setTaskStatus(task, 'failed', {
      error: error instanceof Error ? error.message : 'Task execution failed'
    });
  }
}

function setTaskStatus(
  task: QuestionnaireTask,
  status: TaskStatus,
  patch: Partial<QuestionnaireTask> = {}
): QuestionnaireTask {
  return {
    ...task,
    ...patch,
    status,
    updatedAt: new Date().toISOString()
  };
}

function isFullyFilled(questions: Question[], fillResults: FillResult[]): boolean {
  return questions.length > 0 && fillResults.length === questions.length && fillResults.every((result) => result.status === 'filled');
}

function retainBrowserForReview(browser: TaskBrowser): void {
  reviewBrowsers.add(browser);
  browser.on?.('disconnected', () => {
    reviewBrowsers.delete(browser);
  });
}
