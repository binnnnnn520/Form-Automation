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
  it('uses a non-empty default model name', () => {
    render(<App />);

    expect(screen.getByDisplayValue('deepseek-chat')).toBeInTheDocument();
  });
});
