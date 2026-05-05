import { Page } from 'playwright';
import { Question } from '../../shared/types';
import { classifyQuestionRisk } from '../safety/risk';

export type ExtractResult =
  | { status: 'ok'; questions: Question[] }
  | { status: 'blocked'; reason: string; questions: [] };

export async function extractQuestions(page: Page): Promise<ExtractResult> {
  const bodyText = await page.locator('body').innerText({ timeout: 5000 });
  if (/登录|login|password|密码/i.test(bodyText)) {
    return { status: 'blocked', reason: 'login required', questions: [] };
  }
  if (/captcha|验证码|人机验证/i.test(bodyText)) {
    return { status: 'blocked', reason: 'captcha required', questions: [] };
  }

  const questions = await page.evaluate(() => {
    const output: Array<{
      id: string;
      label: string;
      kind: 'text' | 'single' | 'multiple' | 'select';
      required: boolean;
      selector: string;
      options: Array<{ label: string; value: string; selector: string }>;
    }> = [];

    document.querySelectorAll('input:not([type="hidden"]), textarea').forEach((input, index) => {
      const element = input as HTMLInputElement | HTMLTextAreaElement;
      if (element instanceof HTMLInputElement && (element.type === 'radio' || element.type === 'checkbox')) return;
      const label = element.closest('label')?.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('name') || `文本题 ${index + 1}`;
      const name = element.getAttribute('name');
      output.push({
        id: name || element.id || `text-${index + 1}`,
        label,
        kind: 'text',
        required: element.required,
        selector: name ? `[name="${name}"]` : element.id ? `#${element.id}` : `input:nth-of-type(${index + 1})`,
        options: []
      });
    });

    document.querySelectorAll('fieldset').forEach((fieldset, index) => {
      const inputs = Array.from(fieldset.querySelectorAll('input[type="radio"], input[type="checkbox"]')) as HTMLInputElement[];
      if (inputs.length === 0) return;
      const firstType = inputs[0].type;
      const legend = fieldset.querySelector('legend')?.textContent?.trim() || `选择题 ${index + 1}`;
      output.push({
        id: inputs[0].name || `choice-${index + 1}`,
        label: legend,
        kind: firstType === 'radio' ? 'single' : 'multiple',
        required: inputs.some((input) => input.required),
        selector: `fieldset:nth-of-type(${index + 1})`,
        options: inputs.map((input) => ({
          label: input.closest('label')?.textContent?.trim() || input.value,
          value: input.value,
          selector: `[name="${input.name}"][value="${input.value}"]`
        }))
      });
    });

    document.querySelectorAll('select').forEach((select, index) => {
      const element = select as HTMLSelectElement;
      const label = element.closest('label')?.childNodes[0]?.textContent?.trim() || element.name || `下拉题 ${index + 1}`;
      output.push({
        id: element.name || element.id || `select-${index + 1}`,
        label,
        kind: 'select',
        required: element.required,
        selector: element.name ? `[name="${element.name}"]` : element.id ? `#${element.id}` : `select:nth-of-type(${index + 1})`,
        options: Array.from(element.options)
          .filter((option) => option.value)
          .map((option) => ({
            label: option.textContent?.trim() || option.value,
            value: option.value,
            selector: `option[value="${option.value}"]`
          }))
      });
    });

    return output;
  });

  return {
    status: 'ok',
    questions: questions.map((question) => ({
      ...question,
      risk: classifyQuestionRisk(question.label)
    }))
  };
}
