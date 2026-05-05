import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  use: {
    browserName: 'chromium',
    headless: true
  }
});
