import { describe, it, expect } from 'vitest';
import { rest, server } from '../setup';
import {
	createAgent,
	createSession,
	openSessionEvents,
	getVoiceToken,
	nlpCommands,
	createFlow,
	putFlow,
	getFlow,
	listFlows,
	getTemplates,
	patchAgent,
} from '../../lib/apiClient';

const API = 'http://localhost:8000';

describe('apiClient', () => {
	it('createAgent posts to backend', async () => {
		server.use(
			rest.post(`${API}/agents`, async (_req, res, ctx) => {
				return res(ctx.json({ agent: { id: 'a1', name: 'A', persona: { role: '', goals: [], tone: 'neutral' }, tools: [], memory: { summaries: [], vectors: [] } } }));
			})
		);
		const agent = await createAgent({ name: 'A', role: '', goals: [], tone: 'neutral' });
		expect(agent.id).toBe('a1');
	});

	it('createSession returns sessionId', async () => {
		server.use(
			rest.post(`${API}/sessions`, async (_req, res, ctx) => {
				return res(ctx.json({ sessionId: 's1' }));
			})
		);
		const sid = await createSession('agent_x');
		expect(sid).toBe('s1');
	});

	it('getVoiceToken returns room and token', async () => {
		server.use(
			rest.get(`${API}/voice/tokens`, async (_req, res, ctx) => {
				return res(ctx.json({ room: 'r1', token: 't1' }));
			})
		);
		const { room, token } = await getVoiceToken('s1');
		expect(room).toBe('r1');
		expect(token).toBe('t1');
	});

	it('nlpCommands returns action and trace_id', async () => {
		server.use(
			rest.post(`${API}/nlp/commands`, async (_req, res, ctx) => {
				return res(ctx.json({ action: 'create', details: [], trace_id: 'trace-1' }));
			})
		);
		const res = await nlpCommands('Create');
		expect(res.action).toBe('create');
		expect(res.trace_id).toBe('trace-1');
	});

	it('flows create/put/get/list', async () => {
		server.use(
			rest.post(`${API}/flows`, async (_req, res, ctx) => res(ctx.json({ flowId: 'f1', trace_id: 't' }))),
			rest.put(`${API}/flows/f1`, async (_req, res, ctx) => res(ctx.json({ ok: true, trace_id: 't2' }))),
			rest.get(`${API}/flows/f1`, async (_req, res, ctx) => res(ctx.json({ nodes: [], edges: [], trace_id: 't3' }))),
			rest.get(`${API}/flows`, async (_req, res, ctx) => res(ctx.json({ flows: [{ id: 'f1', name: 'Flow 1' }] }))),
		);
		const created = await createFlow('Flow 1');
		expect(created.flowId).toBe('f1');
		const trace = await putFlow('f1', { nodes: [], edges: [] });
		expect(trace).toBe('t2');
		const graph = await getFlow('f1');
		expect(Array.isArray(graph.nodes)).toBe(true);
		const flows = await listFlows();
		expect(flows[0].id).toBe('f1');
	});

	it('templates list and patchAgent', async () => {
		server.use(
			rest.get(`${API}/templates`, async (_req, res, ctx) => res(ctx.json({ templates: [{ id: 't1', key: 'sales', name: 'Sales' }] }))),
			rest.patch(`${API}/agents/a1`, async (_req, res, ctx) => res(ctx.json({ agent: { id: 'a1' }, trace_id: 'tr' }))),
		);
		const templates = await getTemplates();
		expect(templates[0].key).toBe('sales');
		const trace = await patchAgent('a1', { tone: 'friendly' });
		expect(trace).toBe('tr');
	});
});
