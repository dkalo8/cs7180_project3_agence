'use strict';

const ON_TRACK_MONTHS_THRESHOLD = 3;

/**
 * goalsAgent — track savings goal pace and surface behind/on-track/ahead insights
 *
 * Pure function: no side effects, no DB calls, no API calls.
 *
 * @param {Object} userData  - { transactions, balances, goals } from Plaid
 * @returns {Array} insights - [{ type, goalName, message, pace, projectedDate, severity }]
 */
function goalsAgent(userData) {
  const { goals = [] } = userData;
  if (goals.length === 0) return [];

  return goals.map(goal => {
    const { name, target, current, monthly_contribution, monthlyContribution } = goal;
    const contrib = monthly_contribution ?? monthlyContribution;
    const remaining = target - current;

    // Already complete
    if (remaining <= 0) {
      return {
        type: 'goal_complete',
        goalName: name,
        message: `${name} goal is complete!`,
        pace: 0,
        projectedDate: new Date().toISOString().slice(0, 10),
        severity: 'info',
      };
    }

    // No contributions
    if (!contrib || Number(contrib) <= 0) {
      return {
        type: 'goal_no_contributions',
        goalName: name,
        message: `No monthly contribution set for "${name}" — goal will never complete at this rate`,
        pace: 0,
        projectedDate: null,
        severity: 'high',
      };
    }

    const monthsToComplete = Math.ceil(remaining / Number(contrib));
    const projected = new Date();
    projected.setMonth(projected.getMonth() + monthsToComplete);
    const projectedDate = projected.toISOString().slice(0, 10);

    if (monthsToComplete <= ON_TRACK_MONTHS_THRESHOLD) {
      return {
        type: 'goal_on_track',
        goalName: name,
        message: `"${name}" is on track — projected completion in ${monthsToComplete} month${monthsToComplete === 1 ? '' : 's'}`,
        pace: Number(contrib),
        projectedDate,
        severity: 'info',
      };
    }

    return {
      type: 'goal_behind',
      goalName: name,
      message: `"${name}" will take ${monthsToComplete} months at current pace ($${Number(contrib)}/mo)`,
      pace: Number(contrib),
      projectedDate,
      severity: monthsToComplete > 12 ? 'high' : 'medium',
    };
  });
}

module.exports = goalsAgent;
