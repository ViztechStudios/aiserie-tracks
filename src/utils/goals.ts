import { Goal } from '../types';

/** Progress 0..1, clamped — goals never render past 100%. */
export function goalProgress(goal: Goal): number {
  if (!Number.isFinite(goal.target) || goal.target <= 0) return 0;
  return Math.min(Math.max(goal.saved / goal.target, 0), 1);
}

/** Amount still needed, never below zero. */
export function goalRemaining(goal: Goal): number {
  return Math.max(goal.target - goal.saved, 0);
}

/**
 * Apply a contribution (positive) or withdrawal (negative) and return the
 * next saved amount. Withdrawals cannot go below zero; contributions beyond
 * the target cap at the target so the piggy "completes" exactly once.
 */
export function applyGoalChange(goal: Goal, delta: number): number {
  if (!Number.isFinite(delta) || delta === 0) return goal.saved;
  if (delta > 0) return Math.min(goal.saved + delta, goal.target);
  return Math.max(goal.saved + delta, 0);
}

/** Whether a contribution completes the goal (was unfinished, now at/over target). */
export function completesGoal(goal: Goal, delta: number): boolean {
  if (delta <= 0) return false;
  return goal.saved < goal.target && goal.saved + delta >= goal.target;
}
