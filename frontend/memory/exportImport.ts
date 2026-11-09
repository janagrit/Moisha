import type { Memory } from './schema';
import { validateMemory } from './storage';

const FORMAT = 'moisha-export';

export function exportMemory(memory: Memory, now: Date): string {
  return JSON.stringify({ format: FORMAT, exportedAt: now.toISOString(), data: memory }, null, 2);
}

export function exportFileName(now: Date): string {
  return `moisha-backup-${now.toISOString().slice(0, 10)}.json`;
}

export interface ImportSummary {
  exportedAt: string;
  properties: number;
  comps: number;
  messages: number;
}

export type ImportResult =
  | { ok: true; memory: Memory; summary: ImportSummary }
  | { ok: false; error: string };

export function parseImport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't a Moisha backup. It isn't even readable." };
  }

  const wrapper = parsed as { format?: unknown; exportedAt?: unknown; data?: unknown } | null;
  if (wrapper?.format !== FORMAT || typeof wrapper.exportedAt !== 'string') {
    return { ok: false, error: "That file isn't a Moisha backup." };
  }

  const result = validateMemory(wrapper.data);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === 'newer-version'
          ? 'That backup came from a newer version of Moisha. Update this one first.'
          : 'That backup is damaged, so I left your information alone.',
    };
  }

  return {
    ok: true,
    // A half-finished question from the other device should not resume here.
    memory: { ...result.memory, activeFlow: null },
    summary: {
      exportedAt: wrapper.exportedAt,
      properties: result.memory.properties.length,
      comps: result.memory.comps.length,
      messages: result.memory.messages.length,
    },
  };
}
