import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import App from '../App';
import { US_ONLY_ERROR_MESSAGE } from '../services/usLocationService';

describe('Moisha competitor-monitoring prototype & dashboard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('nominatim.openstreetmap.org')) {
        if (url.toLowerCase().includes('london') || url.toLowerCase().includes('toronto')) {
          return new Response(
            JSON.stringify([{ lat: '51.50', lon: '-0.12', address: { country_code: 'gb' } }]),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify([
            {
              lat: '30.248',
              lon: '-97.750',
              address: {
                house_number: '1500',
                road: 'South Congress Avenue',
                neighbourhood: 'South Congress',
                city: 'Austin',
                state: 'Texas',
                'ISO3166-2-lvl4': 'US-TX',
                postcode: '78704',
                country_code: 'us',
              },
            },
          ]),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ extracted: false, available: false }), {
        status: 200,
      });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens immediately on the interactive DC 20002 prototype and previews morning email alerts', () => {
    render(<App />);

    expect(screen.getByText('H St Corridor Brick Rowhouse')).toBeTruthy();
    expect(screen.getAllByText('Row home with a fire pit near H St').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText('-16.8%')).toBeTruthy();
    expect(screen.getByText(/Excluded non-comparable listings \(2\)/i)).toBeTruthy();

    // Open morning email alert preview
    fireEvent.click(screen.getByRole('button', { name: /Preview email alert/i }));
    const emailDialog = screen.getByRole('dialog');
    expect(
      within(emailDialog).getByText(/Morning price-change email alert/i),
    ).toBeTruthy();
  });

  it('switches to custom listing setup and rejects non-US properties with the exact required message', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Use my Airbnb/i }));

    fireEvent.change(screen.getByLabelText(/Airbnb listing URL/i), {
      target: { value: 'https://www.airbnb.com/rooms/12345678' },
    });
    fireEvent.change(screen.getByLabelText(/Property address or US ZIP code/i), {
      target: { value: '10 Downing St, London, UK' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue to dashboard/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(US_ONLY_ERROR_MESSAGE);
  });

  it('registers a US property, imports pasted Airbnb search text, sorts comparables, and tracks price changes', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Use my Airbnb/i }));

    fireEvent.change(screen.getByLabelText(/Airbnb listing URL/i), {
      target: { value: 'https://www.airbnb.com/rooms/55555555' },
    });
    fireEvent.change(screen.getByLabelText(/Property address or US ZIP code/i), {
      target: { value: '1500 S Congress Ave, Austin, TX 78704' },
    });
    fireEvent.change(screen.getByLabelText(/My current nightly price/i), {
      target: { value: '275' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue to dashboard/i }));

    expect(await screen.findByText(/3-Bedroom Home in Austin/i)).toBeTruthy();
    expect(screen.getByText('$275')).toBeTruthy();

    // Paste copied Airbnb search text with two 3BRs + one non-comparable 1BR
    fireEvent.click(screen.getByRole('button', { name: /Add or paste competitors/i }));
    const compDialog = screen.getByRole('dialog');
    fireEvent.click(within(compDialog).getByRole('button', { name: /Paste Airbnb page/i }));
    fireEvent.change(within(compDialog).getByLabelText(/Copied Airbnb search text/i), {
      target: {
        value: `Home in Austin\nTravis Heights 3BR House\n3 bedrooms · 2.5 baths\n$250 for 1 night\n\nHome in Austin\nBouldin Creek 3BR Villa\n3 bedrooms · 3 baths\n$310 for 1 night\n\nApartment in Austin\nDowntown 1BR Loft\n1 bedroom · 1 bath\n$140 for 1 night`,
      },
    });
    fireEvent.click(within(compDialog).getByRole('button', { name: /Import 3 listings/i }));

    expect(screen.getByText(/Excluded non-comparable listings \(1\)/i)).toBeTruthy();

    // Sort high to low and verify Bouldin Creek ($310) appears before Travis Heights ($250)
    const sortSelect = screen.getByLabelText(/Sort competitor listings/i);
    fireEvent.change(sortSelect, { target: { value: 'price_desc' } });
    const rows = screen.getAllByRole('row');
    expect(rows[1].textContent).toContain('Bouldin Creek 3BR Villa');
    expect(rows[2].textContent).toContain('Travis Heights 3BR House');

    // Run a price check where Travis Heights 3BR drops from $250 -> $215 (-14.0%)
    fireEvent.click(screen.getByRole('button', { name: /^Check prices$/i }));
    const checkDialog = screen.getByRole('dialog');
    const checkInput = within(checkDialog).getByLabelText(
      /Observed nightly price for Travis Heights 3BR House/i,
    );
    fireEvent.change(checkInput, { target: { value: '215' } });
    fireEvent.click(within(checkDialog).getByRole('button', { name: /Save check/i }));

    expect(screen.getByText('-14.0%')).toBeTruthy();
  });
});
