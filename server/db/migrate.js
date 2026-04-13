'use strict';

const { Pool } = require('pg');

/**
 * Idempotent migrations — safe to run on every startup.
 * Add new CREATE TABLE IF NOT EXISTS statements here as the schema evolves.
 */
async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name                 VARCHAR(255) NOT NULL,
        target               NUMERIC(10,2) NOT NULL,
        current              NUMERIC(10,2) DEFAULT 0,
        monthly_contribution NUMERIC(10,2) DEFAULT 0,
        created_at           TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ticker   VARCHAR(20) NOT NULL,
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, ticker)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS households (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS household_members (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role         VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'member')),
        created_at   TIMESTAMP DEFAULT NOW(),
        UNIQUE(household_id, user_id)
      )
    `);
    // Google auth columns (idempotent)
    await pool.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE`);
    // Goal type column (idempotent)
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS goal_type VARCHAR(20) DEFAULT 'savings'`);
    // Goal position column (idempotent)
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0`);
    console.log('[migrate] schema up to date'); // eslint-disable-line no-console
  } finally {
    await pool.end();
  }
}

module.exports = { runMigrations };
