import React, { useEffect, useMemo, useRef } from 'react';
import { useFinance } from '../store/FinanceContext';
import { useBudgets } from '../store/BudgetsContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { getCategory } from '../data/categories';
import { categoryTotals, currentMonthKey, monthKey } from '../utils/stats';
import { alertMessage, crossingLevel, AlertState } from '../utils/budgetAlerts';

/** '2026-11' minus n months (used to prune retired alert entries). */
function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12 + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, '0')}`;
}
import { formatMoney } from '../utils/money';

/**
 * Invisible host that watches budget spending and fires ONE gentle toast the
 * first time a budget reaches each configured threshold (50/75/90/100%).
 * The announced level is remembered per budget per month, so a new month
 * starts quiet again — and restored backups never re-alarm old months.
 */
export function BudgetAlertsHost() {
  const finance = useFinance();
  const budgets = useBudgets();
  const ui = useUI();
  const { t } = useTheme();
  const evaluating = useRef(false);

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const ct of categoryTotals(finance.transactions, currentMonthKey(), 'expense')) {
      map.set(ct.category.id, ct.amount);
    }
    return map;
  }, [finance.transactions]);

  useEffect(() => {
    if (!budgets.ready || !finance.ready || evaluating.current) return;
    if (budgets.budgets.length === 0) return;
    evaluating.current = true;
    try {
      const ym = currentMonthKey();
      // v4.2.0: prune alert entries older than two years so the state (and the
      // storage meter) no longer grows one entry per budget per month forever
      const keepSince = addMonths(ym, -24);
      const next: AlertState = {};
      for (const [k, v] of Object.entries(budgets.alertState)) {
        // keys are `${budgetId}:${ym}`; the ym is everything after the LAST ':'
        const idx = k.lastIndexOf(':');
        const entryYm = idx >= 0 ? k.slice(idx + 1) : '';
        if (entryYm >= keepSince) next[k] = v;
      }
      let best: { message: string; level: number } | null = null;

      for (const b of budgets.budgets) {
        const spent = spentByCategory.get(b.categoryId) ?? 0;
        const hit = crossingLevel(b, spent, ym, next);
        if (!hit) continue;
        next[`${b.id}:${ym}`] = Math.max(next[`${b.id}:${ym}`] ?? 0, hit.level);
        const label = getCategory(b.categoryId)?.label ?? 'Budget';
        const message = alertMessage(hit, label, (n) => formatMoney(n, finance.settings.currency));
        // remember the HIGHEST crossing of the pass — the old loop toasted
        // whichever budget happened to be iterated last
        if (!best || hit.level > best.level) best = { message, level: hit.level };
      }

      if (best) {
        budgets.setAlertState(next);
        // announce after paint; one toast for the highest crossing this pass
        setTimeout(() => ui.toast(best.message), 120);
      }
    } finally {
      evaluating.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spentByCategory, budgets.budgets, budgets.ready, finance.ready]);

  void t;
  return null;
}
