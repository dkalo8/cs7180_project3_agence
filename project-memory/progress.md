# Agence — Project Progress

_Last updated: 2026-04-06_

## Status: ~75% complete

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

### Backend (complete)
- `server/db/schema.sql` — 6 tables: users, accounts, transactions, balances, goals, trades. Applied to agence_dev (local) + agence_db (Render).
- `server/db/queries.js` — all SQL quarantined here. SSL enabled for Render. 12 tests.
- `server/middleware/auth.js` — JWT Bearer verification, attaches userId to req. 4 tests.
- `server/middleware/errors.js` — centralized 4-arg Express error handler.
- `server/index.js` — Express app, CORS, JSON, /health, all routes registered.
- `server/routes/auth.js` — POST /api/v1/auth/register + /login. 8 tests.
- `server/routes/insights.js` — GET /api/v1/insights (orchestrator → judge pipeline). 4 tests.
- `server/routes/accounts.js` — POST /link-token + POST /exchange (Plaid). 6 tests. ✅
- `server/routes/portfolio.js` — GET /portfolio (Alpaca positions + P&L). 5 tests. ✅
- `server/routes/trades.js` — POST /trades + GET /trades (paper trade via Alpaca). 8 tests. ✅
- `server/routes/goals.js` — GET /goals + POST /goals (savings goals). 6 tests. ✅
- `server/services/plaid.js` — Plaid SDK wrapper (link token, exchange, transactions, balances). ✅
- `server/services/alpaca.js` — Alpaca SDK wrapper (positions, account, snapshots, placeOrder). ✅

### Frontend (complete)
- React Router with protected routes (PrivateRoute → /login redirect)
- AuthContext — JWT storage, login/logout
- Login + Register pages — wired to /api/v1/auth endpoints ✅ working in production
- Dashboard — nav to all sections + PlaidLink button for bank connection ✅
- Insights page — calls GET /api/v1/insights, renders ranked insight feed ✅
- Portfolio page — Alpaca positions table with P&L color coding ✅
- Goals page — create goals form + progress bar list ✅
- `client/src/components/PlaidLink.js` — Plaid Link flow (link token → open → exchange) ✅
- Full CSS: dark nav, card grid, severity badges, portfolio table, auth pages, Plaid button ✅

### Claude Code Features (complete)
- `.claude/settings.json` — PreToolUse ESLint hook on server JS edits, PostToolUse test hook on git push
- `.mcp.json` — postgres (agence_dev) + context7 MCP server config
- `.claude/agents/insight-reviewer.md` — sub-agent for evaluating insight quality/redundancy/severity
- `.claude/skills/run-insights/SKILL.md` — second skill: smoke-tests full pipeline with fixtures
- `.claude/skills/add-agent/SKILL.md` — first skill (v2): scaffolds new agents with TDD

### CI/CD & Deployment (complete)
- `.github/workflows/ci.yml` — 5 jobs: ESLint, Jest, React build, npm audit, AI PR review. ✅ green on first run.
- **Vercel** — https://agence-flame.vercel.app (frontend, live)
- **Render** — https://cs7180-project3-agence.onrender.com (backend API, live)
- `render.yaml` — infrastructure-as-code for Render web service
- `client/vercel.json` — SPA rewrite rule for React Router
- Render PostgreSQL (agence_db) — schema applied, SSL wired

### Integration Tests
- `server/tests/integration/auth.integration.test.js` — 7 tests: register→login round-trip (real bcrypt + JWT), middleware rejection tests. Mocks only pg Pool.
- `server/tests/integration/insights.integration.test.js` — 4 tests: full pipeline JWT→queries→orchestrator→judge. Mocks only pg Pool + orchestrator/judge.

### E2E Tests (Playwright)
- `e2e/tests/auth-flow.spec.js` — 4/4 passing against live Vercel URL: redirect to /login, login page form, register page form, register→dashboard flow. 2 additional tests skip unless E2E_EMAIL/E2E_PASSWORD set.

### Test suite
- **143/143 passing** across 18 test suites (server only)
- E2E: 4/4 passing (Playwright, Chromium, live Vercel URL)
- Coverage: ~95% statements, ~83% branches (70% threshold enforced in CI)
- Lint: clean
- GitHub Actions: green ✅

---

## Next Steps (in order)

### Remaining: Phase 8 Documentation & Demo (user handles)
- Blog post (Medium/dev.to, 1500+ words)
- Screencast (5–10 min)
- Reflection essay (500 words)
- Showcase form submission

### Optional: Deploy updated backend to Render
- Push `server/routes/goals.js` + other new routes live
- Redeploy frontend to Vercel with PlaidLink + Goals UI

### Optional: insights.js marketData wiring
- Currently passes empty `{}` as marketData to orchestrator
- Could pull Alpaca positions/quotes for richer portfolio + autopilot insights

---

## Rubric Breakdown (200 pts)

| Category | Points | Status |
|---|---|---|
| App quality (features, UX, functionality) | 40 | ~35% — auth + insights working in prod, no styling, Plaid/Alpaca not wired |
| Claude Code Mastery | 55 | ~80% — 2 skills, hooks, .mcp.json, sub-agent, 6/6 agents |
| Testing & TDD | 30 | ~70% — 107 unit tests, 0 integration/E2E |
| CI/CD & Production | 35 | ~70% — GitHub Actions green, Vercel + Render live, no pre-commit secrets detection |
| Team Process | 25 | ~10% — conventional commits, no PRs/issues |
| Documentation | 15 | ~65% — README/PRD/CLAUDE.md strong, no blog/video |

---

## Key Architectural Decisions

- **Pure agent functions** — agents receive data, return insights[], no side effects. Makes testing trivial.
- **Promise.all orchestration** — all 6 agents run in parallel per insight request, not sequentially
- **LLM-as-judge with scored dimensions** — judge receives structured JSON, scores on actionability/urgency/crossDomainRelevance/confidence
- **SQL quarantine** — all queries in `server/db/queries.js`, never inline SQL elsewhere
- **Paper trading only** — `ALPACA_PAPER=true` hardcoded, never exposed as a toggle
- **SSL conditional** — `ssl: { rejectUnauthorized: false }` only when DATABASE_URL is set (Render); off for local dev

## Deployment

- **Frontend**: https://agence-flame.vercel.app (Vercel, CRA, deployed via CLI)
- **Backend**: https://cs7180-project3-agence.onrender.com (Render, Node/Express, US West Oregon)
- **Database**: Render PostgreSQL (agence_db, US West Oregon), schema applied
- **GitHub Actions**: https://github.com/dkalo8/cs7180_project3_agence/actions

---

## Active Session Notes

**Session 2026-04-08:**
- 9A Dashboard redesign ✅ — Schwab-style 2-col layout, Recharts AreaChart, holdings, insights rail. 147 tests.
- 9B Expenses page ✅ — category bars + tx table, client-side grouping, "All" default. 152 tests.
- 9C Watchlist ✅ — GET/POST/DELETE /api/v1/watchlist, watchlistAgent, migrate.js auto-creates table on startup. 167 tests.
- 9D AI Chat ✅ — POST /api/v1/chat (Claude Sonnet 4.6, financial context injected), floating ChatWidget (bottom-right FAB), react-markdown + remark-gfm for table rendering. 173 tests.
- CI fixed ✅ — coveragePathIgnorePatterns excludes services/; E2E test updated for rewritten dashboard.
- Local dev CORS unresolved — UI verified on Vercel only.
- Next: 8G Polish pass (trade history tab, order types, empty states, Settings page, goal on dashboard, responsive CSS)

**Session 2026-04-09:**
- Trade "unauthorized" bug fixed ✅ — root cause: Render env var `ALPACA_API_KEY` vs code reading `ALPACA_KEY_ID`. Added fallback in `server/services/alpaca.js`: `ALPACA_KEY_ID || ALPACA_API_KEY`. Portfolio route `.catch()` fallbacks had been masking the auth failure on GET endpoints.
- 8F Watchlist real-time prices ✅ — `getSnapshots` was returning array; fixed to return object keyed by symbol. Watchlist + insights now get actual price data. 176/176 tests.
- AI chat full context ✅ — watchlist + trade history added to Promise.all in chat.js; system prompt updated with WATCHLIST + RECENT TRADES sections + narrow-popup formatting instruction.
- Chat table rendering ✅ — popup widened 360→440px; `min-width: 60px; word-break: normal` on `.chat-md` table cells.
- 173/173 tests passing. Next: 8F Watchlist real-time prices → 8G Polish pass.
