import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../App';

describe('App', () => {
  it('renders top-level layout', () => {
    render(<App />);
    expect(screen.getByText(/FlowOne Voice/i)).toBeInTheDocument();
    expect(screen.getByText(/Agent Palette/i)).toBeInTheDocument();
  });
});


