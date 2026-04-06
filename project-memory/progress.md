# Agence — Project Progress

_Last updated: 2026-04-06_

## Status: ~60% complete

**Deadline: April 21, 2026** (CS 7180 Project 3 — 200 pts, 20% of final grade)

---

## What's Built

### Agents (6/6 complete)
- `server/agents/spendingAgent.js` — categorized spending, MoM comparisons, budget flags. 5 tests.
- `server/agents/marketContextAgent.js` — Alpaca price quotes + Finnhub news sentiment. 6 tests.
- `server/agents/anomalyAgent.js` — large transaction detection + duplicate charge detection. 5 tests.
- `server/agents/goalsAgent.js` — savings goal pace tracking; goal_behind / on_track / no_contributions / complete. 5 tests.
- `server/agents/portfolioAgent.js` — concentration risk (>20%), unrealized loss (>10%), cash drag (>20%). 8 tests.
- `server/agents/autopilotAgent.js` — rebalance sell signal (>20% concentration), buy-on-dip (<-5% 24h). 8 tests.

### Orchestrator (complete)
- `server/orchestrator/index.js` — Promise.all over all 6 agents, safeRun isolation. 8 tests.
- `server/orchestrator/judge.js` — LLM-as-judge via claude-sonnet-4-6, explicit scoring dimensions, fallback. 9 tests.

### Backend (core complete)
- `server/db/schema.sql` — 6 tables: users, accounts, transactions, balances, goals, trades. Applied to agence_dev.
- `server/db/queries.js` — all SQL quarantined here. 12 tests.
- `server/middleware/auth.js` — JWT Bearer verification, attaches userId to req. 4 tests.
- `server/middleware/errors.js` — centralized 4-arg Express error handler.
- `server/index.js` — Express app, CORS, JSON, /health, all routes registered.
- `server/routes/auth.js` — POST /api/v1/auth/register + /login. 8 tests.
- `server/routes/insights.js` — GET /api/v1/insights (orchestrator → judge pipeline). 4 tests.
- `server/routes/accounts.js` — stub (Plaid integration pending)
- `server/routes/portfolio.js` — stub (Alpaca integration pending)
- `server/routes/trades.js` — stub (Alpaca integration pending)

### Frontend (scaffold complete)
- React Router with protected routes (PrivateRoute → /login redirect)
- AuthContext — JWT storage, login/logout
- Login + Register pages — wired to /api/v1/auth endpoints
- Dashboard — nav to all sections
- Insights page — calls GET /api/v1/insights, renders ranked insight feed
- Goals + Portfolio pages — placeholder (pending Plaid/Alpaca wiring)

### Test suite
- **107/107 passing** across 12 test suites (server only)
- Lint: clean
- CRA dev server: compiles clean on port 3000

---

## Next Steps (in order)

### NEXT: Claude Code Features (quick wins, +10 pts)
1. Add second custom skill (`/wire-route` or `/run-insights`)
2. Configure hooks in `.claude/settings.json` (PreToolUse lint, PostToolUse test)
3. Create `.mcp.json` in repo root
4. Add `.claude/agents/` sub-agent

### Then: CI/CD & Deployment (+25 pts)
1. `.github/workflows/ci.yml` — lint, test, security scan, AI review
2. Vercel deploy (frontend) + Railway/Render (backend API)
3. Pre-commit secrets detection

### Then: Remaining Backend Routes
- `accounts.js` — Plaid Link token + account sync
- `portfolio.js` — Alpaca positions + P&L
- `trades.js` — paper trade execution

### Then: Frontend Polish
- CSS / styling (make it look like a real product)
- Goals UI — create + track savings goals
- Portfolio UI — Alpaca positions display
- Plaid Link component

### Then: Testing Gaps
- Integration tests (`server/tests/integration/`)
- Playwright E2E (login → insights flow)
- Jest coverage reporting

### Then: Documentation & Demo
- Mermaid architecture diagram in README
- Blog post (Medium/dev.to)
- Screencast (5–10 min)
- Reflection essay + showcase form

---

## Rubric Breakdown (200 pts)

| Category | Points | Status |
|---|---|---|
| App quality (features, UX, functionality) | 40 | ~30% — auth + insights working, no styling, Plaid/Alpaca not wired |
| Claude Code Mastery | 55 | ~40% — 1 skill, no hooks, no .mcp.json, 6/6 agents |
| Testing & TDD | 30 | ~70% — 107 unit tests, 0 integration/E2E |
| CI/CD & Production | 35 | 0% — no pipeline, no deploy |
| Team Process | 25 | ~10% — conventional commits, no PRs/issues |
| Documentation | 15 | ~65% — README/PRD/CLAUDE.md strong, no blog/video |

---

## Key Architectural Decisions

- **Pure agent functions** — agents receive data, return insights[], no side effects. Makes testing trivial.
- **Promise.all orchestration** — all 6 agents run in parallel per insight request, not sequentially
- **LLM-as-judge with scored dimensions** — judge receives structured JSON, scores on actionability/urgency/crossDomainRelevance/confidence
- **SQL quarantine** — all queries in `server/db/queries.js`, never inline SQL elsewhere
- **Paper trading only** — `ALPACA_PAPER=true` hardcoded, never exposed as a toggle

---

## Active Session Notes

_Clear this section at the start of each session and replace with current work._

**Session 2026-04-06 (complete):** portfolioAgent + autopilotAgent (79/79). Backend wiring: DB schema, queries.js, middleware, server/index.js, auth route, insights route (107/107). React frontend scaffold: routing, auth, insights feed. Dev server compiles clean. Next: Claude Code features (hooks, .mcp.json, second skill).
