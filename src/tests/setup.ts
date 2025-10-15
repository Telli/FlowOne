import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Default handlers can be extended per test
export const server = setupServer(
	// Example: GET /health/live
	rest.get('http://localhost:8000/health/live', (_req, res, ctx) => {
		return res(ctx.status(200), ctx.json({ ok: true, trace_id: 'test-trace' }));
	}),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export { rest };
