import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest, server } from '../setup';
import { AgentConfigForm } from '../../components/AgentConfigForm';

describe('AgentConfigForm', () => {
  it('submits form and calls backend /agents', async () => {
    server.use(
      rest.post('http://localhost:8000/agents', async (_req, res, ctx) => {
        return res(
          ctx.json({
            agent: {
              id: 'agent_1',
              name: 'Sales Agent',
              persona: { role: 'test', goals: [], tone: 'neutral' },
              tools: [],
              memory: { summaries: [], vectors: [] },
            },
          })
        );
      })
    );

    const onSubmit = vi.fn();
    render(<AgentConfigForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Agent Name'), { target: { value: 'Sales Agent' } });
    fireEvent.change(screen.getByLabelText('Persona'), { target: { value: 'Professional, persuasive' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Agent|Creating|Update Agent/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});


