import { CategoryTotal, Insight, MonthBar, MonthTotals, Transaction } from '../types';
import { getCategory } from '../data/categories';
import { formatMoney } from './money';

/* ---------- date helpers ---------- */

export function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7); // YYYY-MM
}

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthLabel(ym: string, long = false): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-PH', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' });
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function dayLabel(dateISO: string, today: string = todayISO()): string {
  if (dateISO === today) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateISO === todayISO(yesterday)) return 'Yesterday';
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ---------- aggregations ---------- */

export function totalsForMonth(txs: Transaction[], ym: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (monthKey(t.date) !== ym) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

export function categoryTotals(txs: Transaction[], ym: string, type: 'expense' | 'income'): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== type || monthKey(t.date) !== ym) continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([id, amount]) => ({ category: getCategory(id)!, amount }))
    .filter((ct) => Boolean(ct.category))
    .sort((a, b) => b.amount - a.amount);
}

export function lastMonths(txs: Transaction[], count: number, fromYm: string): MonthBar[] {
  const out: MonthBar[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const ym = shiftMonth(fromYm, -i);
    const totals = totalsForMonth(txs, ym);
    out.push({ ym, label: monthLabel(ym), income: totals.income, expense: totals.expense });
  }
  return out;
}

export function groupByDay(txs: Transaction[]): { date: string; items: Transaction[]; expense: number; income: number }[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const list = map.get(t.date) ?? [];
    list.push(t);
    map.set(t.date, list);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items,
      expense: items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      income: items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    }));
}

/* ---------- advisor engine ---------- */

export interface AdvisorReport {
  ym: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number; // 0..1 (may be negative)
  daysElapsed: number;
  daysRemaining: number;
  dailyAvgExpense: number;
  projectedExpense: number;
  safeToSpendPerDay: number | null;
  topCategory: CategoryTotal | null;
  categoryTotals: CategoryTotal[];
  months: MonthBar[];
  insights: Insight[];
}

export function buildAdvisorReport(
  txs: Transaction[],
  ym: string,
  currency: string,
  now: Date = new Date()
): AdvisorReport {
  const totals = totalsForMonth(txs, ym);
  const cats = categoryTotals(txs, ym, 'expense');
  const dim = daysInMonth(ym);
  const isCurrent = ym === currentMonthKey(now);
  const daysElapsed = isCurrent ? Math.min(now.getDate(), dim) : dim;
  const daysRemaining = isCurrent ? Math.max(dim - now.getDate(), 0) : 0;
  const dailyAvgExpense = daysElapsed > 0 ? totals.expense / daysElapsed : 0;
  const projectedExpense = isCurrent ? dailyAvgExpense * dim : totals.expense;
  const safeToSpendPerDay =
    isCurrent && daysRemaining > 0 ? Math.max((totals.income - totals.expense) / daysRemaining, 0) : null;

  const savingsRate = totals.income > 0 ? (totals.income - totals.expense) / totals.income : 0;
  const topCategory = cats.length > 0 ? cats[0] : null;
  const months = lastMonths(txs, 6, ym);

  const insights: Insight[] = [];
  const fmt = (n: number) => formatMoney(n, currency);

  if (totals.income === 0 && totals.expense === 0) {
    insights.push({
      id: 'empty',
      emoji: '🌱',
      tone: 'info',
      title: 'Start tracking to unlock advice',
      body: 'Add your first transaction with the + button, or scan a grocery receipt. Aiserie will study your habits and coach you here.',
    });
  } else {
    if (totals.income > 0) {
      const pct = Math.round(savingsRate * 100);
      if (pct >= 20) {
        insights.push({
          id: 'savings-good',
          emoji: '🏅',
          tone: 'good',
          title: `Strong savings rate: ${pct}%`,
          body: `You kept ${fmt(totals.income - totals.expense)} of the ${fmt(totals.income)} you earned this month. Saving 20%+ consistently is a great habit — consider parking part of it in an emergency fund.`,
        });
      } else if (pct >= 0) {
        insights.push({
          id: 'savings-ok',
          emoji: '🎯',
          tone: 'warn',
          title: `Savings rate is ${pct}%`,
          body: `You kept ${fmt(totals.income - totals.expense)} from ${fmt(totals.income)}. Aim for at least 20%. Trimming your largest category a little each week is the easiest win.`,
        });
      } else {
        insights.push({
          id: 'savings-neg',
          emoji: '⚠️',
          tone: 'risk',
          title: 'Spending exceeded income',
          body: `You spent ${fmt(totals.expense)} against ${fmt(totals.income)} earned — a ${fmt(totals.expense - totals.income)} gap. Review the categories below and cut the two smallest leaks first.`,
        });
      }
    }

    if (isCurrent && safeToSpendPerDay !== null && totals.income > 0) {
      insights.push({
        id: 'safe-spend',
        emoji: '🧮',
        tone: 'info',
        title: `Safe to spend: about ${fmt(safeToSpendPerDay)}/day`,
        body: `With ${daysRemaining} day(s) left in ${monthLabel(ym, true)}, spreading the remaining ${fmt(totals.income - totals.expense)} evenly keeps you on budget.`,
      });
    }

    if (isCurrent && totals.income > 0 && projectedExpense > totals.income) {
      insights.push({
        id: 'projection',
        emoji: '📉',
        tone: 'risk',
        title: `On pace to overshoot by ${fmt(projectedExpense - totals.income)}`,
        body: `At today's pace you will finish the month around ${fmt(projectedExpense)} versus ${fmt(totals.income)} income. Freezing one flexible category (Food & Dining or Shopping) usually closes this gap.`,
      });
    }

    if (topCategory) {
      const share = totals.expense > 0 ? topCategory.amount / totals.expense : 0;
      const pct = Math.round(share * 100);
      if (pct >= 40) {
        insights.push({
          id: 'top-cat',
          emoji: topCategory.category.emoji,
          tone: 'warn',
          title: `${topCategory.category.label} is ${pct}% of spending`,
          body: `${fmt(topCategory.amount)} went to ${topCategory.category.label} this month. Setting a weekly cap for it — or swapping two of those purchases for cheaper options — would free up the most cash.`,
        });
      } else if (pct > 0) {
        insights.push({
          id: 'top-cat-ok',
          emoji: topCategory.category.emoji,
          tone: 'info',
          title: `Biggest bucket: ${topCategory.category.label} (${pct}%)`,
          body: `Nothing alarming — your spending is spread across ${cats.length} categories. Keep an eye on ${topCategory.category.label} at ${fmt(topCategory.amount)}.`,
        });
      }
    }

    // week-over-week momentum (current month only)
    if (isCurrent) {
      const weekOf = (t: Transaction) => Math.ceil(new Date(t.date).getDate() / 7);
      const thisWeek = txs
        .filter((t) => t.type === 'expense' && monthKey(t.date) === ym && weekOf(t) === Math.ceil(now.getDate() / 7))
        .reduce((s, t) => s + t.amount, 0);
      const lastWeek = txs
        .filter((t) => t.type === 'expense' && monthKey(t.date) === ym && weekOf(t) === Math.ceil(now.getDate() / 7) - 1)
        .reduce((s, t) => s + t.amount, 0);
      if (lastWeek > 0 && thisWeek > lastWeek * 1.25) {
        insights.push({
          id: 'wow-up',
          emoji: '⏫',
          tone: 'warn',
          title: 'Spending is speeding up',
          body: `This week (${fmt(thisWeek)}) is over 25% higher than last week (${fmt(lastWeek)}). Small daily purchases add up — try a 24-hour rule for non-essentials.`,
        });
      } else if (lastWeek > 0 && thisWeek < lastWeek * 0.75) {
        insights.push({
          id: 'wow-down',
          emoji: '⏬',
          tone: 'good',
          title: 'Nice slowdown this week',
          body: `You spent ${fmt(thisWeek)} versus ${fmt(lastWeek)} last week. Whatever you changed, keep doing it.`,
        });
      }
    }

    // recurring bill reminder: same category spent last month but nothing yet this month
    const prevYm = shiftMonth(ym, -1);
    const prevCats = categoryTotals(txs, prevYm, 'expense');
    const missed = prevCats.filter((pc) => {
      const recurring = ['bills', 'rent', 'education'].includes(pc.category.id);
      const nowSpend = cats.find((c) => c.category.id === pc.category.id)?.amount ?? 0;
      return recurring && nowSpend < pc.amount * 0.5 && now.getDate() > 18;
    });
    if (missed.length > 0 && isCurrent) {
      insights.push({
        id: 'recurring',
        emoji: '🔔',
        tone: 'info',
        title: 'Recurring bills may be due',
        body: `By this point last month you had already paid ${missed.map((m) => m.category.label).join(', ')}. If a bill is due, log it now so your advisor stays accurate.`,
      });
    }
  }

  return {
    ym,
    income: totals.income,
    expense: totals.expense,
    net: totals.net,
    savingsRate,
    daysElapsed,
    daysRemaining,
    dailyAvgExpense,
    projectedExpense,
    safeToSpendPerDay,
    topCategory,
    categoryTotals: cats,
    months,
    insights,
  };
}
