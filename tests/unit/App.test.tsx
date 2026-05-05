import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/client/App';
import { DEFAULT_MODEL_NAME } from '../../src/shared/defaults';

describe('App', () => {
  it('renders the local automation console', () => {
    render(<App />);

    expect(screen.getByText('问卷自动化控制台')).toBeInTheDocument();
    expect(screen.getByLabelText('问卷链接')).toBeInTheDocument();
    expect(screen.getByText('本地资料')).toBeInTheDocument();
    expect(screen.getByText('模型配置')).toBeInTheDocument();
  });

  it('shows the real-page helper bookmarklet for blocked questionnaire pages', () => {
    render(<App />);

    const helper = screen.getByText('真实页面填充助手');
    expect(helper).toHaveAttribute('href', expect.stringContaining('/api/fill-helper.js'));
  });

  it('shows a copyable helper code fallback when dragging the bookmarklet fails', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: '复制助手代码' })).toBeInTheDocument();
    expect((screen.getByLabelText('助手代码') as HTMLTextAreaElement).value).toContain('/api/fill-helper.js');
  });

  it('uses a non-empty default model name', () => {
    render(<App />);

    expect(screen.getByDisplayValue(DEFAULT_MODEL_NAME)).toBeInTheDocument();
  });
});
