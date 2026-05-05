import { FormEvent, useState } from 'react';
import { ModelConfig, ProfileData, QuestionnaireTask } from '../shared/types';
import { api } from './api';
import { normalizeImportedUrl } from './qr';

const emptyProfile = (): ProfileData => ({
  fields: { name: '', employeeId: '', studentId: '', department: '', address: '' },
  updatedAt: new Date().toISOString()
});

const emptyModel = (): ModelConfig => ({
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
  updatedAt: new Date().toISOString()
});

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
