import { PropertyHouse, PricingRule, AiSettings } from './types';

export function addDaysIso(baseDate: Date, offsetDays: number): string {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + offsetDays);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const INITIAL_HOUSES: PropertyHouse[] = [];

export const INITIAL_RULES: PricingRule[] = [
  {
    id: 'rule-1',
    kind: 'orphan_gap',
    title: 'Orphan Gap Emergency Watch',
    enabled: true,
    description:
      'Trigger immediate action when unbooked consecutive nights are at or within this empty window threshold.',
    parameterName: 'Gap Trigger',
    parameterValue: 5,
    unit: 'nights',
  },
  {
    id: 'rule-2',
    kind: 'neighbor_undercut',
    title: 'Neighbor Undercut Threshold',
    enabled: true,
    description:
      'Alert when a vacant comparable neighbor is priced lower than your nightly rate by more than this percentage.',
    parameterName: 'Undercut Trigger',
    parameterValue: 8,
    unit: '%',
  },
  {
    id: 'rule-3',
    kind: 'promo_badge',
    title: 'Airbnb Strikethrough Promo Badge',
    enabled: true,
    description:
      'Recommend official Last-Minute and Length-of-Stay badges using this base discount percentage.',
    parameterName: 'Promo Discount',
    parameterValue: 15,
    unit: '%',
  },
  {
    id: 'rule-4',
    kind: 'safety_floor',
    title: 'Host Safety Floor Guardrail',
    enabled: true,
    description:
      'Never recommend a base rate or promotion below the property floor price plus this extra margin buffer.',
    parameterName: 'Floor Cushion',
    parameterValue: 0,
    unit: '$/nt',
  },
];

export const DEFAULT_AI_SETTINGS: AiSettings = {
  mode: 'auto',
  customApiKey: '',
  soundEnabled: true,
};
