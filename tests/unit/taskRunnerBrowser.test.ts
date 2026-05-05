import { describe, expect, it, vi } from 'vitest';

const launch = vi.fn(async () => ({
  newPage: vi.fn(),
  close: vi.fn()
}));

vi.mock('playwright', () => ({
  chromium: { launch }
}));

const { launchReviewBrowser } = await import('../../src/server/tasks/taskRunner');

describe('launchReviewBrowser', () => {
  it('launches the user review browser with Microsoft Edge', async () => {
    await launchReviewBrowser();

    expect(launch).toHaveBeenCalledWith({ channel: 'msedge', headless: false });
  });
});
