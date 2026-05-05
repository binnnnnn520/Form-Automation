import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fillHelperScript } from '../../src/server/helper/fillHelperScript';

let browser: Awaited<ReturnType<typeof chromium.launch>>;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser.close();
});

describe('fillHelperScript', () => {
  it('does not run from the local control console page', async () => {
    page = await browser.newPage();
    let requestedAnswers = false;
    await page.route('http://127.0.0.1:5173/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<input name="name"><input name="apiKey"><button>分析并填写任务</button>'
      });
    });
    await page.route('http://127.0.0.1:8787/api/answers', async (route) => {
      requestedAnswers = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"answers":[]}' });
    });
    await page.goto('http://127.0.0.1:5173/');

    await page.addScriptTag({ content: fillHelperScript() });

    await page.waitForFunction(() => document.getElementById('questionnaire-automation-helper-status')?.textContent?.includes('不要在控制台页面运行'));
    expect(requestedAnswers).toBe(false);

    await page.close();
  });

  it('extracts a real page, requests answers, and fills supported controls', async () => {
    page = await browser.newPage();
    await page.route('http://127.0.0.1:8787/api/answers', async (route) => {
      const payload = route.request().postDataJSON() as { questions: Array<{ id: string }> };
      expect(payload.questions.map((question) => question.id)).toEqual(['dept', 'tools', 'name', 'city']);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answers: [
            { questionId: 'dept', value: '研发部', confidence: 0.95, action: 'fill', reason: 'test' },
            { questionId: 'tools', value: ['飞书', '微信'], confidence: 0.95, action: 'fill', reason: 'test' },
            { questionId: 'name', value: '张三', confidence: 0.95, action: 'fill', reason: 'test' },
            { questionId: 'city', value: '上海', confidence: 0.95, action: 'fill', reason: 'test' }
          ]
        })
      });
    });
    await page.goto(pathToFileURL(resolve('tests/fixtures/simple-questionnaire.html')).toString());

    await page.addScriptTag({ content: fillHelperScript() });

    await page.waitForFunction(() => document.getElementById('questionnaire-automation-helper-status')?.textContent?.includes('已填写 4 / 4'));
    expect(await page.locator('input[name="name"]').inputValue()).toBe('张三');
    expect(await page.locator('input[name="dept"][value="研发部"]').isChecked()).toBe(true);
    expect(await page.locator('input[name="tools"][value="飞书"]').isChecked()).toBe(true);
    expect(await page.locator('input[name="tools"][value="微信"]').isChecked()).toBe(true);
    expect(await page.locator('select[name="city"]').inputValue()).toBe('上海');

    await page.close();
  });

  it('shows clean local API errors instead of raw server JSON', async () => {
    page = await browser.newPage();
    await page.route('http://127.0.0.1:8787/api/answers', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 500, message: 'ModelScope 配置应使用 Base URL https://api-inference.modelscope.cn/v1' })
      });
    });
    await page.goto(pathToFileURL(resolve('tests/fixtures/simple-questionnaire.html')).toString());

    await page.addScriptTag({ content: fillHelperScript() });

    const status = page.locator('#questionnaire-automation-helper-status');
    await page.waitForFunction(() => document.getElementById('questionnaire-automation-helper-status')?.textContent?.includes('ModelScope 配置应使用'));
    expect(await status.textContent()).not.toContain('statusCode');

    await page.close();
  });
});
