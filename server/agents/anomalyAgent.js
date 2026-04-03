'use strict';

/**
 * anomalyAgent — detect unusual transactions in user's bank data
 *
 * Pure function: no side effects, no DB calls, no API calls.
 *
 * @param {Object} userData  - { transactions, balances } from Plaid
 * @returns {Array} insights - [{ type, message, severity, amount, merchant }]
 */
function anomalyAgent(_userData) {
  // TODO: implement
  return [];
}

module.exports = anomalyAgent;
