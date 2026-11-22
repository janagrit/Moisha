import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import App from '../App';
import { US_ONLY_ERROR_MESSAGE } from '../services/usLocationService';

describe('Moisha mobile competitor-monitoring app (1-link auto-extraction)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/airbnb/ingest')) {
        if (url.includes('99999999')) {
          return new Response(
            JSON.stringify({
              ok: false,
              code: 'NON_US',
              error: US_ONLY_ERROR_MESSAGE,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            property: {
              id: 'prop-55555555',
              airbnbUrl: 'https://www.airbnb.com/rooms/55555555',
              airbnbRoomId: '55555555',
              name: 'Modern 3BR Austin Bungalow',
              address: '1500 S Congress Ave, Austin, TX 78704',
              city: 'Austin',
              state: 'TX',
              zipCode: '78704',
              neighborhood: 'South Congress, TX',
              latitude: 30.248,
              longitude: -97.75,
              propertyType: 'entire_home',
              bedrooms: 3,
              bathrooms: 2.5,
              guestCapacity: 6,
              nightlyPrice: 275,
              photoUrl: null,
              amenities: ['wifi', 'kitchen', 'free_parking'],
              createdAt: '2026-11-22T12:00:00.000Z',
            },
            competitors: [
              {
                id: 'airbnb-77777777',
                airbnbUrl: 'https://www.airbnb.com/rooms/77777777',
                airbnbRoomId: '77777777',
                name: 'Travis Heights 3BR House',
                propertyType: 'entire_home',
                bedrooms: 3,
                bathrooms: 2.5,
                guestCapacity: 6,
                nightlyPrice: 250,
                previousPrice: null,
                photoUrl: null,
                locationNote: 'Near South Congress',
                amenities: ['wifi', 'kitchen'],
                lastCheckedAt: '2026-11-22T12:00:00.000Z',
                priceHistory: [{ price: 250, recordedAt: '2026-11-22T12:00:00.000Z' }],
              },
              {
                id: 'airbnb-66666666',
                airbnbUrl: 'https://www.airbnb.com/rooms/66666666',
                airbnbRoomId: '66666666',
                name: 'Bouldin Creek 3BR Villa',
                propertyType: 'entire_home',
                bedrooms: 3,
                bathrooms: 3,
                guestCapacity: 8,
                nightlyPrice: 310,
                previousPrice: null,
                photoUrl: null,
                locationNote: 'Near South Congress',
                amenities: ['wifi', 'kitchen', 'pool'],
                lastCheckedAt: '2026-11-22T12:00:00.000Z',
                priceHistory: [{ price: 310, recordedAt: '2026-11-22T12:00:00.000Z' }],
              },
              {
                id: 'airbnb-88888888',
                airbnbUrl: 'https://www.airbnb.com/rooms/88888888',
                airbnbRoomId: '88888888',
                name: 'Downtown 1BR Loft',
                propertyType: 'entire_home',
                bedrooms: 1,
                bathrooms: 1,
                guestCapacity: 2,
                nightlyPrice: 140,
                previousPrice: null,
                photoUrl: null,
                locationNote: null,
                amenities: ['wifi'],
                lastCheckedAt: '2026-11-22T12:00:00.000Z',
                priceHistory: [{ price: 140, recordedAt: '2026-11-22T12:00:00.000Z' }],
              },
            ],
            priceChanges: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.includes('/api/airbnb/check')) {
        return new Response(
          JSON.stringify({
            ok: true,
            observedById: {
              'airbnb-77777777': 215,
              'airbnb-66666666': 310,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ available: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens immediately on the mobile DC 20002 prototype, navigates Comps tab, and previews morning alerts', () => {
    render(<App />);

    expect(screen.getByText('H St Corridor Brick Rowhouse')).toBeTruthy();
    expect(screen.getAllByText('Row home with a fire pit near H St').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText('-16.8%')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Preview email alert/i }));
    const emailDialog = screen.getByRole('dialog');
    expect(
      within(emailDialog).getByText(/Morning price-change email alert/i),
    ).toBeTruthy();
    fireEvent.click(within(emailDialog).getByRole('button', { name: /Close modal/i }));

    fireEvent.click(screen.getByRole('button', { name: /Comps/i }));
    expect(screen.getByText(/Excluded non-comparable listings \(2\)/i)).toBeTruthy();
  });

  it('rejects non-US Airbnb links automatically with the exact required message', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Use my Airbnb/i }));

    fireEvent.change(screen.getByLabelText(/Airbnb listing URL/i), {
      target: { value: 'https://www.airbnb.co.uk/rooms/99999999' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue to dashboard/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(US_ONLY_ERROR_MESSAGE);
  });

  it('auto-imports rooms, amenities, price, and nearby comps from ONLY an Airbnb URL and runs live price checks', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Use my Airbnb/i }));

    // User ONLY enters their Airbnb URL — zero other fields!
    fireEvent.change(screen.getByLabelText(/Airbnb listing URL/i), {
      target: { value: 'https://www.airbnb.com/rooms/55555555' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue to dashboard/i }));

    expect(await screen.findByText('Modern 3BR Austin Bungalow')).toBeTruthy();
    expect(screen.getAllByText('$275').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Wi-Fi')).toBeTruthy();
    expect(screen.getByText('Free parking')).toBeTruthy();

    // Navigate to Comps tab and verify auto-discovered comps + excluded 1BR + sorting
    fireEvent.click(screen.getByRole('button', { name: /Comps/i }));
    expect(screen.getByText(/Excluded non-comparable listings \(1\)/i)).toBeTruthy();

    const compsSection = screen.getByRole('region', { name: /Competitor listings/i });
    const sortSelect = within(compsSection).getByLabelText(/Sort competitor listings/i);
    fireEvent.change(sortSelect, { target: { value: 'price_desc' } });
    const items = within(compsSection).getAllByRole('listitem');
    expect(items[0].textContent).toContain('Bouldin Creek 3BR Villa');
    expect(items[1].textContent).toContain('Travis Heights 3BR House');

    // Tap Check prices -> runs automatic live API check ($250 -> $215 = -14.0%) with zero manual typing
    fireEvent.click(screen.getByRole('button', { name: /^Check prices$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Changes/i }));
    expect(await screen.findByText('-14.0%')).toBeTruthy();
  });
});
