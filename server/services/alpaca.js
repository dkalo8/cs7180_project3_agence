'use strict';

const Alpaca = require('@alpacahq/alpaca-trade-api');

// ALPACA_PAPER is always true — paper trading only, never real money
const alpaca = new Alpaca({
  keyId: process.env.ALPACA_KEY_ID,
  secretKey: process.env.ALPACA_SECRET_KEY,
  paper: true,
});

async function getPositions() {
  return alpaca.getPositions();
}

async function getAccount() {
  return alpaca.getAccount();
}

async function getSnapshots(symbols) {
  return alpaca.getSnapshots(symbols);
}

module.exports = { getPositions, getAccount, getSnapshots };
