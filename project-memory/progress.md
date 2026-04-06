# Agence — Project Progress

_Last updated: 2026-04-03_

## Status: ~35% complete

**Deadline: April 21, 2026** (CS 7180 Project 3 — 200 pts, 20% of final grade)

---

## What's Built

### Agents (4/6 complete)
- `server/agents/spendingAgent.js` — categorized spending, MoM comparisons, budget flags. Pure function, fully tested (5 TDD cycles).
- `server/agents/marketContextAgent.js` — Alpaca price quotes + Finnhub news sentiment per ticker. Pure function, fully tested (5 TDD cycles).
- `server/agents/anomalyAgent.js` — large transaction detection (>$500) + duplicate charge detection. Pure function, fully tested (5 TDD cycles).
- `server/agents/goalsAgent.js` — savings goal pace tracking; outputs goal_behind / goal_on_track / goal_no_contributions / goal_complete. Pure function, fully tested (5 TDD cycles).

### Orchestrator (complete)
- `server/orchestrator/index.js` — `Promise.all` over all 6 agents, `safeRun` isolation (agent throws → empty array, no crash). Returns `{ spending, anomaly, goals, portfolio, market, autopilot }`. 8 tests.
- `server/orchestrator/judge.js` — LLM-as-judge via `claude-sonnet-4-6`. Structured JSON input, explicit scoring dimensions (actionability/urgency/crossDomainRelevance/confidence). Fallback: returns flattened raw insights on Anthropic failure. 9 tests.

### Infrastructure
- `server/package.json` — all deps wired including `@anthropic-ai/sdk@^0.80.0`
- `server/.eslintrc.json` — ESLint configured, passes clean
- Jest with `--forceExit` (fixes hanging on open handles)
- `.env.example` — all env vars documented
- `docs/PRD.md` — full product requirements
- `CLAUDE.md` — API boundaries, rules, architecture map, dev workflow
- `project-memory/` — progress, context (harness design, decisions), batch-fixes log

### Test suite
- **63/63 passing** across 6 test suites
- Lint: clean

---

## Next Steps (in order)

### NEXT: Remaining 4 Agents
Build each via TDD (red → green → commit). They are pure functions, zero external dependencies — fastest wins.

1. **`server/agents/portfolioAgent.js`** ← IN PROGRESS (stub + tests scaffolded, implementation TODO)
   - Input: `marketData` (`{ positions, quotes }`)
   - Output: `[{ type, message, severity, ticker? }]`
   - Logic: concentration risk (any position > 20% of portfolio), unrealized P&L flags, cash drag

2. **`server/agents/autopilotAgent.js`**
   - Input: `userData`, `marketData`
   - Output: `[{ type, action, ticker, quantity, reason }]`
   - Logic: rule-based paper trade signals (e.g. rebalance when concentration > threshold, buy on dip)

### After Agents: Backend Wiring (do as a unit)

Design order matters — each layer depends on the one below:

1. **DB schema + `server/db/queries.js`** — define tables first (users, accounts, goals, trades); query functions cascade from schema
2. **`server/middleware/auth.js`** — JWT verification; needed by all protected routes
3. **`server/middleware/errors.js`** — centralized error handler
4. **`server/index.js`** — Express app, middleware mount, route registration
5. **Routes** (in dependency order):
   - `auth.js` — POST /api/v1/auth/register, /login, /logout
   - `accounts.js` — Plaid account connections, balances
   - `portfolio.js` — Alpaca positions, P&L
   - `trades.js` — paper trade execution
   - `insights.js` — GET /api/v1/insights (calls orchestrator → judge)

### After Backend: Frontend (client/)
- Auth flow (login/register)
- Plaid Link integration (connect bank accounts)
- Insights feed (ranked output from judge)
- Portfolio view (Alpaca positions)
- Goals tracker
- Autopilot controls
- Functional components only, no class components

### Integration Tests + CI/CD (don't leave until last — 30 rubric pts)
- `server/tests/integration/` — auth flow, insights endpoint, orchestrator round-trip
- GitHub Actions: lint + test on every PR

---

## Rubric Breakdown (200 pts)

| Category | Points | Status |
|---|---|---|
| App quality (features, UX, functionality) | 50 | 5% done |
| AI implementation (agents, orchestrator, judge) | 45 | 55% done (2/6 agents + full orchestrator + judge) |
| Tech implementation (architecture, DB, auth) | 40 | 15% done |
| CI/CD + monitoring | 30 | 0% done |
| Team collaboration | 20 | N/A |
| Documentation | 15 | 65% done |

---

## Key Architectural Decisions

See `context/decisions.md` for full rationale. Short version:

- **Pure agent functions** — agents receive data, return insights[], no side effects. Makes testing trivial.
- **Promise.all orchestration** — all 6 agents run in parallel per insight request, not sequentially
- **LLM-as-judge with scored dimensions** — judge receives structured JSON, scores on actionability/urgency/crossDomainRelevance/confidence (not "rank these generically")
- **SQL quarantine** — all queries in `server/db/queries.js`, never inline SQL elsewhere
- **Paper trading only** — `ALPACA_PAPER=true` hardcoded, never exposed as a toggle

---

## Active Session Notes

_Clear this section at the start of each session and replace with current work._

**Session 2026-04-03 (complete):** anomalyAgent + goalsAgent fully implemented (63/63 passing). HW5 /add-agent skill v1→v2, PostgreSQL MCP added, retrospective written. Root README.md created, batch-fixes log restructured. Next: portfolioAgent.
