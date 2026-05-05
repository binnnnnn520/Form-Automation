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
