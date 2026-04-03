---
name: add-agent
description: Scaffold a new Agence analysis agent — creates the pure function stub and TDD test file with proper mock structure
version: 1.0.0
usage: /add-agent <agentName> <dataRouting>
example: /add-agent anomalyAgent userData
---

# Add Agent Skill (v1)

Scaffold a new Agence agent following the project's architecture rules:
- Agent must be a pure function (no side effects, no DB/API calls)
- Data routing: `userData` (Plaid), `marketData` (Alpaca+Finnhub), or `both`
- Test file uses `jest.fn()` factory mocks (NOT jest.mock() auto-mock on empty files)
- TDD structure: 5 cycles covering shape, logic, edge cases, failure, and integration

## Arguments

Parse from the slash command invocation:
- `agentName` — camelCase name (e.g. `anomalyAgent`, `goalsAgent`)
- `dataRouting` — one of: `userData`, `marketData`, `both`

If arguments are missing, use AskUserQuestion to prompt for them.

## Step 1: Confirm Arguments

Echo back what you're about to create:
```
Creating: server/agents/<agentName>.js
Testing:  server/agents/<agentName>.test.js
Routing:  <dataRouting>
```

Ask the user: "Does this look right? Proceed?"

## Step 2: Create the Agent Stub

Create `server/agents/<agentName>.js` with this structure:

```js
'use strict';

/**
 * <agentName> — <one-line description based on agent name>
 *
 * Pure function: no side effects, no DB calls, no API calls.
 *
 * @param {Object} <param>  - <describe based on dataRouting>
 * @returns {Array} insights - [{ type, message, severity, ...agentSpecificFields }]
 */
function <agentName>(<params>) {
  // TODO: implement
  return [];
}

module.exports = <agentName>;
```

Replace `<params>` based on `dataRouting`:
- `userData` → `(userData)`
- `marketData` → `(marketData)`
- `both` → `(userData, marketData)`

## Step 3: Create the Test File

Create `server/agents/<agentName>.test.js` with this structure:

```js
'use strict';

const <agentName> = require('./<agentName>');

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
<insert relevant mock data based on dataRouting>

// ---------------------------------------------------------------------------
// Cycle 1 — returns an array
// ---------------------------------------------------------------------------
describe('<agentName> — cycle 1: return shape', () => {
  test('returns an array', () => {
    const result = <agentName>(<args>);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cycle 2 — returns empty array for empty input
// ---------------------------------------------------------------------------
describe('<agentName> — cycle 2: empty input', () => {
  test('returns empty array when input has no relevant data', () => {
    const result = <agentName>(<emptyArgs>);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cycle 3 — insight shape
// ---------------------------------------------------------------------------
describe('<agentName> — cycle 3: insight shape', () => {
  test('each insight has type, message, severity', () => {
    // TODO: fill in when implementing
  });
});

// ---------------------------------------------------------------------------
// Cycle 4 — core logic (placeholder — fill in during TDD)
// ---------------------------------------------------------------------------
describe('<agentName> — cycle 4: core logic', () => {
  test.todo('implement core logic tests here');
});

// ---------------------------------------------------------------------------
// Cycle 5 — edge cases
// ---------------------------------------------------------------------------
describe('<agentName> — cycle 5: edge cases', () => {
  test.todo('implement edge case tests here');
});
```

Use these mock data fixtures based on `dataRouting`:

**userData:**
```js
const mockUserData = {
  transactions: [{ id: 'tx1', amount: 50, merchant: 'Whole Foods', category: 'Groceries', date: '2026-03-01' }],
  balances: [{ accountId: 'acc1', current: 1000, available: 950 }],
  goals: [{ id: 'g1', name: 'Emergency Fund', target: 5000, current: 2000, monthlyContribution: 200 }],
};
const emptyUserData = { transactions: [], balances: [], goals: [] };
```

**marketData:**
```js
const mockMarketData = {
  tickers: ['AAPL', 'TSLA'],
  positions: { AAPL: { qty: 10, avgCost: 170, currentPrice: 180 }, TSLA: { qty: 5, avgCost: 260, currentPrice: 250 } },
  quotes: { AAPL: { price: 180, change: 1.5 }, TSLA: { price: 250, change: -2.0 } },
  news: { AAPL: [{ headline: 'Apple hits record', sentiment: 0.8 }] },
};
const emptyMarketData = { tickers: [], positions: {}, quotes: {}, news: {} };
```

**both:** include both fixtures above.

## Step 4: Verify Red

Run the tests to confirm they fail (implementation is just `return []`):

```bash
cd server && npm test -- --testPathPatterns="agents/<agentName>"
```

Report the number of failing tests.

## Step 5: Report

Output a summary:
```
✅ Scaffold complete (v1)

Files created:
- server/agents/<agentName>.js       (stub — returns [])
- server/agents/<agentName>.test.js  (5 TDD cycle structure)

Tests: X failing (expected — implementation is TODO)

Next steps:
1. Fill in cycle 3-5 tests with real assertions for this agent's logic
2. Implement the agent until all tests pass
3. Run: cd server && npm run lint && npm test
4. Commit with: git add server/agents/<agentName>* && git commit -m "feat: implement <agentName>"
```
