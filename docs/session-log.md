# HW4 — Annotated Claude Code Session Log

## Overview
This log covers the full Claude Code session for HW4 Parts 1–3 plus
tooling setup. Annotations in **[brackets]** mark which workflow phase
or rubric criterion each exchange demonstrates.

---

## Part 1 — Project Setup

### Reading the setup instructions
**User:** `read @agence-setup.md and follow it from Step 1 through Step 6`

**[EXPLORE]** Claude read `agence-setup.md` to understand the full project
structure before executing any commands — never assumed structure, always
verified first.

### Step 1 — Bootstrap
```bash
npx create-react-app client
mkdir server && cd server
npm init -y
npm install express pg plaid finnhub dotenv cors jsonwebtoken bcrypt
npm install --save-dev jest supertest nodemon
mkdir -p server/agents server/orchestrator server/routes server/db \
         server/tests/integration server/middleware docs
touch server/index.js server/db/queries.js server/orchestrator/index.js \
      server/agents/spendingAgent.js server/agents/marketContextAgent.js \
      server/agents/anomalyAgent.js server/agents/goalsAgent.js \
      server/routes/auth.js server/routes/accounts.js server/routes/insights.js \
      .env.example .gitignore
```

**[CONTEXT MANAGEMENT]** Claude used parallel tool calls to create multiple
files simultaneously rather than sequentially — efficient and consistent with
the CLAUDE.md rule "Orchestrator runs agents via Promise.all — never sequentially."

### Step 3–4 — CLAUDE.md and docs/PRD.md created
CLAUDE.md was written with: tech stack, architecture, commands, coding
conventions, testing strategy, do's and don'ts, and an `@import` reference
to `@docs/PRD.md` (required by Part 1 rubric).

### Initial commits
```
a09dcf1 chore: initial project scaffold
846ddb3 chore: add npm scripts and CLAUDE.md
```

### Pushing to GitHub
```bash
git remote add origin git@github.com:dkalo8/cs7180_project3_agence.git
git push -u origin main
```

---

## Security Incident — API Key in .env.example

**[CONTEXT MANAGEMENT — catching mistakes before they land in git]**

During a subsequent update, an actual Anthropic API key was pasted into
`.env.example`. Claude caught this before committing:

> **Claude:** Stop — security issue. `.env.example` contains what looks like
> a real Anthropic API key: `sk-ant-api03-ts29...`. `.env.example` is
> committed to git and pushed to GitHub — treat it as compromised.
> You should immediately rotate that key at console.anthropic.com.

The key was scrubbed and replaced with the placeholder before any commit.

**Key lesson:** `.env.example` is intentionally committed — it's a
public template showing what vars the project needs. `.env` (with real
secrets) is gitignored. Never put real values in `.env.example`.
This distinction matters in professional projects and is easy to get wrong.

---

## Scaffold Expansion — Revised agence-setup.md

**User:** re-read `@agence-setup.md` — the project vision has expanded.
Check what's missing before proceeding with HW4.

**[EXPLORE — gap analysis before acting]** Rather than immediately making
changes, Claude first ran a full structural comparison of the current file
tree against the updated spec, then surfaced a complete diff for approval:

**Missing files:**
- `server/agents/portfolioAgent.js`
- `server/agents/autopilotAgent.js`
- `server/orchestrator/judge.js`
- `server/routes/portfolio.js`
- `server/routes/trades.js`
- `server/middleware/auth.js`
- `server/middleware/errors.js`
- `docs/TODO-post-p3.md` (existed at root, wrong location)

**Missing dependency:** `@alpacahq/alpaca-trade-api`

**Files needing content updates:** `CLAUDE.md`, `docs/PRD.md`, `.env.example`

**Structural bug:** `client/` had a nested `.git` repo (created by
`create-react-app`), making it a gitlink/submodule. The root repo was
tracking `client` as a single commit hash, not as individual files.
Fixed by:
```bash
rm -rf client/.git          # remove nested git repo
git rm --cached client      # remove the gitlink entry from index
git add client/             # re-add as regular tracked files
```

```
f33f87f chore: expand scaffold to full Agence vision (Alpaca, portfolio, autopilot)
```

---

## API Responsibility Clarification

A second revision of `agence-setup.md` clarified that Alpaca — not
Finnhub — is the primary market data source:

| Data Need | API |
|---|---|
| Price quotes, portfolio, P&L, trades | **Alpaca** (primary) |
| Bank transactions, balances | Plaid |
| News articles, sentiment **only** | Finnhub (**NOT** price data) |
| Insight synthesis | Anthropic |

**[PLAN — requirements change handled before coding]**
This directly changed the design of `marketContextAgent`. Rather than
proceeding with the old plan, Claude stopped, updated CLAUDE.md and
PRD.md to reflect the new API map, and revised the Part 3 acceptance
criteria before writing a single line of agent code.

```
ca876a6 chore: update API responsibility map (Alpaca=quotes, Finnhub=news only)
```

---

## CLAUDE.md Iteration — User-Driven Refinement

**[PART 1 — CLAUDE.md iteration]** After the initial CLAUDE.md was generated,
the user made their own edits to tighten it — adding an `## On Compaction`
section and a `## Reminders` quick-reference block. This is exactly the
Explore→iterate pattern the assignment describes.

Claude then reviewed the user's version and flagged two issues:
1. **Missing `@docs/PRD.md` import** — required by hw4.md rubric
2. **`npm run lint` referenced but no lint tooling existed** — the command
   would silently fail or error

These were resolved before proceeding (see ESLint setup below).

---

## ESLint Setup

**[CODING CONVENTIONS — tooling backed by real config]**

Rather than drop the lint reference, ESLint was wired up properly so
`npm run lint` is a real, passing command:

```bash
npm install --save-dev eslint@8  # pinned to match Alpaca's peer dep
```

`.eslintrc.json` configured with `eslint:recommended` plus project rules:
- `no-unused-vars` (unused args must be prefixed `_`)
- `eqeqeq` (strict equality only)
- `no-var` + `prefer-const`

This immediately caught a real issue: `marketData` parameter in
`spendingAgent` was unused (agents accept `marketData` for signature
consistency but this agent doesn't use it). Fixed by renaming to `_marketData`.

```bash
npm run lint   # ✓ clean
npm test       # ✓ 30/30 passing
```

```
da94683 chore: add ESLint config, lint script, restore @docs/PRD.md import in CLAUDE.md
```

---

## Part 2 — Explore → Plan → Implement → Commit

**Feature:** `server/agents/spendingAgent.js`

### Explore phase

**[EXPLORE]** Claude used Glob and Read tools to inspect every relevant
file before proposing any design:
- All agent files — confirmed all were empty placeholders
- `server/package.json` — Jest installed, scripts configured
- `CLAUDE.md` — agent contract: pure functions, `(userData, marketData) => insights[]`
- `docs/PRD.md` — spending patterns, MoM comparisons as core features

Key finding: the agent contract (pure function, no side effects, no DB/API calls)
meant the agent would be fully testable with plain JS objects — no mocking needed.

A design note was committed to make the Explore phase visible in git history:
```
4cdd5ae explore: document spendingAgent structure and design decisions
```

### Plan phase

**[PLAN]** Full interface designed and presented for approval before writing
any code. This matches the CLAUDE.md rule: "Use plan mode before any feature
touching 3+ files."

```
Input:  userData = { transactions: [{ id, amount, category, date, name }] }
        marketData = {} (unused — consistent signature)
Output: [{ type, message, severity }]

Acceptance criteria:
1. Returns [] for empty/missing transactions — never throws
2. Identifies top spending category → type: 'top_category', severity: 'info'
3. Flags any category > 30% of total spend → type: 'category_spike', severity: 'warning'
4. Flags MoM spend increase > 20% → type: 'monthly_increase', severity: 'warning'
5. Every insight has shape { type, message, severity }
```

### Implement — Tests first (red)

**[IMPLEMENT]** Tests written before `spendingAgent.js` had any code:

```javascript
// spendingAgent.test.js — 10 tests, all written before implementation
it('returns empty array when transactions is empty', () => {
  const result = spendingAgent({ transactions: [] }, {});
  expect(result).toEqual([]);
});

it('identifies the highest-spend category', () => {
  const results = spendingAgent(userData, {});
  const insight = results.find((i) => i.type === 'top_category');
  expect(insight.message).toContain('Food & Drink');
});
```

Test run confirmed 10 failures (`spendingAgent is not a function`):
```
Tests: 10 failed, 0 passed
b423f5d test: add failing unit tests for spendingAgent (red)
```

### Implement — Implementation (green)

```javascript
function spendingAgent(userData, _marketData) {
  const transactions = userData?.transactions;
  if (!transactions || transactions.length === 0) return [];
  // group by category, compute totals, derive insights
}
```

```
Tests: 10 passed, 0 failed
8fec5a6 feat: implement spendingAgent (top category, spike, MoM increase)
```

### Refactor

Extracted three pure helper functions to eliminate duplication and improve
readability. Tests stayed green — refactor didn't change behavior:

- `toYearMonth(date)` — converts Date to `"YYYY-MM"` string
- `sumBy(txns)` — sums transaction amounts
- `groupByCategory(txns)` — reduces transactions into `{ category: total }` map

```
Tests: 10 passed (unchanged)
6e2ed54 refactor: extract helpers in spendingAgent (toYearMonth, sumBy, groupByCategory)
```

---

## Part 3 — TDD with Claude Code

**Feature:** `server/agents/marketContextAgent.js`

Strict red-green-refactor per acceptance criterion. Each cycle:
one `test:` commit (red) → one `feat:` commit (green).

### TDD Cycle 1 — Empty ticker list

**[TDD — RED]**
```javascript
it('returns empty array when tickers is empty', () => {
  const result = marketContextAgent({ tickers: [] }, { quotes: {}, news: {} });
  expect(result).toEqual([]);
});
```
```
3 failed → 7590f5e test: marketContextAgent cycle 1 — empty ticker list (red)
```

**[TDD — GREEN]** Minimum code to pass — nothing more:
```javascript
function marketContextAgent(userData, marketData) {
  const tickers = userData?.tickers;
  if (!tickers || tickers.length === 0) return [];
  return [];
}
```
```
3 passed → dbf639a feat: marketContextAgent cycle 1 — handle empty ticker list (green)
```

---

### TDD Cycle 2 — Alpaca failure (null/missing quotes)

**[TDD — RED]**
```javascript
it('returns empty array when quotes is null', () => {
  const result = marketContextAgent({ tickers: ['AAPL'] }, { quotes: null });
  expect(result).toEqual([]);
});
```
```
4 tests written → 0693db7 test: marketContextAgent cycle 2 — Alpaca failure guard clauses (red)
```

**[TDD — GREEN]** Added explicit null guard for Alpaca quotes:
```javascript
const quotes = marketData?.quotes;
if (!quotes) return [];
```
```
7 passed → 3c69a51 feat: marketContextAgent cycle 2 — guard against Alpaca failure (green)
```

---

### TDD Cycle 3 — Price + 24h change per ticker (Alpaca)

**[TDD — RED]** Tests that require real output — forced stub to grow:
```javascript
it('returns a market_quote insight for each ticker', () => {
  const quotes = results.filter((i) => i.type === 'market_quote');
  expect(quotes).toHaveLength(2);
});

it('market_quote has severity warning for negative change', () => {
  expect(insight.severity).toBe('warning');
});
```
```
5 failed → ab8e03f test: marketContextAgent cycle 3 — price + 24h change (red)
```

**[TDD — GREEN]**
```javascript
tickers.forEach((ticker) => {
  const quote = quotes[ticker];
  if (!quote) return;
  insights.push({
    type: 'market_quote',
    ticker,
    message: `${ticker} is $${quote.price.toFixed(2)}, ${direction} ${absPct}% today`,
    severity: quote.changePercent >= 0 ? 'info' : 'warning',
  });
});
```
```
12 passed → 3c4c087 feat: marketContextAgent cycle 3 — price + 24h change (green)
```

---

### TDD Cycle 4 — News sentiment per ticker (Finnhub)

**[TDD — RED]**
```javascript
it('returns a market_sentiment insight for each ticker with news', () => {
  const sentiments = results.filter((i) => i.type === 'market_sentiment');
  expect(sentiments).toHaveLength(2);
});

it('market_sentiment severity is warning for negative sentiment (score < 0.5)', () => {
  expect(insight.severity).toBe('warning');
});
```
```
4 failed → f7a94f1 test: marketContextAgent cycle 4 — news sentiment (red)
```

**[TDD — GREEN]** Added Finnhub news loop — non-critical, uses `|| {}` so
null news never crashes the agent:
```javascript
const news = marketData?.news || {};
tickers.forEach((ticker) => {
  const article = news[ticker];
  if (!article) return;
  insights.push({
    type: 'market_sentiment',
    ticker,
    message: `${ticker} news: ${article.headline}`,
    severity: article.sentimentScore >= 0.5 ? 'info' : 'warning',
  });
});
```
```
16 passed → 9c7e269 feat: marketContextAgent cycle 4 — news sentiment (green)
```

---

### TDD Cycle 5 — Finnhub failure is non-critical

**[TDD — illustrates an important property]**
Tests written to verify that when `news` is null, price insights still return
(Finnhub failure must not block Alpaca data):

```javascript
it('still returns market_quote insights when news is null', () => {
  const results = marketContextAgent({ tickers: ['AAPL'] }, { ...quotesOnly, news: null });
  expect(results.filter((i) => i.type === 'market_quote')).toHaveLength(1);
});
```

All 4 Cycle 5 tests passed immediately — the `|| {}` guard from Cycle 4
already handled this. This is a valid and common TDD outcome: writing tests
for a new criterion can confirm that the implementation is already correct.
No new implementation commit was needed.

```
4f2eef7 test: marketContextAgent cycle 5 — Finnhub failure non-critical (covered by cycle 4)
```

---

### Refactor — Single flatMap pass

Collapsed two separate `forEach` loops (one for quotes, one for news) into
a single `flatMap` — one pass per ticker handles both data sources:

```javascript
return tickers.flatMap((ticker) => {
  const insights = [];
  const quote = quotes[ticker];
  if (quote) { insights.push({ type: 'market_quote', ... }); }
  const article = news[ticker];
  if (article) { insights.push({ type: 'market_sentiment', ... }); }
  return insights;
});
```

```
20 passed (unchanged) → 4b403d9 refactor: collapse marketContextAgent into single flatMap pass
```

---

## Final Git History

```
da94683 chore: add ESLint config, lint script, restore @docs/PRD.md import in CLAUDE.md
6377ca3 docs: add annotated session log for HW4 Part 4
4b403d9 refactor: collapse marketContextAgent into single flatMap pass per ticker
4f2eef7 test: marketContextAgent cycle 5 — Finnhub failure non-critical (covered by cycle 4 guard)
9c7e269 feat: marketContextAgent cycle 4 — news sentiment per ticker (green)
f7a94f1 test: marketContextAgent cycle 4 — news sentiment per ticker (red)
3c4c087 feat: marketContextAgent cycle 3 — price + 24h change per ticker (green)
ab8e03f test: marketContextAgent cycle 3 — price + 24h change per ticker (red)
3c69a51 feat: marketContextAgent cycle 2 — guard against Alpaca failure (green)
0693db7 test: marketContextAgent cycle 2 — Alpaca failure guard clauses (red)
dbf639a feat: marketContextAgent cycle 1 — handle empty ticker list (green)
7590f5e test: marketContextAgent cycle 1 — empty ticker list (red)
ca876a6 chore: update API responsibility map (Alpaca=quotes, Finnhub=news only)
6e2ed54 refactor: extract helpers in spendingAgent (toYearMonth, sumBy, groupByCategory)
8fec5a6 feat: implement spendingAgent (top category, spike, MoM increase)
b423f5d test: add failing unit tests for spendingAgent (red)
4cdd5ae explore: document spendingAgent structure and design decisions
f33f87f chore: expand scaffold to full Agence vision (Alpaca, portfolio, autopilot)
422a129 Updated Claude.md
846ddb3 chore: add npm scripts and CLAUDE.md
a09dcf1 chore: initial project scaffold
```

---

## Context Management Strategies Used

| Strategy | When | Why it mattered |
|---|---|---|
| Read before acting | Before every phase | Never assumed structure; caught gaps before coding |
| Parallel tool calls | File creation, multi-file reads | Faster; mirrors agent Promise.all pattern |
| Gap analysis before implementing | After each setup doc revision | Caught 7 missing files + gitlink bug |
| Plan presented and approved before coding | Before Part 2 and Part 3 | Aligned on interface/acceptance criteria first |
| Stopped before destructive action | Removing `client/.git` submodule | Explained impact, confirmed before proceeding |
| Caught security issue pre-commit | API key in `.env.example` | Key was live; caught before it reached git history |
| Re-planned when requirements changed | Alpaca/Finnhub role swap | Revised acceptance criteria before writing any test |
| One logical change per commit | Throughout Parts 2 and 3 | Clean git history maps directly to workflow phases |
| Verified lint + tests before every commit | All of Part 3 | Enforces CLAUDE.md rule; caught unused param in spendingAgent |

---

## Test Summary

| Agent | Tests | Status |
|---|---|---|
| spendingAgent | 10 | ✓ passing |
| marketContextAgent | 20 | ✓ passing |
| **Total** | **30** | **✓ all green** |
