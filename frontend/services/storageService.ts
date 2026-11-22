import { z } from 'zod';
import {
  PropertyHouse,
  PropertyHouseSchema,
  PricingRule,
  PricingRuleSchema,
  NotificationLog,
  NotificationLogSchema,
  AiSettings,
  AiSettingsSchema,
} from '../types';
import { INITIAL_RULES, DEFAULT_AI_SETTINGS } from '../constants';

const STORAGE_KEY = 'moisha_pocket_state_v4';

const PersistedStateSchema = z.object({
  houses: z.array(PropertyHouseSchema),
  selectedHouseId: z.string(),
  rules: z.array(PricingRuleSchema).min(1),
  logs: z.array(NotificationLogSchema),
  aiSettings: AiSettingsSchema,
});

export type PersistedState = z.infer<typeof PersistedStateSchema>;

export function buildDefaultState(): PersistedState {
  return {
    houses: [],
    selectedHouseId: '',
    rules: INITIAL_RULES.map((r) => ({ ...r })),
    logs: [],
    aiSettings: { ...DEFAULT_AI_SETTINGS },
  };
}

export function loadPersistedState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultState();
    const parsed = PersistedStateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return buildDefaultState();
    }
    if (parsed.data.houses.length === 0) {
      return { ...parsed.data, selectedHouseId: '' };
    }
    const exists = parsed.data.houses.some((h) => h.id === parsed.data.selectedHouseId);
    return {
      ...parsed.data,
      selectedHouseId: exists ? parsed.data.selectedHouseId : parsed.data.houses[0].id,
    };
  } catch {
    return buildDefaultState();
  }
}

export function savePersistedState(state: {
  houses: PropertyHouse[];
  selectedHouseId: string;
  rules: PricingRule[];
  logs: NotificationLog[];
  aiSettings: AiSettings;
}): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or private mode restrictions.
  }
}

export function clearPersistedState(): PersistedState {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
  return buildDefaultState();
}
