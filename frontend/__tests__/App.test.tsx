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

  it('allows entering any custom rental address and generates an immediate verdict', () => {
    render(<App />);

    const addressInput = screen.getByPlaceholderText(/420 Main St, Nashville, TN 37206/i);
    fireEvent.change(addressInput, {
      target: { value: '742 Ocean Ave, Santa Monica, CA 90401' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Check Address/i }));

    expect(screen.getAllByText(/742 Ocean Ave/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders sample undercut alert and applies recommended price drop cleanly', () => {
    render(<App />);

    expect(screen.getByText(/Action Needed · Undercut Alert/i)).toBeTruthy();
    const dropButtons = screen.getAllByRole('button', { name: /Drop Rate to \$210\/nt/i });
    expect(dropButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(dropButtons[0]);

    expect(screen.getByText(/Market Aligned · Hold Steady/i)).toBeTruthy();
  });

  it('switches to Sample 3 (Williamsburg) and displays revenue upside', () => {
    render(<App />);

    fireEvent.click(screen.getByText(/Sample · Williamsburg 2BR Loft/i));

    expect(screen.getByText(/Revenue Opportunity · Raise Rate/i)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Raise Rate to \$/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('navigates across Comps, Profit & Promotions, and Rules & Alerts tabs', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Comps & Submarket/i }));
    expect(screen.getByText(/Comparable Neighbors Around 1500 S Congress Ave/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Profit & Promotions/i }));
    expect(screen.getByText(/Revenue, Expense & Net Profit Calculator/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Rules & Alerts/i }));
    expect(screen.getByText(/Moisha's Autonomous Pricing Rules/i)).toBeTruthy();
    expect(screen.getByText(/Price Alert Dispatch & Browser Notifications/i)).toBeTruthy();
  });

  it('shows first-time 4-step guide banner, allows dismissing it, and opens full How to Use dialog', () => {
    render(<App />);

    expect(
      screen.getByText(/First time here\? How to use Moisha in 4 easy steps/i),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Dismiss quick start guide/i }));
    expect(
      screen.queryByText(/First time here\? How to use Moisha in 4 easy steps/i),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /How to Use/i }));
    expect(
      screen.getByRole('dialog', { name: /How to Use Moisha — Step-by-Step Guide/i }),
    ).toBeTruthy();
  });
});
