import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_MODEL_NAME } from '../../shared/defaults';
import { ModelConfigSchema, ProfileSchema } from '../../shared/schemas';
import { ModelConfig, ProfileData } from '../../shared/types';

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
    return this.readJson('model-config.json', parseModelConfig, {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: DEFAULT_MODEL_NAME,
      updatedAt: now()
    });
  }

  async writeModelConfig(config: ModelConfig): Promise<ModelConfig> {
    const parsed = parseModelConfig(config);
    await this.writeJson('model-config.json', parsed);
    return parsed;
  }

  private async readJson<T>(fileName: string, parse: (value: unknown) => T, defaultValue: T): Promise<T> {
    try {
      const raw = await readFile(join(this.dataDir, fileName), 'utf8');
      return parse(JSON.parse(raw.replace(/^\uFEFF/, '')));
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

function parseModelConfig(value: unknown): ModelConfig {
  const parsed = ModelConfigSchema.parse(value);
  const model = normalizeModelName(parsed.baseUrl, parsed.model);
  return { ...parsed, model };
}

function normalizeModelName(baseUrl: string, model: string): string {
  const trimmed = model.trim();
  if (!trimmed) {
    return DEFAULT_MODEL_NAME;
  }
  if (baseUrl.includes('api-inference.modelscope.cn') && trimmed === 'deepseek-chat') {
    return DEFAULT_MODEL_NAME;
  }
  return trimmed;
}
