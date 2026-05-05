import { Page } from 'playwright';
import { FillResult, ModelAnswer, Question } from '../../shared/types';

const MIN_FILL_CONFIDENCE = 0.75;

export async function fillQuestionnaire(page: Page, questions: Question[], answers: ModelAnswer[]): Promise<FillResult[]> {
  const results: FillResult[] = [];

  for (const answer of answers) {
    const question = questions.find((candidate) => candidate.id === answer.questionId);
    if (!question) {
      results.push({ questionId: answer.questionId, status: 'needs_review', message: 'Question was not found on page' });
      continue;
    }

    if (question.risk !== 'normal' || answer.action !== 'fill' || answer.confidence < MIN_FILL_CONFIDENCE) {
      results.push({ questionId: question.id, status: 'needs_review', message: 'Answer requires user review' });
      continue;
    }

    try {
      if (question.kind === 'text') {
        await page.locator(question.selector).fill(String(answer.value));
        results.push({ questionId: question.id, status: 'filled', message: 'Text field filled' });
        continue;
      }

      if (question.kind === 'single') {
        const option = question.options.find((candidate) => candidate.value === answer.value || candidate.label === answer.value);
        if (!option) {
          results.push({ questionId: question.id, status: 'needs_review', message: 'Single-choice option did not match' });
          continue;
        }
        await page.locator(option.selector).check();
        results.push({ questionId: question.id, status: 'filled', message: 'Single-choice field filled' });
        continue;
      }

      if (question.kind === 'multiple') {
        const values = Array.isArray(answer.value) ? answer.value : [String(answer.value)];
        const matched = question.options.filter((option) => values.includes(option.value) || values.includes(option.label));
        if (matched.length !== values.length) {
          results.push({ questionId: question.id, status: 'needs_review', message: 'One or more multiple-choice options did not match' });
          continue;
        }
        for (const option of matched) {
          await page.locator(option.selector).check();
        }
        results.push({ questionId: question.id, status: 'filled', message: 'Multiple-choice field filled' });
        continue;
      }

      if (question.kind === 'select') {
        await page.locator(question.selector).selectOption(String(answer.value));
        results.push({ questionId: question.id, status: 'filled', message: 'Select field filled' });
        continue;
      }

      results.push({ questionId: question.id, status: 'skipped', message: 'Unsupported question kind' });
    } catch (error) {
      results.push({
        questionId: question.id,
        status: 'needs_review',
        message: error instanceof Error ? error.message : 'Fill failed'
      });
    }
  }

  return results;
}
