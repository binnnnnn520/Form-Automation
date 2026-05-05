import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fillQuestionnaire } from '../../src/server/questionnaire/fillEngine';
import { Question } from '../../src/shared/types';

let browser: Awaited<ReturnType<typeof chromium.launch>>;
let page: Page;

const questions: Question[] = [
  { id: 'name', label: '姓名', kind: 'text', required: true, selector: '[name="name"]', options: [], risk: 'normal' },
  {
    id: 'dept',
    label: '请选择部门',
    kind: 'single',
    required: false,
    selector: 'fieldset:nth-of-type(1)',
    options: [
      { label: '研发部', value: '研发部', selector: '[name="dept"][value="研发部"]' },
      { label: '市场部', value: '市场部', selector: '[name="dept"][value="市场部"]' }
    ],
    risk: 'normal'
  }
];

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser.close();
});

async function openForm() {
  page = await browser.newPage();
  await page.goto(pathToFileURL(resolve('tests/fixtures/simple-questionnaire.html')).toString());
}

describe('fillQuestionnaire', () => {
  it('fills text and single-choice answers', async () => {
    await openForm();
    const results = await fillQuestionnaire(page, questions, [
      { questionId: 'name', value: '张三', confidence: 0.99, action: 'fill', reason: 'profile' },
      { questionId: 'dept', value: '研发部', confidence: 0.99, action: 'fill', reason: 'matched option' }
    ]);

    expect(await page.locator('[name="name"]').inputValue()).toBe('张三');
    expect(await page.locator('[name="dept"][value="研发部"]').isChecked()).toBe(true);
    expect(results.every((result) => result.status === 'filled')).toBe(true);
  });

  it('skips low-confidence answers', async () => {
    await openForm();
    const results = await fillQuestionnaire(page, questions, [
      { questionId: 'name', value: '王五', confidence: 0.4, action: 'fill', reason: 'uncertain' }
    ]);

    expect(results[0].status).toBe('needs_review');
  });
});
