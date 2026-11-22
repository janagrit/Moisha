import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import App from '../App';
import { US_ONLY_ERROR_MESSAGE } from '../services/usLocationService';

describe('Moisha competitor-monitoring dashboard', () => {
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

  it('rejects non-US properties with the exact required message', async () => {
    render(<App />);

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

  it('registers a US property, filters comparable vs non-comparable listings, and tracks price changes', async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/Airbnb listing URL/i), {
      target: { value: 'https://www.airbnb.com/rooms/55555555' },
    });
    fireEvent.change(screen.getByLabelText(/Property address or US ZIP code/i), {
      target: { value: '1500 S Congress Ave, Austin, TX 78704' },
    });
    // Default selected bedroom pill is 3
    fireEvent.click(screen.getByRole('button', { name: /Continue to dashboard/i }));

    // Dashboard renders My Property
    expect(await screen.findByText(/3-Bedroom Home in Austin/i)).toBeTruthy();

    // Set my nightly price inline
    fireEvent.change(screen.getByLabelText(/Set my current nightly price/i), {
      target: { value: '275' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Set price/i }));
    expect(screen.getByText('$275')).toBeTruthy();

    // Add a genuinely comparable 3BR entire home
    fireEvent.click(screen.getByRole('button', { name: /Add first competitor/i }));
    const dialog1 = screen.getByRole('dialog');
    fireEvent.change(within(dialog1).getByLabelText(/Airbnb listing URL \*/i), {
      target: { value: 'https://www.airbnb.com/rooms/77777777' },
    });
    fireEvent.change(within(dialog1).getByLabelText(/Property name/i), {
      target: { value: 'Travis Heights 3BR House' },
    });
    fireEvent.change(within(dialog1).getByLabelText(/Nightly price \(\$\) \*/i), {
      target: { value: '250' },
    });
    fireEvent.click(within(dialog1).getByRole('button', { name: /Save competitor/i }));

    expect(screen.getAllByText('Travis Heights 3BR House').length).toBeGreaterThanOrEqual(1);

    // Add a second 3BR comparable home so we can verify price sorting
    fireEvent.click(screen.getAllByRole('button', { name: /^Add competitor$/i })[0]);
    const dialogSecond = screen.getByRole('dialog');
    fireEvent.change(within(dialogSecond).getByLabelText(/Airbnb listing URL \*/i), {
      target: { value: 'https://www.airbnb.com/rooms/66666666' },
    });
    fireEvent.change(within(dialogSecond).getByLabelText(/Property name/i), {
      target: { value: 'Bouldin Creek 3BR Villa' },
    });
    fireEvent.change(within(dialogSecond).getByLabelText(/Nightly price \(\$\) \*/i), {
      target: { value: '310' },
    });
    fireEvent.click(within(dialogSecond).getByRole('button', { name: /Save competitor/i }));

    // Sort high to low and verify Bouldin Creek ($310) appears before Travis Heights ($250)
    const sortSelect = screen.getByLabelText(/Sort competitor listings/i);
    fireEvent.change(sortSelect, { target: { value: 'price_desc' } });
    const rows = screen.getAllByRole('row');
    expect(rows[1].textContent).toContain('Bouldin Creek 3BR Villa');
    expect(rows[2].textContent).toContain('Travis Heights 3BR House');

    // Add a Studio (should be excluded from primary comparable comparison)
    fireEvent.click(screen.getAllByRole('button', { name: /^Add competitor$/i })[0]);
    const dialog2 = screen.getByRole('dialog');
    fireEvent.change(within(dialog2).getByLabelText(/Airbnb listing URL \*/i), {
      target: { value: 'https://www.airbnb.com/rooms/88888888' },
    });
    fireEvent.change(within(dialog2).getByLabelText(/Property name/i), {
      target: { value: 'Downtown Tiny Studio' },
    });
    fireEvent.change(within(dialog2).getByLabelText(/^Type$/i), {
      target: { value: 'studio' },
    });
    fireEvent.change(within(dialog2).getByLabelText(/Nightly price \(\$\) \*/i), {
      target: { value: '120' },
    });
    fireEvent.click(within(dialog2).getByRole('button', { name: /Save competitor/i }));

    expect(screen.getByText(/Excluded non-comparable listings \(1\)/i)).toBeTruthy();

    // Run a price check where Travis Heights 3BR drops from $250 -> $215
    fireEvent.click(screen.getByRole('button', { name: /^Check prices$/i }));
    const checkDialog = screen.getByRole('dialog');
    const checkInput = within(checkDialog).getByLabelText(
      /Observed nightly price for Travis Heights 3BR House/i,
    );
    fireEvent.change(checkInput, { target: { value: '215' } });
    fireEvent.click(within(checkDialog).getByRole('button', { name: /Save check/i }));

    // Price changes feed now shows -14.0% drop
    expect(screen.getByText('-14.0%')).toBeTruthy();
  });
});
