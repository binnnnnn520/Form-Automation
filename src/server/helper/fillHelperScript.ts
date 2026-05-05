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

  function fillAnswer(answer, bindings) {
    const binding = bindings.get(answer.questionId);
    if (!binding || answer.action !== 'fill' || answer.confidence < MIN_CONFIDENCE) return 'review';
    if (binding.kind === 'text') {
      binding.element.value = String(answer.value);
      emitInput(binding.element);
      return 'filled';
    }
    if (binding.kind === 'select') {
      binding.element.value = String(answer.value);
      emitInput(binding.element);
      return 'filled';
    }
    const values = Array.isArray(answer.value) ? answer.value.map(String) : [String(answer.value)];
    let filled = 0;
    for (const input of binding.inputs) {
      const label = optionLabel(input);
      const value = input.value || label;
      if (values.includes(value) || values.includes(label)) {
        input.click();
        input.checked = true;
        emitInput(input);
        filled += 1;
      }
    }
    return filled === values.length ? 'filled' : 'review';
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

  try {
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
      const detail = await response.text();
      showMessage('本地模型接口失败：HTTP ' + response.status + (detail ? ' ' + detail.slice(0, 120) : ''));
      return;
    }
    const payload = await response.json();
    const answers = payload.answers || [];
    const filled = answers.map((answer) => fillAnswer(answer, bindings)).filter((status) => status === 'filled').length;
    showMessage('已填写 ' + filled + ' / ' + questions.length + ' 道题。请人工检查后手动提交。');
  } catch (error) {
    showMessage(error instanceof Error ? error.message : '填充助手执行失败');
  }
})();`;
}
