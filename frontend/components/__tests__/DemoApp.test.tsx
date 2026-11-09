import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DemoApp from '../../DemoApp';

const tap = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

function send(text: string) {
  fireEvent.change(screen.getByLabelText('Message Moisha'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}

function addNeighbor(name: string) {
  tap("A neighbor's price");
  tap('Add a neighbor');
  send(name);
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('public portfolio demo', () => {
  it('opens straight away with fictional data and says so', () => {
    render(<DemoApp />);
    expect(screen.getByRole('status').textContent).toContain('Fictional data');
    expect(screen.getByRole('log').textContent).toContain('$');
    expect(screen.getAllByText('Sample data').length).toBeGreaterThan(0);
  });

  it('never touches browser storage', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const read = vi.spyOn(Storage.prototype, 'getItem');
    render(<DemoApp />);
    addNeighbor('Typed by a visitor');
    expect(write).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it('cannot show production data, even on the same browser origin', () => {
    localStorage.setItem('moisha:memory', JSON.stringify({ properties: [{ nickname: 'Real Private House' }] }));
    render(<DemoApp />);
    expect(document.body.textContent).not.toContain('Real Private House');
    expect(localStorage.getItem('moisha:memory')).toContain('Real Private House');
  });

  it('offers no backup, restore, erase or file controls', () => {
    render(<DemoApp />);
    tap('More');
    for (const name of ['Back up or share', 'Restore a backup', 'Erase this device', 'What do you remember?', 'Leave sample data']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(document.querySelector('input[type=file]')).toBeNull();
  });

  it('forgets what a visitor typed when the page is reopened', () => {
    const first = render(<DemoApp />);
    addNeighbor('Typed by a visitor');
    expect(screen.getByRole('log').textContent).toContain('Typed by a visitor');
    first.unmount();
    render(<DemoApp />);
    expect(screen.getByRole('log').textContent).not.toContain('Typed by a visitor');
  });

  it('does not show the mascot image', () => {
    render(<DemoApp />);
    expect(document.querySelector('img')).toBeNull();
  });

  it('can be started over', () => {
    render(<DemoApp />);
    addNeighbor('Typed by a visitor');
    tap('Never mind');
    tap('More');
    tap('Start the demo over');
    expect(screen.getByRole('log').textContent).not.toContain('Typed by a visitor');
  });

  it('imports no storage, backup or service-worker code', () => {
    const sources = import.meta.glob('../../DemoApp.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const [source] = Object.values(sources);
    const valueImports = source.split('\n').filter((line) => line.startsWith('import ') && !line.startsWith('import type'));
    expect(valueImports.length).toBeGreaterThan(3);
    expect(valueImports.join('\n')).not.toMatch(/memory\/|services\/|backupCrypto|exportImport|shareFile|pwa/);
  });
});
