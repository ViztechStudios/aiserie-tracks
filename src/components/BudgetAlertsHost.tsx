import React, { useEffect, useMemo, useRef } from 'react';
import { useFinance } from '../store/FinanceContext';
import { useBudgets } from '../store/BudgetsContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { getCategory } from '../data/categories';
import { categoryTotals, currentMonthKey, monthKey } from '../utils/stats';
import { alertMessage, crossingLevel, AlertState } from '../utils/budgetAlerts';
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
      const next: AlertState = { ...budgets.alertState };
      let fired: string | null = null;
      let latest: { budgetId: string; ym: string; level: number } | null = null;

      for (const b of budgets.budgets) {
        const spent = spentByCategory.get(b.categoryId) ?? 0;
        const hit = crossingLevel(b, spent, ym, next);
        if (!hit) continue;
        next[`${b.id}:${ym}`] = Math.max(next[`${b.id}:${ym}`] ?? 0, hit.level);
        const label = getCategory(b.categoryId)?.label ?? 'Budget';
        fired = alertMessage(hit, label, (n) => formatMoney(n, finance.settings.currency));
        latest = { budgetId: b.id, ym, level: hit.level };
      }

      if (fired && latest) {
        budgets.setAlertState(next);
        // announce after paint; one toast for the highest crossing this pass
        setTimeout(() => ui.toast(fired as string), 120);
      }
    } finally {
      evaluating.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spentByCategory, budgets.budgets, budgets.ready, finance.ready]);

  void t;
  return null;
}
