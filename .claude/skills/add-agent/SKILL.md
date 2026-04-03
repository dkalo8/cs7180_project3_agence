---
name: add-agent
description: Scaffold a new Agence analysis agent — creates the pure function stub, TDD test file, wires orchestrator if needed, and updates progress.md
version: 2.0.0
usage: /add-agent <agentName> <dataRouting>
example: /add-agent anomalyAgent userData
---

# Add Agent Skill (v2)

Scaffold a new Agence agent following the project's architecture rules.

**What's new in v2 vs v1:**
- Checks `orchestrator/index.js` and `orchestrator/index.test.js` — patches them if the new agent isn't already wired
- Updates `project-memory/progress.md` to mark the agent as in-progress
- Seeds cycle 3-5 tests with domain-specific stubs based on agent type (not generic todos)

## Architecture Rules (never violate)
- Agent MUST be a pure function: no side effects, no DB calls, no API calls
- Data routing: `userData` (Plaid), `marketData` (Alpaca+Finnhub), or `both`
- Test file uses `jest.fn()` factory mocks — NOT jest.mock() auto-mock on empty files
- All SQL queries go in `server/db/queries.js` only — never in agents

## Arguments

Parse from the slash command invocation:
- `agentName` — camelCase name (e.g. `anomalyAgent`, `goalsAgent`)
- `dataRouting` — one of: `userData`, `marketData`, `both`

If arguments are missing, use AskUserQuestion to prompt for them.

## Step 1: Confirm Arguments

Echo back what you're about to do:
```
Creating:  server/agents/<agentName>.js
Testing:   server/agents/<agentName>.test.js
Routing:   <dataRouting>
Orchestrator: will check if wiring needed
Progress:  will mark as in-progress
```

Ask the user: "Does this look right? Proceed?"

## Step 2: Create the Agent Stub

Create `server/agents/<agentName>.js`:

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

Replace `<params>` based on `dataRouting`. Use `_` prefix on stub params to satisfy
ESLint `no-unused-vars` (the stub just returns `[]`):
- `userData` → `(_userData)`
- `marketData` → `(_marketData)`
- `both` → `(_userData, _marketData)`

When implementing the real function body (non-stub), remove the `_` prefixes.

## Step 3: Create the Test File

Create `server/agents/<agentName>.test.js` with domain-specific test stubs.

**Always include cycles 1 and 2 as real passing tests** (stub returns [] so these pass immediately).

**For cycles 3-5, seed domain-specific stubs based on agentName:**

### anomalyAgent (userData)
```js
// Cycle 3 — insight shape
test('each insight has type, message, severity, amount, merchant', () => { ... });

// Cycle 4 — core logic
test('flags a single large transaction above threshold (>$500)', () => { ... });
test('flags duplicate charges from same merchant on the same day', () => { ... });
test('flags a new merchant never seen in prior 30 days', () => { ... });

// Cycle 5 — edge cases
test('does not flag normal recurring transactions', () => { ... });
test('handles missing merchant or category fields gracefully', () => { ... });
```

### goalsAgent (userData)
```js
// Cycle 3 — insight shape
test('each insight has type, goalName, message, pace, projectedDate', () => { ... });

// Cycle 4 — core logic
test('flags a goal that is behind pace by more than 1 month', () => { ... });
test('marks a goal as on-track when pace meets target date', () => { ... });
test('flags a goal with zero contributions this month', () => { ... });

// Cycle 5 — edge cases
test('handles goal with no target date', () => { ... });
test('returns empty array when goals list is empty', () => { ... });
```

### portfolioAgent (marketData)
```js
// Cycle 3 — insight shape
test('each insight has type, message, severity, ticker', () => { ... });

// Cycle 4 — core logic
test('flags concentration risk when a position exceeds 20% of portfolio value', () => { ... });
test('flags unrealized loss greater than 10%', () => { ... });
test('flags cash drag when portfolio has >20% in cash', () => { ... });

// Cycle 5 — edge cases
test('handles empty positions object', () => { ... });
test('does not flag a well-diversified portfolio', () => { ... });
```

### autopilotAgent (both)
```js
// Cycle 3 — insight shape
test('each insight has type, action, ticker, quantity, reason', () => { ... });

// Cycle 4 — core logic
test('signals rebalance when a position exceeds concentration threshold', () => { ... });
test('signals buy when a ticker drops more than 5% in 24h', () => { ... });
test('does not signal trades when portfolio is within bounds', () => { ... });

// Cycle 5 — edge cases
test('handles no tickers to trade', () => { ... });
test('never signals a sell-all (minimum position guard)', () => { ... });
```

### Unknown agent type
Use generic cycle 3-5 `test.todo` placeholders.

**Always use these mock fixtures based on dataRouting:**

```js
// userData fixture
const mockUserData = {
  transactions: [
    { id: 'tx1', amount: 50, merchant: 'Whole Foods', category: 'Groceries', date: '2026-03-01' },
    { id: 'tx2', amount: 12, merchant: 'Starbucks', category: 'Coffee', date: '2026-03-02' },
  ],
  balances: [{ accountId: 'acc1', current: 1000, available: 950 }],
  goals: [{ id: 'g1', name: 'Emergency Fund', target: 5000, current: 2000, monthlyContribution: 200 }],
};
const emptyUserData = { transactions: [], balances: [], goals: [] };

// marketData fixture
const mockMarketData = {
  tickers: ['AAPL', 'TSLA'],
  positions: { AAPL: { qty: 10, avgCost: 170, currentPrice: 180 }, TSLA: { qty: 5, avgCost: 260, currentPrice: 250 } },
  quotes: { AAPL: { price: 180, change: 1.5 }, TSLA: { price: 250, change: -2.0 } },
  news: { AAPL: [{ headline: 'Apple hits record', sentiment: 0.8 }] },
};
const emptyMarketData = { tickers: [], positions: {}, quotes: {}, news: {} };
```

## Step 4: Check and Patch Orchestrator (NEW IN V2)

Read `server/orchestrator/index.js` and `server/orchestrator/index.test.js`.

**Check if the agent is already wired:**
- In `index.js`: look for `require('../agents/<agentName>')`
- In `index.test.js`: look for `jest.mock('../agents/<agentName>'`

**If NOT already wired in index.js**, add:
- `const <agentName> = require('../agents/<agentName>');` with other imports
- Wire into the `Promise.all` call with correct data routing
- Add the result key to the returned object

**If NOT already wired in index.test.js**, add:
- `jest.mock('../agents/<agentName>', () => jest.fn());`
- `const <agentName> = require('../agents/<agentName>');`
- `<agentName>.mockReturnValue([]);` in each test's beforeEach setup

If already wired, report: "Orchestrator already wired — no changes needed."

## Step 5: Update progress.md (NEW IN V2)

Read `project-memory/progress.md`. Find the line for `<agentName>` under "Remaining 4 Agents" and update it to indicate it is now in-progress (add `← IN PROGRESS` marker or similar). If not found, append a note under the agents section.

## Step 6: Verify Red

```bash
cd server && npm test -- --testPathPatterns="agents/<agentName>"
```

Report: X passing (cycles 1-2), Y failing or todo (cycles 3-5).

## Step 7: Report

```
✅ Scaffold complete (v2)

Files created:
- server/agents/<agentName>.js       (stub — returns [])
- server/agents/<agentName>.test.js  (domain-specific TDD structure)

Orchestrator: <already wired | patched>
Progress.md:  marked as in-progress

Tests: X passing, Y todo/failing (expected — cycles 3-5 need implementation)

Next steps:
1. Fill in the test.todo bodies with real assertions
2. Implement the agent function until all tests pass
3. Run: cd server && npm run lint && npm test
4. Update project-memory/progress.md to mark complete
5. Commit: git add server/agents/<agentName>* && git commit -m "feat: implement <agentName>"
```
