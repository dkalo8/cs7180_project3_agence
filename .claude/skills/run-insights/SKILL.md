# Run Insights Skill

Invoke the full Agence insight pipeline (orchestrator → judge) against fixture data and display the ranked results. Useful for rapid smoke-testing the pipeline without a running server or real credentials.

## When to Use

- After modifying any agent to verify the output shape and content
- After changing the judge prompt to see how ranking shifts
- To demo the pipeline end-to-end during development

## Arguments

Parse from the slash command invocation:
- `--user <fixture>` — which userData fixture to use: `default` (default) or `empty`
- `--market <fixture>` — which marketData fixture to use: `default` (default) or `empty`

If no arguments provided, use both defaults.

## Step 1: Confirm

Echo what you're about to run:
```
Running insights pipeline with:
  userData:   <fixture name>
  marketData: <fixture name>
```

Ask: "Proceed?"

## Step 2: Build Fixture Data

Use these in-memory fixtures (do NOT read from DB or call external APIs):

```js
// Default userData
const userData = {
  transactions: [
    { id: 'tx1', amount: 120, merchant: 'Whole Foods', category: 'Groceries', date: '2026-03-28' },
    { id: 'tx2', amount: 85,  merchant: 'Uber Eats',   category: 'Dining',    date: '2026-03-29' },
    { id: 'tx3', amount: 950, merchant: 'Landlord',    category: 'Rent',      date: '2026-04-01' },
    { id: 'tx4', amount: 85,  merchant: 'Uber Eats',   category: 'Dining',    date: '2026-04-01' },  // duplicate
  ],
  balances: [{ accountId: 'acc1', current: 3200, available: 2800 }],
  goals: [
    { id: 'g1', name: 'Emergency Fund', target: 10000, current: 3200,
      monthlyContribution: 200, targetDate: '2027-01-01' },
  ],
};

// Default marketData
const marketData = {
  tickers: ['AAPL', 'TSLA', 'NVDA'],
  positions: {
    AAPL: { qty: 30, avgCost: 160, currentPrice: 175 },
    TSLA: { qty: 5,  avgCost: 260, currentPrice: 195 },   // unrealized loss
    NVDA: { qty: 2,  avgCost: 480, currentPrice: 870 },
  },
  quotes: {
    AAPL: { price: 175, change: 1.2 },
    TSLA: { price: 195, change: -6.5 },  // dip trigger
    NVDA: { price: 870, change: 0.8 },
  },
  news: {
    AAPL: [{ headline: 'Apple reports strong iPhone demand', sentiment: 0.75 }],
    TSLA: [{ headline: 'Tesla misses delivery estimates', sentiment: -0.6 }],
  },
  cash: 500,
};

// Empty fixtures
const emptyUserData   = { transactions: [], balances: [], goals: [] };
const emptyMarketData = { tickers: [], positions: {}, quotes: {}, news: {}, cash: 0 };
```

## Step 3: Run the Pipeline

Write a temporary runner script at `/tmp/agence-run-insights.js`:

```js
'use strict';
const path = require('path');
const ROOT = '/Users/danielkalo/Documents/CS 7180 - Vibe Coding (Python)/Project 3 - Agence/server';
const runOrchestrator = require(path.join(ROOT, 'orchestrator/index'));
const runJudge        = require(path.join(ROOT, 'orchestrator/judge'));

// <paste selected fixtures here>

async function main() {
  console.log('Running orchestrator...');
  const agentOutputs = await runOrchestrator(userData, marketData);
  console.log('\nRaw agent outputs:');
  Object.entries(agentOutputs).forEach(([agent, insights]) => {
    console.log(`  ${agent}: ${insights.length} insight(s)`);
  });

  console.log('\nRunning judge...');
  const insights = await runJudge(agentOutputs);

  console.log('\n=== RANKED INSIGHTS ===\n');
  insights.forEach((insight, i) => {
    console.log(`[${i + 1}] [${(insight.severity || 'info').toUpperCase()}] ${insight.message}`);
    if (insight.score !== undefined) console.log(`     score: ${insight.score}`);
  });

  console.log(`\nTotal: ${insights.length} insights`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

Then run it:
```bash
node /tmp/agence-run-insights.js
```

## Step 4: Display Results

Format the output as a readable table:

```
=== Agence Insight Pipeline Results ===

Agent outputs:
  spendingAgent       : N insights
  anomalyAgent        : N insights
  goalsAgent          : N insights
  portfolioAgent      : N insights
  marketContextAgent  : N insights
  autopilotAgent      : N insights

Ranked insights (after judge):
  [1] [HIGH]   <message>
  [2] [HIGH]   <message>
  [3] [MEDIUM] <message>
  ...

Total: N insights
```

If the judge fails (e.g., no ANTHROPIC_API_KEY), report the raw agent output counts and note that the judge step requires a valid API key.

## Step 5: Report

```
✅ Insights pipeline ran successfully

  Agent outputs: N total raw insights
  After judge:   N ranked insights
  Top insight:   "<message>"

To see this live, start the server (npm run dev) and hit GET /api/v1/insights with a valid JWT.
```
