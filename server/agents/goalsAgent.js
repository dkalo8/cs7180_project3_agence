'use strict';

/**
 * goalsAgent — track savings goal pace and surface behind/on-track/ahead insights
 *
 * Pure function: no side effects, no DB calls, no API calls.
 *
 * @param {Object} userData  - { transactions, balances, goals } from Plaid
 * @returns {Array} insights - [{ type, goalName, message, pace, projectedDate }]
 */
function goalsAgent(_userData) {
  // TODO: implement
  return [];
}

module.exports = goalsAgent;
