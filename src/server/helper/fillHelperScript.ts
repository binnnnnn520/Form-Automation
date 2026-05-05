export function fillHelperScript(): string {
  return String.raw`
(async () => {
  const API_BASE = 'http://127.0.0.1:8787';
  const MIN_CONFIDENCE = 0.75;

  function textOf(element) {
    return (element?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function optionLabel(input) {
    if (input.id) {
      const label = document.querySelector('label[for="' + CSS.escape(input.id) + '"]');
      if (label) return textOf(label);
    }
    const container = input.closest('label,.ui-radio,.ui-checkbox,.radio,.checkbox,.option,.choice,.item,li');
    const containerText = textOf(container);
    if (containerText) return containerText;
    return textOf(input.closest('label')) || input.value;
  }

  function questionLabel(container, fallback) {
    const label = container.querySelector('.field-label,.div_title_question,.topic-title,.topichtml,.qtitle,legend');
    return textOf(label) || textOf(container).slice(0, 160) || fallback;
  }

  function selectorFor(element, fallback) {
    if (element.id) return '#' + CSS.escape(element.id);
    if (element.name) return '[name="' + CSS.escape(element.name) + '"]';
    return fallback;
  }

  function uniqueContainers() {
    const containers = Array.from(document.querySelectorAll('[topic],.field,.div_question,fieldset'));
    const allControls = Array.from(document.querySelectorAll('input:not([type="hidden"]),textarea,select'));
    for (const input of allControls) {
      if (containers.some((container) => container.contains(input))) continue;
      const container = input.closest('label') || input.parentElement || input;
      if (!containers.includes(container)) containers.push(container);
    }
    return containers;
  }

  function extractQuestions() {
    const seen = new Set();
    const questions = [];
    const bindings = new Map();

    for (const container of uniqueContainers()) {
      const inputs = Array.from(container.querySelectorAll('input:not([type="hidden"]),textarea,select'));
      const choiceInputs = inputs.filter((input) => input instanceof HTMLInputElement && (input.type === 'radio' || input.type === 'checkbox'));
      const select = inputs.find((input) => input instanceof HTMLSelectElement);
      const textInput = inputs.find((input) => (input instanceof HTMLInputElement && !['radio', 'checkbox', 'button', 'submit'].includes(input.type)) || input instanceof HTMLTextAreaElement);

      if (choiceInputs.length > 0) {
        const first = choiceInputs[0];
        const id = first.name || container.getAttribute('topic') || container.id || 'choice-' + (questions.length + 1);
        if (seen.has(id)) continue;
        seen.add(id);
        const kind = first.type === 'radio' ? 'single' : 'multiple';
        const options = choiceInputs.map((input) => ({
          label: optionLabel(input),
          value: input.value || optionLabel(input),
          selector: selectorFor(input, 'input[type="' + input.type + '"]')
        }));
        questions.push({
          id,
          label: questionLabel(container, id),
          kind,
          required: choiceInputs.some((input) => input.required) || textOf(container).includes('*'),
          selector: selectorFor(first, 'input[type="' + first.type + '"]'),
          options,
          risk: 'normal'
        });
        bindings.set(id, { kind, inputs: choiceInputs, options });
        continue;
      }

      if (select) {
        const id = select.name || select.id || container.getAttribute('topic') || 'select-' + (questions.length + 1);
        if (seen.has(id)) continue;
        seen.add(id);
        const options = Array.from(select.options).filter((option) => option.value).map((option) => ({
          label: textOf(option) || option.value,
          value: option.value,
          selector: 'option[value="' + CSS.escape(option.value) + '"]'
        }));
        questions.push({
          id,
          label: questionLabel(container, id),
          kind: 'select',
          required: select.required || textOf(container).includes('*'),
          selector: selectorFor(select, 'select'),
          options,
          risk: 'normal'
        });
        bindings.set(id, { kind: 'select', element: select, options });
        continue;
      }

      if (textInput) {
        const id = textInput.name || textInput.id || container.getAttribute('topic') || 'text-' + (questions.length + 1);
        if (seen.has(id)) continue;
        seen.add(id);
        questions.push({
          id,
          label: questionLabel(container, id),
          kind: 'text',
          required: textInput.required || textOf(container).includes('*'),
          selector: selectorFor(textInput, textInput instanceof HTMLTextAreaElement ? 'textarea' : 'input'),
          options: [],
          risk: 'normal'
        });
        bindings.set(id, { kind: 'text', element: textInput });
      }
    }

    return { questions, bindings };
  }

  function emitInput(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function normalizeAnswerText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^[\s([{（【]*(?:[a-z]|\d+|[一二三四五六七八九十]+)[\s.．、):：）\]-]+/i, '')
      .replace(/[○●◯]/g, '')
      .replace(/[\s"'“”‘’，,。.;；:：!?？()[\]（）【】{}]/g, '');
  }

  function answerValues(value) {
    const raw = Array.isArray(value) ? value : String(value || '').split(/[，,、;；|]/);
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }

  function textMatches(candidate, expected) {
    const left = normalizeAnswerText(candidate);
    const right = normalizeAnswerText(expected);
    if (!left || !right) return false;
    if (left === right) return true;
    return Math.min(left.length, right.length) >= 2 && (left.includes(right) || right.includes(left));
  }

  function answerIndex(value) {
    const text = String(value || '').trim();
    const letter = text.match(/^(?:选项)?([a-z])(?:$|[\s.．、):：）-])/i);
    if (letter) return letter[1].toUpperCase().charCodeAt(0) - 65;
    const numeric = text.match(/^(?:第)?(\d+)(?:项|个)?$/);
    if (numeric) return Number(numeric[1]) - 1;
    return -1;
  }

  function matchInput(inputs, expected, used) {
    const index = answerIndex(expected);
    if (index >= 0 && inputs[index] && !used.has(inputs[index])) return inputs[index];
    for (const input of inputs) {
      if (used.has(input)) continue;
      const candidates = [
        input.value,
        optionLabel(input),
        input.getAttribute('aria-label'),
        input.getAttribute('title')
      ];
      if (candidates.some((candidate) => textMatches(candidate, expected))) return input;
    }
    return null;
  }

  function matchSelectValue(select, expected) {
    const options = Array.from(select.options).filter((option) => option.value);
    const index = answerIndex(expected);
    if (index >= 0 && options[index]) return options[index].value;
    const matched = options.find((option) => textMatches(option.value, expected) || textMatches(textOf(option), expected));
    return matched ? matched.value : '';
  }

  function fillAnswer(answer, bindings) {
    const binding = bindings.get(answer.questionId);
    if (!binding) return 'unmatched';
    if (answer.action === 'skip') return 'skipped';
    if (answer.action !== 'fill' || answer.confidence < MIN_CONFIDENCE) return 'review';
    if (binding.kind === 'text') {
      binding.element.value = String(answer.value);
      emitInput(binding.element);
      return 'filled';
    }
    if (binding.kind === 'select') {
      const value = matchSelectValue(binding.element, answer.value);
      if (!value) return 'unmatched';
      binding.element.value = value;
      emitInput(binding.element);
      return 'filled';
    }
    const values = answerValues(answer.value);
    const used = new Set();
    let filled = 0;
    for (const value of values) {
      const input = matchInput(binding.inputs, value, used);
      if (!input) continue;
      used.add(input);
      const clickTarget = input.closest('label,.ui-radio,.ui-checkbox,.radio,.checkbox,.option,.choice,.item,li') || input;
      clickTarget.click();
      input.checked = true;
      emitInput(input);
      filled += 1;
    }
    return filled > 0 && filled === values.length ? 'filled' : 'unmatched';
  }

  function showMessage(message) {
    let box = document.getElementById('questionnaire-automation-helper-status');
    if (!box) {
      box = document.createElement('div');
      box.id = 'questionnaire-automation-helper-status';
      box.style.cssText = 'position:fixed;right:16px;top:16px;z-index:2147483647;background:#1f1b16;color:#fffaf0;padding:12px 14px;border-radius:8px;font:14px/1.4 system-ui;max-width:360px;box-shadow:0 12px 30px rgba(0,0,0,.25)';
      document.body.appendChild(box);
    }
    box.textContent = message;
  }

  function isLocalControlPage() {
    return /^(127\.0\.0\.1|localhost)$/i.test(location.hostname);
  }

  function cleanError(message) {
    return String(message || '')
      .replace(/\b(?:sk|ms)-[A-Za-z0-9_*.-]{6,}/gi, '[redacted]')
      .replace(/\b[A-Za-z0-9_-]{2,}\*{6,}[A-Za-z0-9_-]{2,}\b/g, '[redacted]');
  }

  async function responseErrorMessage(response) {
    const raw = await response.text();
    if (!raw.trim()) return 'HTTP ' + response.status;
    try {
      const parsed = JSON.parse(raw);
      return cleanError(parsed.message || parsed.error || raw);
    } catch {
      return cleanError(raw);
    }
  }

  try {
    if (isLocalControlPage()) {
      showMessage('不要在控制台页面运行助手。请先打开问卷页面，再点击收藏栏里的真实页面填充助手。');
      return;
    }

    showMessage('正在提取当前问卷题目...');
    const { questions, bindings } = extractQuestions();
    if (questions.length === 0) {
      showMessage('没有识别到题目。这个页面结构暂不支持。');
      return;
    }

    showMessage('识别到 ' + questions.length + ' 道题，正在调用本地模型...');
    const response = await fetch(API_BASE + '/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions })
    });
    if (!response.ok) {
      showMessage('本地模型接口失败：' + await responseErrorMessage(response));
      return;
    }
    const payload = await response.json();
    const answers = payload.answers || [];
    const results = answers.map((answer) => fillAnswer(answer, bindings));
    const filled = results.filter((status) => status === 'filled').length;
    const review = results.filter((status) => status === 'review').length;
    const skipped = results.filter((status) => status === 'skipped').length;
    const unmatched = results.filter((status) => status === 'unmatched').length;
    const fillable = answers.filter((answer) => answer.action === 'fill' && answer.confidence >= MIN_CONFIDENCE).length;
    showMessage('已填写 ' + filled + ' / ' + questions.length + ' 道题。模型返回 ' + answers.length + ' 条；可填 ' + fillable + '，未匹配 ' + unmatched + '，需人工 ' + (review + skipped) + '。请人工检查后手动提交。');
  } catch (error) {
    showMessage(error instanceof Error ? error.message : '填充助手执行失败');
  }
})();`;
}
