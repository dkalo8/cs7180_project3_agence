'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

async function createUser(email, passwordHash) {
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, passwordHash]
  );
  return rows[0];
}

async function getUserByEmail(email) {
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );
  return rows[0] ?? null;
}

async function getUserById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, created_at, google_id IS NOT NULL AS has_google_auth FROM users WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

async function createAccount(userId, accessToken, itemId, institutionName) {
  const { rows } = await pool.query(
    `INSERT INTO accounts (user_id, plaid_access_token, plaid_item_id, institution_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, plaid_item_id, institution_name, created_at`,
    [userId, accessToken, itemId, institutionName]
  );
  return rows[0];
}

async function getAccountsByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT a.id, a.user_id, a.plaid_item_id, a.institution_name, a.created_at,
            b.current AS balance, b.available
     FROM accounts a
     LEFT JOIN balances b ON b.account_id = a.id
     WHERE a.user_id = $1`,
    [userId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

async function upsertTransactions(transactions) {
  for (const tx of transactions) {
    await pool.query(
      `INSERT INTO transactions (user_id, account_id, plaid_transaction_id, amount, merchant_name, category, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (plaid_transaction_id) DO NOTHING`,
      [tx.userId, tx.accountId, tx.plaidTransactionId, tx.amount, tx.merchantName, tx.category, tx.date]
    );
  }
}

async function getTransactionsByUserId(userIds) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const { rows } = await pool.query(
    'SELECT id, account_id, amount, merchant_name, category, date FROM transactions WHERE user_id = ANY($1::uuid[]) ORDER BY date DESC',
    [ids]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------

async function upsertBalance(accountId, current, available) {
  const { rows } = await pool.query(
    `INSERT INTO balances (account_id, current, available)
     VALUES ($1, $2, $3)
     ON CONFLICT (account_id) DO UPDATE SET current = $2, available = $3, updated_at = NOW()
     RETURNING *`,
    [accountId, current, available]
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

async function createGoal(userId, name, target, monthlyContribution) {
  const { rows } = await pool.query(
    `INSERT INTO goals (user_id, name, target, monthly_contribution)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, name, target, monthlyContribution]
  );
  return rows[0];
}

async function getGoalsByUserId(userIds) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const { rows } = await pool.query(
    'SELECT * FROM goals WHERE user_id = ANY($1::uuid[]) ORDER BY created_at ASC',
    [ids]
  );
  return rows;
}

async function updateGoalCurrent(goalId, current) {
  const { rows } = await pool.query(
    'UPDATE goals SET current = $2 WHERE id = $1 RETURNING *',
    [goalId, current]
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------

async function createTrade(userId, ticker, action, quantity, price, alpacaOrderId) {
  const { rows } = await pool.query(
    `INSERT INTO trades (user_id, ticker, action, quantity, price, alpaca_order_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, ticker, action, quantity, price, alpacaOrderId]
  );
  return rows[0];
}

async function getTradesByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM trades WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------

async function addToWatchlist(userId, ticker) {
  const { rows } = await pool.query(
    `INSERT INTO watchlist (user_id, ticker) VALUES ($1, $2)
     ON CONFLICT (user_id, ticker) DO NOTHING
     RETURNING id, ticker, added_at`,
    [userId, ticker]
  );
  return rows[0] ?? null;
}

async function getWatchlistByUserId(userIds) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const { rows } = await pool.query(
    'SELECT id, user_id, ticker, added_at FROM watchlist WHERE user_id = ANY($1::uuid[]) ORDER BY added_at DESC',
    [ids]
  );
  // Deduplicate by ticker when multiple household members track the same ticker
  const seen = new Set();
  return rows.filter(r => { if (seen.has(r.ticker)) return false; seen.add(r.ticker); return true; });
}

async function removeFromWatchlist(userId, ticker) {
  await pool.query(
    'DELETE FROM watchlist WHERE user_id = $1 AND ticker = $2',
    [userId, ticker]
  );
}

// ---------------------------------------------------------------------------
// Households
// ---------------------------------------------------------------------------

async function getHouseholdMemberIds(userId) {
  const { rows } = await pool.query(
    `SELECT hm2.user_id
     FROM household_members hm1
     JOIN household_members hm2 ON hm2.household_id = hm1.household_id
     WHERE hm1.user_id = $1`,
    [userId]
  );
  return rows.length > 0 ? rows.map(r => r.user_id) : [userId];
}

async function removeHouseholdMember(householdId, targetUserId) {
  await pool.query(
    'DELETE FROM household_members WHERE household_id = $1 AND user_id = $2',
    [householdId, targetUserId]
  );
}

async function createHousehold(name) {
  const { rows } = await pool.query(
    'INSERT INTO households (name) VALUES ($1) RETURNING id, name, created_at',
    [name]
  );
  return rows[0];
}

async function addHouseholdMember(householdId, userId, role) {
  const { rows } = await pool.query(
    `INSERT INTO household_members (household_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (household_id, user_id) DO NOTHING
     RETURNING *`,
    [householdId, userId, role]
  );
  return rows[0];
}

async function getHouseholdByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT h.id, h.name, h.created_at,
            json_agg(json_build_object(
              'user_id', u.id,
              'email', u.email,
              'role', hm.role
            ) ORDER BY hm.created_at) AS members
     FROM household_members hm
     JOIN households h ON h.id = hm.household_id
     JOIN users u ON u.id = hm.user_id
     WHERE hm.household_id = (
       SELECT household_id FROM household_members WHERE user_id = $1 LIMIT 1
     )
     GROUP BY h.id, h.name, h.created_at`,
    [userId]
  );
  return rows[0] || null;
}

async function getUserByGoogleId(googleId) {
  const { rows } = await pool.query(
    'SELECT id, email, created_at FROM users WHERE google_id = $1',
    [googleId]
  );
  return rows[0] ?? null;
}

async function createUserWithGoogle(email, googleId) {
  const { rows } = await pool.query(
    'INSERT INTO users (email, google_id) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, googleId]
  );
  return rows[0];
}

async function linkGoogleId(userId, googleId) {
  await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, userId]);
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  getUserByGoogleId,
  createUserWithGoogle,
  linkGoogleId,
  createAccount,
  getAccountsByUserId,
  upsertTransactions,
  getTransactionsByUserId,
  upsertBalance,
  createGoal,
  getGoalsByUserId,
  updateGoalCurrent,
  createTrade,
  getTradesByUserId,
  addToWatchlist,
  getWatchlistByUserId,
  removeFromWatchlist,
  createHousehold,
  addHouseholdMember,
  getHouseholdByUserId,
  getHouseholdMemberIds,
  removeHouseholdMember,
};
