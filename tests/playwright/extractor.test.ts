import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { extractQuestions } from '../../src/server/questionnaire/extractor';

let browser: Awaited<ReturnType<typeof chromium.launch>>;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser.close();
});

async function openFixture(name: string) {
  page = await browser.newPage();
  await page.goto(pathToFileURL(resolve('tests/fixtures', name)).toString());
}

describe('extractQuestions', () => {
  it('extracts text, radio, checkbox, and select questions', async () => {
    await openFixture('simple-questionnaire.html');
    const result = await extractQuestions(page);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.questions.map((question) => question.kind)).toEqual(['text', 'single', 'multiple', 'select']);
    }
  });

  it('stops on login pages', async () => {
    await openFixture('login-page.html');
    const result = await extractQuestions(page);

    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.reason).toContain('login');
    }
  });

  it('stops on captcha pages', async () => {
    await openFixture('captcha-page.html');
    const result = await extractQuestions(page);

    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.reason).toContain('captcha');
    }
  });

  it('stops when the questionnaire page cannot be displayed', async () => {
    await openFixture('unavailable-page.html');
    const result = await extractQuestions(page);

    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.reason).toContain('not available');
    }
  });
});
