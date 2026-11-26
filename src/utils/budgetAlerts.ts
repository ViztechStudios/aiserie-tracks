import { Budget } from '../types';

/**
 * Pure budget-alert logic.
 *
 * Levels: 0.5 / 0.75 / 0.9 / 1 (fraction of the cap). The user can trim the
 * set per budget; `alerts: undefined` keeps every level. Notification state
 * is stored per budget per month as the highest level already announced, so
 * a notice fires once when spending first reaches each threshold — and it
 * resets naturally when a new month starts.
 */

export const DEFAULT_ALERT_LEVELS = [0.5, 0.75, 0.9, 1];

export interface BudgetAlertKey {
  budgetId: string;
  ym: string; // YYYY-MM
}

/** "budgetId:ym" → highest level (0..1) already announced. */
export type AlertState = Record<string, number>;

export function alertKey(budgetId: string, ym: string): string {
  return `${budgetId}:${ym}`;
}

export function activeLevels(budget: Budget): number[] {
  if (!budget.alerts || budget.alerts.length === 0) return DEFAULT_ALERT_LEVELS;
  return [...budget.alerts].filter((v) => Number.isFinite(v) && v > 0 && v <= 1).sort((a, b) => a - b);
}

export interface BudgetAlertInfo {
  level: number; // 0..1
  spent: number;
  cap: number;
  ym: string;
}

/**
 * Which threshold, if any, was newly reached by the latest spending amount.
 * Returns null when nothing new should be announced.
 */
export function crossingLevel(
  budget: Budget,
  spent: number,
  ym: string,
  state: AlertState
): BudgetAlertInfo | null {
  if (!(budget.cap > 0) || !(spent > 0)) return null;
  const level = spent / budget.cap;
  if (level <= 0) return null;
  const announced = state[alertKey(budget.id, ym)] ?? 0;
  let best: number | null = null;
  for (const lv of activeLevels(budget)) {
    // a level qualifies when spending reached it and it beats both the
    // announced floor and any better candidate this pass
    if (level >= lv && lv > announced && (best === null || lv > best)) best = lv;
  }
  if (best === null) return null;
  return { level: best, spent, cap: budget.cap, ym };
}

/** Level message body used by the toast. */
export function alertMessage(info: BudgetAlertInfo, label: string, fmt: (n: number) => string): string {
  const pct = Math.round(info.level * 100);
  const left = info.cap - info.spent;
  if (info.level >= 1) {
    return `${label} budget is used up — ${fmt(info.spent)} of the ${fmt(info.cap)} cap is gone this month.`;
  }
  return `${label} budget hit ${pct}% — ${fmt(left)} left of ${fmt(info.cap)} this month.`;
}
