import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./tests/setup.ts'],
		coverage: {
			reporter: ['text', 'html'],
			provider: 'v8',
			all: true,
			lines: 70,
			functions: 70,
			branches: 60,
			statements: 70,
		},
	},
});
