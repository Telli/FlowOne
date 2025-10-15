import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './src/tests/e2e',
	timeout: 30 * 1000,
	workers: 2,
	reporter: [['list']],
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		video: 'retain-on-failure',
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
});


