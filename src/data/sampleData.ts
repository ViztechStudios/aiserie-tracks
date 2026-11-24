import { Transaction } from '../types';
import { todayISO, currentMonthKey, shiftMonth, daysInMonth } from '../utils/stats';

/** Deterministic-ish id generator (no native deps). */
export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

interface Seed {
  categoryId: string;
  note: string;
  min: number;
  max: number;
  timesPerMonth: [number, number];
  income?: boolean;
  dayHint?: number[]; // preferred days
}

const EXPENSE_SEEDS: Seed[] = [
  { categoryId: 'groceries', note: 'Puregold', min: 850, max: 2400, timesPerMonth: [3, 5] },
  { categoryId: 'groceries', note: 'SM Supermarket', min: 1200, max: 3800, timesPerMonth: [1, 2] },
  { categoryId: 'groceries', note: '7-Eleven run', min: 60, max: 320, timesPerMonth: [3, 6] },
  { categoryId: 'food', note: 'Jollibee', min: 120, max: 480, timesPerMonth: [2, 4] },
  { categoryId: 'food', note: 'Mang Inasal', min: 150, max: 420, timesPerMonth: [1, 3] },
  { categoryId: 'food', note: 'Milk tea / coffee', min: 90, max: 260, timesPerMonth: [2, 5] },
  { categoryId: 'transport', note: 'Jeepney fare', min: 13, max: 60, timesPerMonth: [10, 18] },
  { categoryId: 'transport', note: 'MRT-3', min: 13, max: 28, timesPerMonth: [6, 12] },
  { categoryId: 'transport', note: 'Grab', min: 140, max: 480, timesPerMonth: [1, 4] },
  { categoryId: 'bills', note: 'Meralco', min: 1800, max: 3400, timesPerMonth: [1, 1], dayHint: [12, 18] },
  { categoryId: 'bills', note: 'Maynilad', min: 210, max: 520, timesPerMonth: [1, 1], dayHint: [10, 16] },
  { categoryId: 'bills', note: 'Converge fiber', min: 1699, max: 1699, timesPerMonth: [1, 1], dayHint: [8, 14] },
  { categoryId: 'bills', note: 'Globe postpaid', min: 999, max: 1299, timesPerMonth: [1, 1], dayHint: [20, 26] },
  { categoryId: 'rent', note: 'Monthly rent', min: 9000, max: 14000, timesPerMonth: [1, 1], dayHint: [1, 5] },
  { categoryId: 'shopping', note: 'Shopee', min: 200, max: 1800, timesPerMonth: [1, 3] },
  { categoryId: 'health', note: 'Mercury Drug', min: 120, max: 900, timesPerMonth: [1, 2] },
  { categoryId: 'fun', note: 'Movie night', min: 250, max: 700, timesPerMonth: [1, 2] },
  { categoryId: 'education', note: 'Books / course', min: 300, max: 1500, timesPerMonth: [0, 1] },
];

const INCOME_SEEDS: Seed[] = [
  { categoryId: 'salary', note: 'Salary', min: 26000, max: 32000, timesPerMonth: [1, 1], income: true, dayHint: [15, 15] },
  { categoryId: 'salary', note: 'Salary', min: 26000, max: 32000, timesPerMonth: [1, 1], income: true, dayHint: [30, 30] },
  { categoryId: 'bonus', note: 'Side gig payout', min: 1500, max: 6000, timesPerMonth: [0, 1], income: true },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function amount(seed: Seed): number {
  const a = seed.min + Math.random() * (seed.max - seed.min);
  return a >= 1000 ? Math.round(a / 50) * 50 : Math.round(a);
}

/**
 * Builds a realistic set of Philippine-flavored transactions for the last
 * `months` months (including the current, partial month).
 */
export function buildSampleTransactions(months = 4): Transaction[] {
  const out: Transaction[] = [];
  const today = todayISO();
  const thisMonth = currentMonthKey();

  for (let i = months - 1; i >= 0; i--) {
    const ym = shiftMonth(thisMonth, -i);
    const dim = daysInMonth(ym);

    for (const seed of [...INCOME_SEEDS, ...EXPENSE_SEEDS]) {
      const times = randInt(seed.timesPerMonth[0], seed.timesPerMonth[1]);
      for (let k = 0; k < times; k++) {
        let day: number;
        if (seed.dayHint) {
          day = seed.dayHint[randInt(0, seed.dayHint.length - 1)];
        } else {
          day = randInt(1, dim);
        }
        const date = `${ym}-${String(Math.min(day, dim)).padStart(2, '0')}`;
        if (date > today) continue; // never seed future transactions
        out.push({
          id: makeId(),
          type: seed.income ? 'income' : 'expense',
          amount: amount(seed),
          categoryId: seed.categoryId,
          date,
          note: seed.note,
          source: 'sample',
          createdAt: Date.now() - Math.floor(Math.random() * 5_000_000),
        });
      }
    }
  }

  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}
