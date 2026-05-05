# Questionnaire Automation MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Web MVP that imports a public questionnaire link or QR code, uses local profile data and a user-provided OpenAI-compatible model API to fill the questionnaire, and stops before submission for user review.

**Architecture:** A React/Vite client talks to a local Fastify API. The server stores profile/model settings in local JSON files, uses Playwright to inspect and fill public questionnaire pages, and calls an OpenAI-compatible chat completions endpoint through a small model adapter.

**Tech Stack:** React, Vite, TypeScript, Node.js, Fastify, Playwright, Vitest, Testing Library, jsQR, Zod.

---

## Scope Check

The approved spec describes one cohesive local app. It includes UI, local storage, model calls, browser automation, and filling safety rules; these modules are tightly coupled around one smoke path, so this can stay as a single implementation plan.

## File Structure

- `package.json`: npm scripts and dependency metadata.
- `tsconfig.json`, `tsconfig.node.json`: TypeScript project settings.
- `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`: build and test configuration.
- `.gitignore`: generated files, local data, browser artifacts, and brainstorm files.
- `src/shared/types.ts`: shared domain types used by client and server.
- `src/shared/schemas.ts`: Zod schemas for profile, model config, questions, and answers.
- `src/server/storage/jsonStore.ts`: local JSON persistence.
- `src/server/model/modelAdapter.ts`: OpenAI-compatible model client and response validation.
- `src/server/questionnaire/extractor.ts`: Playwright question extraction.
- `src/server/questionnaire/fillEngine.ts`: Playwright field filling with conservative skips.
- `src/server/safety/risk.ts`: sensitive-question detection.
- `src/server/tasks/taskRunner.ts`: task lifecycle orchestration.
- `src/server/app.ts`, `src/server/index.ts`: Fastify app and process entrypoint.
- `src/client/main.tsx`, `src/client/App.tsx`, `src/client/styles.css`: local control console.
- `src/client/api.ts`, `src/client/qr.ts`: API client and QR decoding helper.
- `tests/unit/*.test.ts`: unit tests for storage, schemas, model adapter, QR, and risk rules.
- `tests/playwright/*.test.ts`: extractor, fill engine, and end-to-end smoke tests.
- `tests/fixtures/simple-questionnaire.html`, `tests/fixtures/login-page.html`, `tests/fixtures/captcha-page.html`: deterministic local pages.
- `docs/README.md`: local run instructions and MVP boundary notes.

## Task 1: Initialize Repository and Tooling

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `index.html`

- [ ] **Step 1: Initialize git and npm**

Run:

```powershell
git init
npm init -y
```

Expected: `.git/` exists and `package.json` exists.

- [ ] **Step 2: Install dependencies**

Run:

```powershell
npm install @fastify/cors @vitejs/plugin-react fastify jsqr playwright react react-dom zod
npm install -D @testing-library/jest-dom @testing-library/react @types/node @types/react @types/react-dom jsdom tsx typescript vite vitest
npx playwright install chromium
```

Expected: `node_modules/` exists and Chromium is installed for Playwright.

- [ ] **Step 3: Configure npm scripts**

Run:

```powershell
npm pkg set type=module
npm pkg set scripts.dev="vite --host 127.0.0.1"
npm pkg set scripts.server="tsx watch src/server/index.ts"
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
npm pkg set scripts.test:playwright="vitest run tests/playwright"
npm pkg set scripts.build="tsc -p tsconfig.json && vite build"
```

Expected: `npm run test` executes Vitest after tests exist.

- [ ] **Step 4: Write `.gitignore`**

Create `.gitignore` with:

```gitignore
node_modules/
dist/
.data/
test-results/
playwright-report/
.superpowers/
*.log
```

- [ ] **Step 5: Write TypeScript and tool config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/server"]
}
```

Create `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    }
  }
});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  }
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  use: {
    browserName: 'chromium',
    headless: true
  }
});
```

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>问卷自动化</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Verify tooling**

Run:

```powershell
npm run build
```

Expected: build fails only if `src/client/main.tsx` is missing. This confirms tooling is wired before app files exist.

- [ ] **Step 7: Commit tooling**

Run:

```powershell
git add .gitignore package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts playwright.config.ts index.html
git commit -m "chore: initialize local questionnaire app tooling"
```

Expected: one initial commit.

## Task 2: Shared Domain Types and Schemas

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/schemas.ts`
- Test: `tests/unit/schemas.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create `tests/unit/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ModelAnswerSchema, ProfileSchema, QuestionSchema } from '../../src/shared/schemas';

describe('shared schemas', () => {
  it('accepts a minimal profile', () => {
    const parsed = ProfileSchema.parse({
      fields: { name: '张三', studentId: '20260001' },
      updatedAt: '2026-05-05T00:00:00.000Z'
    });

    expect(parsed.fields.name).toBe('张三');
  });

  it('rejects a model answer with confidence outside 0..1', () => {
    expect(() =>
      ModelAnswerSchema.parse({
        questionId: 'q1',
        value: 'A',
        confidence: 2,
        action: 'fill',
        reason: 'invalid'
      })
    ).toThrow();
  });

  it('accepts a single choice question with options', () => {
    const parsed = QuestionSchema.parse({
      id: 'q1',
      label: '请选择部门',
      kind: 'single',
      required: true,
      selector: '[data-qid="q1"]',
      options: [
        { label: '研发部', value: '研发部', selector: '[data-option="dev"]' }
      ],
      risk: 'normal'
    });

    expect(parsed.options).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run schema tests to verify failure**

Run:

```powershell
npm run test -- tests/unit/schemas.test.ts
```

Expected: FAIL because `src/shared/schemas.ts` does not exist.

- [ ] **Step 3: Create shared types**

Create `src/shared/types.ts`:

```ts
export type QuestionKind = 'text' | 'single' | 'multiple' | 'select' | 'unknown';
export type QuestionRisk = 'normal' | 'sensitive' | 'unsupported';
export type AnswerAction = 'fill' | 'review' | 'skip';
export type TaskStatus = 'idle' | 'analyzing' | 'answering' | 'filling' | 'needs_review' | 'failed' | 'complete';

export interface ProfileData {
  fields: Record<string, string>;
  updatedAt: string;
}

export interface ModelConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  updatedAt: string;
}

export interface QuestionOption {
  label: string;
  value: string;
  selector: string;
}

export interface Question {
  id: string;
  label: string;
  kind: QuestionKind;
  required: boolean;
  selector: string;
  options: QuestionOption[];
  risk: QuestionRisk;
}

export interface ModelAnswer {
  questionId: string;
  value: string | string[];
  confidence: number;
  action: AnswerAction;
  reason: string;
}

export interface FillResult {
  questionId: string;
  status: 'filled' | 'needs_review' | 'skipped';
  message: string;
}

export interface QuestionnaireTask {
  id: string;
  url: string;
  status: TaskStatus;
  questions: Question[];
  answers: ModelAnswer[];
  fillResults: FillResult[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 4: Create schemas**

Create `src/shared/schemas.ts`:

```ts
import { z } from 'zod';

export const ProfileSchema = z.object({
  fields: z.record(z.string(), z.string()),
  updatedAt: z.string().datetime()
});

export const ModelConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  updatedAt: z.string().datetime()
});

export const QuestionOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  selector: z.string().min(1)
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(['text', 'single', 'multiple', 'select', 'unknown']),
  required: z.boolean(),
  selector: z.string().min(1),
  options: z.array(QuestionOptionSchema),
  risk: z.enum(['normal', 'sensitive', 'unsupported'])
});

export const ModelAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.union([z.string(), z.array(z.string())]),
  confidence: z.number().min(0).max(1),
  action: z.enum(['fill', 'review', 'skip']),
  reason: z.string().min(1)
});

export const FillResultSchema = z.object({
  questionId: z.string().min(1),
  status: z.enum(['filled', 'needs_review', 'skipped']),
  message: z.string().min(1)
});

export const QuestionnaireTaskSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  status: z.enum(['idle', 'analyzing', 'answering', 'filling', 'needs_review', 'failed', 'complete']),
  questions: z.array(QuestionSchema),
  answers: z.array(ModelAnswerSchema),
  fillResults: z.array(FillResultSchema),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
```

- [ ] **Step 5: Run schema tests**

Run:

```powershell
npm run test -- tests/unit/schemas.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit shared types**

Run:

```powershell
git add src/shared tests/unit/schemas.test.ts
git commit -m "feat: add shared questionnaire domain schemas"
```

Expected: one commit with shared types and schema tests.

## Task 3: Local JSON Storage

**Files:**
- Create: `src/server/storage/jsonStore.ts`
- Test: `tests/unit/jsonStore.test.ts`

- [ ] **Step 1: Write failing storage tests**

Create `tests/unit/jsonStore.test.ts`:

```ts
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonStore } from '../../src/server/storage/jsonStore';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'questionnaire-store-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('JsonStore', () => {
  it('returns the default value when a file does not exist', async () => {
    const store = new JsonStore(dir);
    const profile = await store.readProfile();

    expect(profile.fields).toEqual({});
  });

  it('persists profile data', async () => {
    const store = new JsonStore(dir);
    await store.writeProfile({ fields: { name: '李四' }, updatedAt: '2026-05-05T00:00:00.000Z' });

    await expect(store.readProfile()).resolves.toEqual({
      fields: { name: '李四' },
      updatedAt: '2026-05-05T00:00:00.000Z'
    });
  });

  it('does not expose a default API key', async () => {
    const store = new JsonStore(dir);
    const config = await store.readModelConfig();

    expect(config.apiKey).toBe('');
  });
});
```

- [ ] **Step 2: Run storage tests to verify failure**

Run:

```powershell
npm run test -- tests/unit/jsonStore.test.ts
```

Expected: FAIL because `JsonStore` does not exist.

- [ ] **Step 3: Implement JSON storage**

Create `src/server/storage/jsonStore.ts`:

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ModelConfig, ProfileData } from '../../shared/types';
import { ModelConfigSchema, ProfileSchema } from '../../shared/schemas';

const now = () => new Date().toISOString();

export class JsonStore {
  constructor(private readonly dataDir = '.data') {}

  async readProfile(): Promise<ProfileData> {
    return this.readJson('profile.json', ProfileSchema.parse, {
      fields: {},
      updatedAt: now()
    });
  }

  async writeProfile(profile: ProfileData): Promise<ProfileData> {
    const parsed = ProfileSchema.parse(profile);
    await this.writeJson('profile.json', parsed);
    return parsed;
  }

  async readModelConfig(): Promise<ModelConfig> {
    return this.readJson('model-config.json', ModelConfigSchema.parse, {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: '',
      updatedAt: now()
    });
  }

  async writeModelConfig(config: ModelConfig): Promise<ModelConfig> {
    const parsed = ModelConfigSchema.parse(config);
    await this.writeJson('model-config.json', parsed);
    return parsed;
  }

  private async readJson<T>(fileName: string, parse: (value: unknown) => T, defaultValue: T): Promise<T> {
    try {
      const raw = await readFile(join(this.dataDir, fileName), 'utf8');
      return parse(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return defaultValue;
      }
      throw error;
    }
  }

  private async writeJson(fileName: string, value: unknown): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    await writeFile(join(this.dataDir, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }
}
```

- [ ] **Step 4: Run storage tests**

Run:

```powershell
npm run test -- tests/unit/jsonStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit storage**

Run:

```powershell
git add src/server/storage/jsonStore.ts tests/unit/jsonStore.test.ts
git commit -m "feat: persist local profile and model config"
```

Expected: one commit.

## Task 4: Model Adapter

**Files:**
- Create: `src/server/model/modelAdapter.ts`
- Test: `tests/unit/modelAdapter.test.ts`

- [ ] **Step 1: Write failing model adapter tests**

Create `tests/unit/modelAdapter.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateAnswers } from '../../src/server/model/modelAdapter';
import { ModelConfig, ProfileData, Question } from '../../src/shared/types';

const config: ModelConfig = {
  baseUrl: 'https://example.test/v1',
  apiKey: 'key',
  model: 'cheap-model',
  updatedAt: '2026-05-05T00:00:00.000Z'
};

const profile: ProfileData = {
  fields: { name: '张三' },
  updatedAt: '2026-05-05T00:00:00.000Z'
};

const questions: Question[] = [
  {
    id: 'q1',
    label: '姓名',
    kind: 'text',
    required: true,
    selector: '[data-qid="q1"]',
    options: [],
    risk: 'normal'
  }
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateAnswers', () => {
  it('parses structured JSON answers from an OpenAI-compatible response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              answers: [
                {
                  questionId: 'q1',
                  value: '张三',
                  confidence: 0.98,
                  action: 'fill',
                  reason: 'profile name'
                }
              ]
            })
          }
        }
      ]
    }), { status: 200 })));

    const answers = await generateAnswers({ config, profile, questions });

    expect(answers).toHaveLength(1);
    expect(answers[0].value).toBe('张三');
  });

  it('throws a readable error when the provider returns invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: 'not-json' } }]
    }), { status: 200 })));

    await expect(generateAnswers({ config, profile, questions })).rejects.toThrow('Model response was not valid JSON');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm run test -- tests/unit/modelAdapter.test.ts
```

Expected: FAIL because `modelAdapter.ts` does not exist.

- [ ] **Step 3: Implement model adapter**

Create `src/server/model/modelAdapter.ts`:

```ts
import { z } from 'zod';
import { ModelAnswerSchema } from '../../shared/schemas';
import { ModelAnswer, ModelConfig, ProfileData, Question } from '../../shared/types';

const ChatResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string()
      })
    })
  ).min(1)
});

const AnswerEnvelopeSchema = z.object({
  answers: z.array(ModelAnswerSchema)
});

export interface GenerateAnswersInput {
  config: ModelConfig;
  profile: ProfileData;
  questions: Question[];
}

export async function generateAnswers(input: GenerateAnswersInput): Promise<ModelAnswer[]> {
  const url = `${input.config.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: input.config.model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: JSON.stringify({ profile: input.profile.fields, questions: input.questions }) }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Model request failed with HTTP ${response.status}`);
  }

  const parsed = ChatResponseSchema.parse(await response.json());
  const content = parsed.choices[0].message.content;

  let decoded: unknown;
  try {
    decoded = JSON.parse(content);
  } catch {
    throw new Error('Model response was not valid JSON');
  }

  return AnswerEnvelopeSchema.parse(decoded).answers;
}

export async function testModelConnection(config: ModelConfig): Promise<{ ok: boolean; message: string }> {
  try {
    await generateAnswers({
      config,
      profile: { fields: {}, updatedAt: new Date().toISOString() },
      questions: [
        {
          id: 'connection-test',
          label: 'Return the word ok',
          kind: 'text',
          required: false,
          selector: '#connection-test',
          options: [],
          risk: 'normal'
        }
      ]
    });
    return { ok: true, message: 'Model connection succeeded' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Model connection failed' };
  }
}

function systemPrompt(): string {
  return [
    'You fill low-risk public questionnaire fields from user-provided local profile data.',
    'Return only JSON with this shape: {"answers":[{"questionId":"...","value":"...","confidence":0.9,"action":"fill","reason":"..."}]}.',
    'Use action "review" for subjective or uncertain questions.',
    'Use action "skip" for sensitive questions involving politics, health privacy, legal commitments, financial authorization, or identity misuse.',
    'Never invent personal data that is not present in the profile.'
  ].join('\n');
}
```

- [ ] **Step 4: Run model adapter tests**

Run:

```powershell
npm run test -- tests/unit/modelAdapter.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit model adapter**

Run:

```powershell
git add src/server/model/modelAdapter.ts tests/unit/modelAdapter.test.ts
git commit -m "feat: add openai compatible model adapter"
```

Expected: one commit.

## Task 5: Safety Risk Rules

**Files:**
- Create: `src/server/safety/risk.ts`
- Test: `tests/unit/risk.test.ts`

- [ ] **Step 1: Write failing risk tests**

Create `tests/unit/risk.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { classifyQuestionRisk } from '../../src/server/safety/risk';

describe('classifyQuestionRisk', () => {
  it('marks normal administrative questions as normal', () => {
    expect(classifyQuestionRisk('请填写姓名')).toBe('normal');
  });

  it('marks health privacy questions as sensitive', () => {
    expect(classifyQuestionRisk('请填写你的疾病史和健康隐私')).toBe('sensitive');
  });

  it('marks financial authorization questions as sensitive', () => {
    expect(classifyQuestionRisk('是否同意财务授权扣款')).toBe('sensitive');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm run test -- tests/unit/risk.test.ts
```

Expected: FAIL because `risk.ts` does not exist.

- [ ] **Step 3: Implement risk classifier**

Create `src/server/safety/risk.ts`:

```ts
import { QuestionRisk } from '../../shared/types';

const sensitivePatterns = [
  /政治|党派|宗教|立场/,
  /疾病|病史|健康隐私|心理健康|医疗/,
  /法律责任|承诺书|声明|保证/,
  /财务授权|扣款|银行卡|贷款|征信/,
  /身份证照片|人脸|生物识别/
];

export function classifyQuestionRisk(label: string): QuestionRisk {
  return sensitivePatterns.some((pattern) => pattern.test(label)) ? 'sensitive' : 'normal';
}
```

- [ ] **Step 4: Run risk tests**

Run:

```powershell
npm run test -- tests/unit/risk.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit risk rules**

Run:

```powershell
git add src/server/safety/risk.ts tests/unit/risk.test.ts
git commit -m "feat: classify sensitive questionnaire prompts"
```

Expected: one commit.

## Task 6: Questionnaire Extraction

**Files:**
- Create: `src/server/questionnaire/extractor.ts`
- Create: `tests/fixtures/simple-questionnaire.html`
- Create: `tests/fixtures/login-page.html`
- Create: `tests/fixtures/captcha-page.html`
- Test: `tests/playwright/extractor.test.ts`

- [ ] **Step 1: Create fixture pages**

Create `tests/fixtures/simple-questionnaire.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <body>
    <form>
      <label data-qid="name">姓名 <input name="name" required /></label>
      <fieldset data-qid="dept">
        <legend>请选择部门</legend>
        <label><input type="radio" name="dept" value="研发部" />研发部</label>
        <label><input type="radio" name="dept" value="市场部" />市场部</label>
      </fieldset>
      <fieldset data-qid="tools">
        <legend>常用工具</legend>
        <label><input type="checkbox" name="tools" value="飞书" />飞书</label>
        <label><input type="checkbox" name="tools" value="微信" />微信</label>
      </fieldset>
      <label data-qid="city">城市
        <select name="city">
          <option value="">请选择</option>
          <option value="北京">北京</option>
          <option value="上海">上海</option>
        </select>
      </label>
      <button type="submit">提交</button>
    </form>
  </body>
</html>
```

Create `tests/fixtures/login-page.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <body>
    <h1>登录</h1>
    <input type="password" placeholder="密码" />
  </body>
</html>
```

Create `tests/fixtures/captcha-page.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <body>
    <h1>人机验证</h1>
    <div>captcha</div>
  </body>
</html>
```

- [ ] **Step 2: Write failing extractor tests**

Create `tests/playwright/extractor.test.ts`:

```ts
import { chromium, Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
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
    expect(result.questions.map((question) => question.kind)).toEqual(['text', 'single', 'multiple', 'select']);
  });

  it('stops on login pages', async () => {
    await openFixture('login-page.html');
    const result = await extractQuestions(page);

    expect(result.status).toBe('blocked');
    expect(result.reason).toContain('login');
  });

  it('stops on captcha pages', async () => {
    await openFixture('captcha-page.html');
    const result = await extractQuestions(page);

    expect(result.status).toBe('blocked');
    expect(result.reason).toContain('captcha');
  });
});
```

- [ ] **Step 3: Run extractor tests to verify failure**

Run:

```powershell
npm run test -- tests/playwright/extractor.test.ts
```

Expected: FAIL because `extractor.ts` does not exist.

- [ ] **Step 4: Implement extractor**

Create `src/server/questionnaire/extractor.ts`:

```ts
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
      kind: Question['kind'];
      required: boolean;
      selector: string;
      options: Question['options'];
    }> = [];

    document.querySelectorAll('input:not([type="hidden"]), textarea').forEach((input, index) => {
      const element = input as HTMLInputElement | HTMLTextAreaElement;
      if (element.type === 'radio' || element.type === 'checkbox') return;
      const label = element.closest('label')?.textContent?.trim() || element.getAttribute('placeholder') || element.name || `文本题 ${index + 1}`;
      output.push({
        id: element.name || element.id || `text-${index + 1}`,
        label,
        kind: 'text',
        required: element.required,
        selector: element.name ? `[name="${element.name}"]` : element.id ? `#${element.id}` : `input:nth-of-type(${index + 1})`,
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
        options: inputs.map((input, optionIndex) => ({
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
```

- [ ] **Step 5: Run extractor tests**

Run:

```powershell
npm run test -- tests/playwright/extractor.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit extractor**

Run:

```powershell
git add src/server/questionnaire/extractor.ts src/server/safety/risk.ts tests/fixtures tests/playwright/extractor.test.ts
git commit -m "feat: extract supported questionnaire fields"
```

Expected: one commit.

## Task 7: Fill Engine

**Files:**
- Create: `src/server/questionnaire/fillEngine.ts`
- Test: `tests/playwright/fillEngine.test.ts`

- [ ] **Step 1: Write failing fill engine tests**

Create `tests/playwright/fillEngine.test.ts`:

```ts
import { chromium, Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
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

    await expect(page.locator('[name="name"]')).toHaveValue('张三');
    await expect(page.locator('[name="dept"][value="研发部"]')).toBeChecked();
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm run test -- tests/playwright/fillEngine.test.ts
```

Expected: FAIL because `fillEngine.ts` does not exist.

- [ ] **Step 3: Implement fill engine**

Create `src/server/questionnaire/fillEngine.ts`:

```ts
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
```

- [ ] **Step 4: Run fill engine tests**

Run:

```powershell
npm run test -- tests/playwright/fillEngine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit fill engine**

Run:

```powershell
git add src/server/questionnaire/fillEngine.ts tests/playwright/fillEngine.test.ts
git commit -m "feat: conservatively fill questionnaire controls"
```

Expected: one commit.

## Task 8: Local API Server

**Files:**
- Create: `src/server/app.ts`
- Create: `src/server/index.ts`
- Test: `tests/unit/serverApp.test.ts`

- [ ] **Step 1: Write failing API tests**

Create `tests/unit/serverApp.test.ts`:

```ts
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'questionnaire-api-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('local API', () => {
  it('saves and reads profile data', async () => {
    const app = buildApp({ dataDir: dir });
    await app.ready();

    const write = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      payload: { fields: { name: '张三' }, updatedAt: '2026-05-05T00:00:00.000Z' }
    });
    expect(write.statusCode).toBe(200);

    const read = await app.inject({ method: 'GET', url: '/api/profile' });
    expect(read.json().fields.name).toBe('张三');
  });
});
```

- [ ] **Step 2: Run API tests to verify failure**

Run:

```powershell
npm run test -- tests/unit/serverApp.test.ts
```

Expected: FAIL because `app.ts` does not exist.

- [ ] **Step 3: Implement API server**

Create `src/server/app.ts`:

```ts
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { ModelConfigSchema, ProfileSchema } from '../shared/schemas';
import { JsonStore } from './storage/jsonStore';
import { testModelConnection } from './model/modelAdapter';

export interface BuildAppOptions {
  dataDir?: string;
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: false });
  const store = new JsonStore(options.dataDir);

  app.register(cors, { origin: true });

  app.get('/api/health', async () => ({ ok: true }));

  app.get('/api/profile', async () => store.readProfile());

  app.put('/api/profile', async (request, reply) => {
    const profile = ProfileSchema.parse(request.body);
    const saved = await store.writeProfile(profile);
    return reply.send(saved);
  });

  app.get('/api/model-config', async () => store.readModelConfig());

  app.put('/api/model-config', async (request, reply) => {
    const config = ModelConfigSchema.parse(request.body);
    const saved = await store.writeModelConfig(config);
    return reply.send(saved);
  });

  app.post('/api/model-config/test', async (request) => {
    const config = ModelConfigSchema.parse(request.body);
    return testModelConnection(config);
  });

  return app;
}
```

Create `src/server/index.ts`:

```ts
import { buildApp } from './app';

const app = buildApp({ dataDir: '.data' });
const port = Number(process.env.PORT || 8787);

app.listen({ host: '127.0.0.1', port }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
```

- [ ] **Step 4: Run API tests**

Run:

```powershell
npm run test -- tests/unit/serverApp.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit API server**

Run:

```powershell
git add src/server/app.ts src/server/index.ts tests/unit/serverApp.test.ts
git commit -m "feat: expose local profile and model config api"
```

Expected: one commit.

## Task 9: Task Runner and Browser Orchestration

**Files:**
- Create: `src/server/tasks/taskRunner.ts`
- Modify: `src/server/app.ts`
- Test: `tests/unit/taskRunner.test.ts`

- [ ] **Step 1: Write failing task runner tests**

Create `tests/unit/taskRunner.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createQuestionnaireTask } from '../../src/server/tasks/taskRunner';

describe('createQuestionnaireTask', () => {
  it('creates an idle task with timestamps', () => {
    const task = createQuestionnaireTask('https://example.test/form');

    expect(task.url).toBe('https://example.test/form');
    expect(task.status).toBe('idle');
    expect(task.questions).toEqual([]);
  });

  it('rejects invalid URLs', () => {
    expect(() => createQuestionnaireTask('not-a-url')).toThrow('Invalid questionnaire URL');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm run test -- tests/unit/taskRunner.test.ts
```

Expected: FAIL because `taskRunner.ts` does not exist.

- [ ] **Step 3: Implement task creation**

Create `src/server/tasks/taskRunner.ts`:

```ts
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
```

- [ ] **Step 4: Add task creation endpoint**

Modify `src/server/app.ts` by adding this import:

```ts
import { z } from 'zod';
import { createQuestionnaireTask } from './tasks/taskRunner';
```

Add this schema near the store setup:

```ts
const CreateTaskSchema = z.object({
  url: z.string().url()
});
```

Add this route before `return app;`:

```ts
  app.post('/api/tasks', async (request, reply) => {
    const input = CreateTaskSchema.parse(request.body);
    const task = createQuestionnaireTask(input.url);
    return reply.code(201).send(task);
  });
```

- [ ] **Step 5: Run task tests and API tests**

Run:

```powershell
npm run test -- tests/unit/taskRunner.test.ts tests/unit/serverApp.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit task runner**

Run:

```powershell
git add src/server/tasks/taskRunner.ts src/server/app.ts tests/unit/taskRunner.test.ts
git commit -m "feat: create local questionnaire tasks"
```

Expected: one commit.

## Task 10: QR Decoding Helper

**Files:**
- Create: `src/client/qr.ts`
- Test: `tests/unit/qr.test.ts`

- [ ] **Step 1: Write failing QR validation tests**

Create `tests/unit/qr.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeImportedUrl } from '../../src/client/qr';

describe('normalizeImportedUrl', () => {
  it('accepts https URLs', () => {
    expect(normalizeImportedUrl('https://wj.example.test/a')).toBe('https://wj.example.test/a');
  });

  it('rejects non-URL text', () => {
    expect(() => normalizeImportedUrl('hello')).toThrow('Imported content is not a valid URL');
  });
});
```

- [ ] **Step 2: Run QR tests to verify failure**

Run:

```powershell
npm run test -- tests/unit/qr.test.ts
```

Expected: FAIL because `qr.ts` does not exist.

- [ ] **Step 3: Implement QR helper**

Create `src/client/qr.ts`:

```ts
import jsQR from 'jsqr';

export function normalizeImportedUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Unsupported URL protocol');
    }
    return url.toString();
  } catch {
    throw new Error('Imported content is not a valid URL');
  }
}

export async function decodeQrFromFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available');
  }
  context.drawImage(bitmap, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const decoded = jsQR(imageData.data, imageData.width, imageData.height);
  if (!decoded) {
    throw new Error('No QR code was found in the image');
  }
  return normalizeImportedUrl(decoded.data);
}
```

- [ ] **Step 4: Run QR tests**

Run:

```powershell
npm run test -- tests/unit/qr.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit QR helper**

Run:

```powershell
git add src/client/qr.ts tests/unit/qr.test.ts
git commit -m "feat: normalize imported questionnaire links"
```

Expected: one commit.

## Task 11: Local Console UI

**Files:**
- Create: `src/client/api.ts`
- Create: `src/client/main.tsx`
- Create: `src/client/App.tsx`
- Create: `src/client/styles.css`
- Test: `tests/unit/App.test.tsx`

- [ ] **Step 1: Write failing UI test**

Create `tests/unit/App.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/client/App';

describe('App', () => {
  it('renders the local automation console', () => {
    render(<App />);

    expect(screen.getByText('问卷自动化控制台')).toBeInTheDocument();
    expect(screen.getByLabelText('问卷链接')).toBeInTheDocument();
    expect(screen.getByText('本地资料')).toBeInTheDocument();
    expect(screen.getByText('模型配置')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run UI test to verify failure**

Run:

```powershell
npm run test -- tests/unit/App.test.tsx
```

Expected: FAIL because `App.tsx` does not exist.

- [ ] **Step 3: Implement API client**

Create `src/client/api.ts`:

```ts
import { ModelConfig, ProfileData, QuestionnaireTask } from '../shared/types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  readProfile: () => request<ProfileData>('/api/profile'),
  saveProfile: (profile: ProfileData) => request<ProfileData>('/api/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  readModelConfig: () => request<ModelConfig>('/api/model-config'),
  saveModelConfig: (config: ModelConfig) => request<ModelConfig>('/api/model-config', { method: 'PUT', body: JSON.stringify(config) }),
  createTask: (url: string) => request<QuestionnaireTask>('/api/tasks', { method: 'POST', body: JSON.stringify({ url }) })
};
```

- [ ] **Step 4: Implement React entrypoint and app**

Create `src/client/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/client/App.tsx`:

```tsx
import { FormEvent, useState } from 'react';
import { api } from './api';
import { normalizeImportedUrl } from './qr';
import { ModelConfig, ProfileData, QuestionnaireTask } from '../shared/types';

const emptyProfile = (): ProfileData => ({ fields: { name: '', employeeId: '', studentId: '', department: '', address: '' }, updatedAt: new Date().toISOString() });
const emptyModel = (): ModelConfig => ({ baseUrl: 'https://api.openai.com/v1', apiKey: '', model: '', updatedAt: new Date().toISOString() });

export function App() {
  const [url, setUrl] = useState('');
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(emptyModel);
  const [task, setTask] = useState<QuestionnaireTask | null>(null);
  const [message, setMessage] = useState('本地保存资料，不自动提交问卷。');

  async function startTask(event: FormEvent) {
    event.preventDefault();
    try {
      const normalizedUrl = normalizeImportedUrl(url);
      await api.saveProfile({ ...profile, updatedAt: new Date().toISOString() });
      await api.saveModelConfig({ ...modelConfig, updatedAt: new Date().toISOString() });
      const created = await api.createTask(normalizedUrl);
      setTask(created);
      setMessage('任务已创建，下一步将接入页面分析和自动填写。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '任务创建失败');
    }
  }

  function updateProfileField(key: string, value: string) {
    setProfile((current) => ({ ...current, fields: { ...current.fields, [key]: value } }));
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Local first automation</p>
        <h1>问卷自动化控制台</h1>
        <p className="lede">导入公开问卷，使用本地资料和自配模型自动填写，停在提交前由你确认。</p>
      </section>

      <form className="workspace" onSubmit={startTask}>
        <section className="panel primary">
          <div className="panelHeader">
            <span>01</span>
            <h2>导入任务</h2>
          </div>
          <label>
            问卷链接
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
          </label>
          <button type="submit">创建填写任务</button>
          <p className="status">{message}</p>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <span>02</span>
            <h2>本地资料</h2>
          </div>
          {Object.keys(profile.fields).map((key) => (
            <label key={key}>
              {key}
              <input value={profile.fields[key]} onChange={(event) => updateProfileField(key, event.target.value)} />
            </label>
          ))}
        </section>

        <section className="panel">
          <div className="panelHeader">
            <span>03</span>
            <h2>模型配置</h2>
          </div>
          <label>
            Base URL
            <input value={modelConfig.baseUrl} onChange={(event) => setModelConfig({ ...modelConfig, baseUrl: event.target.value })} />
          </label>
          <label>
            API Key
            <input type="password" value={modelConfig.apiKey} onChange={(event) => setModelConfig({ ...modelConfig, apiKey: event.target.value })} />
          </label>
          <label>
            模型名
            <input value={modelConfig.model} onChange={(event) => setModelConfig({ ...modelConfig, model: event.target.value })} placeholder="deepseek-chat" />
          </label>
        </section>

        <section className="panel timeline">
          <div className="panelHeader">
            <span>04</span>
            <h2>任务状态</h2>
          </div>
          <div className="taskCard">
            <strong>{task ? task.status : 'idle'}</strong>
            <p>{task ? task.url : '还没有创建任务'}</p>
          </div>
        </section>
      </form>
    </main>
  );
}
```

- [ ] **Step 5: Implement Claude-inspired console styling**

Create `src/client/styles.css`:

```css
:root {
  color: #1f1b16;
  background: #f4efe6;
  font-family: Georgia, "Times New Roman", serif;
  --paper: #fffaf0;
  --ink: #1f1b16;
  --muted: #746b5f;
  --line: #d8cdbc;
  --accent: #2f6f61;
  --amber: #a16207;
  --error: #9f1d1d;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background:
    linear-gradient(120deg, rgba(47, 111, 97, 0.08), transparent 36%),
    var(--paper);
}

button,
input {
  font: inherit;
}

.shell {
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 38px 0;
}

.hero {
  display: grid;
  gap: 10px;
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: clamp(38px, 6vw, 74px);
  line-height: 0.96;
  letter-spacing: 0;
}

.lede {
  max-width: 680px;
  color: var(--muted);
  font-size: 18px;
  line-height: 1.6;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(300px, 1.2fr) minmax(260px, 0.9fr);
  gap: 14px;
  align-items: start;
}

.panel {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 250, 240, 0.82);
  padding: 18px;
  display: grid;
  gap: 14px;
  box-shadow: 0 16px 42px rgba(31, 27, 22, 0.06);
}

.primary {
  min-height: 250px;
}

.panelHeader {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.panelHeader span {
  color: var(--accent);
  font-size: 13px;
}

.panelHeader h2 {
  font-size: 20px;
}

label {
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-size: 13px;
}

input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fffdf8;
  color: var(--ink);
  padding: 11px 12px;
}

input:focus {
  outline: 2px solid rgba(47, 111, 97, 0.22);
  border-color: var(--accent);
}

button {
  border: 0;
  border-radius: 7px;
  background: var(--ink);
  color: #fffaf0;
  padding: 12px 14px;
  cursor: pointer;
}

button:hover {
  background: #332b22;
}

.status,
.taskCard p {
  color: var(--muted);
  line-height: 1.55;
}

.taskCard {
  border-left: 3px solid var(--amber);
  padding-left: 12px;
}

@media (max-width: 860px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Run UI test and build**

Run:

```powershell
npm run test -- tests/unit/App.test.tsx
npm run build
```

Expected: PASS and build succeeds.

- [ ] **Step 7: Commit UI**

Run:

```powershell
git add src/client tests/unit/App.test.tsx
git commit -m "feat: add local automation console ui"
```

Expected: one commit.

## Task 12: End-to-End Smoke and Documentation

**Files:**
- Create: `tests/playwright/smoke.test.ts`
- Create: `docs/README.md`

- [ ] **Step 1: Write smoke test**

Create `tests/playwright/smoke.test.ts`:

```ts
import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
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
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await browser.close();
  });
});
```

- [ ] **Step 2: Run smoke test**

Run:

```powershell
npm run test -- tests/playwright/smoke.test.ts
```

Expected: PASS.

- [ ] **Step 3: Write local documentation**

Create `docs/README.md`:

```md
# 问卷自动化 MVP

本项目是本地 Web 工具。第一版只处理公开、无需登录、无需验证码、无需复杂人机验证的网页问卷。

## 运行

```powershell
npm install
npx playwright install chromium
npm run server
npm run dev
```

打开 `http://127.0.0.1:5173`。

## 边界

- 个人资料和模型配置保存在本机 `.data/`。
- 用户自行配置 OpenAI-compatible `Base URL`、`API Key` 和模型名。
- 系统只自动填写页面，不自动提交。
- 登录页、验证码、人机验证和敏感问题会停止或标记为人工处理。

## 验证

```powershell
npm run test
npm run build
```
```

- [ ] **Step 4: Run full verification**

Run:

```powershell
npm run test
npm run build
```

Expected: all tests pass and production build succeeds.

- [ ] **Step 5: Commit smoke and docs**

Run:

```powershell
git add tests/playwright/smoke.test.ts docs/README.md
git commit -m "test: add questionnaire smoke coverage"
```

Expected: one commit.

## Self-Review

- Spec coverage: the plan covers local Web UI, local profile/model storage, user-provided API config, OpenAI-compatible model calls, public questionnaire extraction, conservative filling, QR import validation, no auto-submit, blocked login/captcha pages, sensitive-question handling, unit tests, Playwright tests, smoke test, and local docs.
- Type consistency: shared names are `ProfileData`, `ModelConfig`, `Question`, `ModelAnswer`, `FillResult`, and `QuestionnaireTask` throughout the plan.
- Execution boundary: implementation must stop after the local smoke path works and before adding cloud accounts, built-in model credits, browser extension packaging, Electron packaging, or online spreadsheet support.
