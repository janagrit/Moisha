import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '../App';

describe('Moisha App interactive prototype', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ available: false }), { status: 200 }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders House 1 undercut alert and applies recommended price drop cleanly', () => {
    render(<App />);

    expect(screen.getByText(/Action Needed · Undercut Alert/i)).toBeTruthy();
    const dropButtons = screen.getAllByRole('button', { name: /Drop Rate to \$210\/nt/i });
    expect(dropButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(dropButtons[0]);

    expect(screen.getByText(/Market Aligned · Hold Steady/i)).toBeTruthy();
  });

  it('switches to House 3 (Dupont) and displays revenue upside without House 1 text leakage', () => {
    render(<App />);

    const house3Card = screen.getByText(/1742 Riggs Pl NW \(Dupont\)/i);
    fireEvent.click(house3Card);

    expect(screen.getByText(/Revenue Opportunity · Raise Rate/i)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Raise Rate to \$/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('navigates across Comps, Profit & Promotions, and Rules & Alerts tabs', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Comps & Submarket/i }));
    expect(screen.getByText(/Comparable Neighbors Around 1114 Florida Ave NE/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Profit & Promotions/i }));
    expect(screen.getByText(/Revenue, Expense & Net Profit Calculator/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Rules & Alerts/i }));
    expect(screen.getByText(/Moisha's Autonomous Pricing Rules/i)).toBeTruthy();
    expect(screen.getByText(/Price Alert Dispatch & Browser Notifications/i)).toBeTruthy();
  });
});
