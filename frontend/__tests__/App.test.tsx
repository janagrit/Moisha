import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '../App';

describe('Moisha App interactive prototype', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify([]), { status: 200 }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('starts with no default addresses and prompts the user to enter their own property', () => {
    render(<App />);

    expect(
      screen.getByText(/Enter a Property Address Above to Get Started/i),
    ).toBeTruthy();
    expect(screen.queryByText(/Your Properties/i)).toBeNull();
  });

  it('allows entering any rental address and unlocks all 4 workspace tabs', async () => {
    render(<App />);

    const addressInput = screen.getByPlaceholderText(
      /Enter street address, city, or ZIP code/i,
    );
    fireEvent.change(addressInput, {
      target: { value: '500 Park Ave, Chicago, IL 60601' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Check Address/i }));

    expect((await screen.findAllByText(/500 Park Ave/i)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Download Proof Report/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Download CSV/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Comps & Submarket/i }));
    expect(screen.getByText(/Comparable Neighbors Around 500 Park Ave/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Profit & Promotions/i }));
    expect(screen.getByText(/Revenue, Expense & Net Profit Calculator/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Rules & Alerts/i }));
    expect(screen.getByText(/Moisha's Autonomous Pricing Rules/i)).toBeTruthy();
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
