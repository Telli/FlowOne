import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest, server } from '../setup';
import { AIAssistant } from '../../components/AIAssistant';

describe('AIAssistant', () => {
  it('sends NLP command to backend and shows trace via callback', async () => {
    server.use(
      rest.post('http://localhost:8000/nlp/commands', async (_req, res, ctx) => {
        return res(ctx.json({ action: 'create', details: [], trace_id: 'tr-123' }));
      })
    );

    const onCommand = vi.fn();
    const onTraceId = vi.fn();
    render(<AIAssistant onCommand={onCommand} messages={[]} onTraceId={onTraceId} />);

    const input = screen.getByPlaceholderText(/Type or speak/i);
    fireEvent.change(input, { target: { value: 'Create sales agent' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(onCommand).toHaveBeenCalled();
      expect(onTraceId).toHaveBeenCalledWith('tr-123');
    });
  });
});


