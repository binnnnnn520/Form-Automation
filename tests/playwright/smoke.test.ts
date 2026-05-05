import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';
import { extractQuestions } from '../../src/server/questionnaire/extractor';
import { fillQuestionnaire } from '../../src/server/questionnaire/fillEngine';

describe('questionnaire smoke', () => {
  it('extracts a fixture form, fills it, and leaves submit untouched', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(pathToFileURL(resolve('tests/fixtures/simple-questionnaire.html')).toString());

    const extracted = await extractQuestions(page);
    expect(extracted.status).toBe('ok');
    if (extracted.status !== 'ok') {
      throw new Error('fixture extraction failed');
    }

    const results = await fillQuestionnaire(page, extracted.questions, [
      { questionId: 'name', value: '张三', confidence: 0.99, action: 'fill', reason: 'profile' },
      { questionId: 'dept', value: '研发部', confidence: 0.99, action: 'fill', reason: 'option match' },
      { questionId: 'tools', value: ['飞书'], confidence: 0.99, action: 'fill', reason: 'option match' },
      { questionId: 'city', value: '上海', confidence: 0.99, action: 'fill', reason: 'profile city' }
    ]);

    expect(results.filter((result) => result.status === 'filled')).toHaveLength(4);
    expect(await page.locator('button[type="submit"]').isVisible()).toBe(true);
    await browser.close();
  });
});
