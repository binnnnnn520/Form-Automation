import { FormEvent, useEffect, useRef, useState } from 'react';
import { DEFAULT_MODEL_NAME } from '../shared/defaults';
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
  model: DEFAULT_MODEL_NAME,
  updatedAt: new Date().toISOString()
});

const helperBookmarklet = "javascript:(()=>{const d=document,id='questionnaire-automation-helper-loader',old=d.getElementById(id);if(old)old.remove();const s=d.createElement('script');s.id=id;s.src='http://127.0.0.1:8787/api/fill-helper.js?'+Date.now();d.documentElement.appendChild(s);})()";

export function App() {
  const [url, setUrl] = useState('');
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(emptyModel);
  const [task, setTask] = useState<QuestionnaireTask | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('本地保存资料，不自动提交问卷。');
  const helperLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    helperLinkRef.current?.setAttribute('href', helperBookmarklet);
  }, []);

  async function persistSettings() {
    await Promise.all([
      api.saveProfile({ ...profile, updatedAt: new Date().toISOString() }),
      api.saveModelConfig({ ...modelConfig, updatedAt: new Date().toISOString() })
    ]);
  }

  async function saveSettings() {
    setIsSaving(true);
    setMessage('正在保存本地资料和模型配置...');
    try {
      await persistSettings();
      setMessage('已保存。用普通 Edge 打开问卷页后，点击收藏栏里的“真实页面填充助手”。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  }

  async function startTask(event: FormEvent) {
    event.preventDefault();
    setIsRunning(true);
    setMessage('正在打开受控 Edge、分析题目并填写。若问卷星拦截，请改用真实页面填充助手。');
    try {
      const normalizedUrl = normalizeImportedUrl(url);
      await persistSettings();
      const created = await api.createTask(normalizedUrl);
      setTask(created);
      setMessage(taskMessage(created));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '任务创建失败');
    } finally {
      setIsRunning(false);
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
          <button type="submit" disabled={isRunning}>{isRunning ? '正在执行...' : '分析并填写任务'}</button>
          <p className="status">{message}</p>
          <div className="helperBox">
            <button type="button" className="secondaryButton" disabled={isRunning || isSaving} onClick={saveSettings}>
              {isSaving ? '保存中...' : '保存资料和模型配置'}
            </button>
            <a
              ref={helperLinkRef}
              className="helperLink"
              href="/api/fill-helper.js"
              onClick={(event) => {
                event.preventDefault();
                setMessage('请把“真实页面填充助手”拖到 Edge 收藏栏，再在普通 Edge 的问卷页面点击它。');
              }}
            >
              真实页面填充助手
            </a>
            <p>问卷星拦截受控 Edge 时，把上面的助手拖到收藏栏；在普通 Edge 打开的问卷页点击它。</p>
          </div>
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

function taskMessage(task: QuestionnaireTask): string {
  if (task.status === 'complete') {
    return '填写已完成。请检查打开的浏览器页面，确认无误后手动提交。';
  }
  if (task.status === 'needs_review') {
    return '已填写可安全匹配的项目，仍有问题需要人工确认。请检查打开的浏览器页面。';
  }
  if (task.status === 'failed') {
    if (task.error?.includes('questionnaire page not available')) {
      return '问卷页拦截了受控 Edge。请保存配置后，在普通 Edge 问卷页点击“真实页面填充助手”。';
    }
    return task.error || '任务执行失败';
  }
  return `任务状态：${task.status}`;
}
