import { todayAt } from '../domain/dates';
import type { Property } from '../domain/types';
import { MESSAGE_CAP, type ChatMessage, type Chip, type Memory } from '../memory/schema';

export interface Ctx {
  now: Date;
  isSample?: boolean;
  /** The public portfolio demo, which has nothing to back up, restore or remember. */
  isDemo?: boolean;
  /** Whether the browser promised not to clear this data. Null when unknown. */
  storagePersisted?: boolean | null;
}

export const todayOf = (ctx: Ctx): string => todayAt(ctx.now);

export const nameOf = (mem: Memory): string => mem.preferences.hostName ?? 'host';

export function newId(mem: Memory, prefix: string): [string, Memory] {
  return [`${prefix}${mem.nextId}`, { ...mem, nextId: mem.nextId + 1 }];
}

function addMessage(mem: Memory, ctx: Ctx, message: Omit<ChatMessage, 'id' | 'createdAt'>): Memory {
  const [id, next] = newId(mem, 'm');
  const createdAt = ctx.now.toISOString();
  return {
    ...next,
    updatedAt: createdAt,
    messages: [...next.messages, { ...message, id, createdAt }].slice(-MESSAGE_CAP),
  };
}

export function say(mem: Memory, ctx: Ctx, text: string, extras: Pick<ChatMessage, 'card' | 'chips'> = {}): Memory {
  return addMessage(mem, ctx, { author: 'moisha', text, ...extras });
}

export function hostSays(mem: Memory, ctx: Ctx, text: string): Memory {
  return addMessage(mem, ctx, { author: 'host', text });
}

export function selectedProperty(mem: Memory): Property | undefined {
  return mem.properties.find((p) => p.id === mem.selectedPropertyId) ?? mem.properties[0];
}

export function updateProperty(mem: Memory, id: string, patch: Partial<Property>): Memory {
  return { ...mem, properties: mem.properties.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

export function mainChips(mem: Memory): Chip[] {
  if (mem.properties.length === 0) {
    return [
      { label: "Let's set up", action: { type: 'flow', flow: 'setup' } },
      { label: 'Show me with sample data', action: { type: 'start-sample' } },
      { label: 'Restore a backup', action: { type: 'restore' } },
    ];
  }
  return [
    { label: 'What should I charge?', action: { type: 'show', view: 'price' } },
    { label: "A neighbor's price", action: { type: 'show', view: 'comps' } },
    { label: 'Empty nights', action: { type: 'show', view: 'gaps' } },
    { label: 'More', action: { type: 'show', view: 'more' } },
  ];
}

export function moreChips(mem: Memory, ctx: Ctx): Chip[] {
  const chips: Chip[] = [
    { label: 'Update my price', action: { type: 'flow', flow: 'update-price' } },
    { label: 'Set my minimum', action: { type: 'flow', flow: 'set-minimum' } },
    { label: 'My expenses', action: { type: 'flow', flow: 'expenses' } },
    { label: 'Mark dates', action: { type: 'flow', flow: 'dates' } },
    { label: 'Add a property', action: { type: 'flow', flow: 'setup' } },
  ];
  if (mem.properties.length > 1) chips.push({ label: 'Switch property', action: { type: 'show', view: 'properties' } });
  if (ctx.isDemo) {
    chips.push({ label: 'Start the demo over', action: { type: 'reset-confirm' } });
    return chips;
  }
  chips.push({ label: 'What do you remember?', action: { type: 'show', view: 'memory' } });
  if (ctx.isSample) {
    chips.push({ label: 'Leave sample data', action: { type: 'exit-sample' } });
  } else {
    chips.push(
      { label: 'Back up or share', action: { type: 'backup' } },
      { label: 'Restore a backup', action: { type: 'restore' } },
      { label: 'Erase this device', action: { type: 'reset-ask' } },
    );
  }
  return chips;
}
