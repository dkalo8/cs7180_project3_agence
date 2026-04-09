# Agence — P3 TODO Checklist

**Deadline:** April 21, 2026 | **Points:** 200 | **Current estimate:** ~173/173 tests, ~85% complete

> Ordered by dependency and rubric impact. Work top-to-bottom.

---

## ⚠️ Verify First (before coding)

- [ ] **Confirm stack approval with professor** — P3 rubric specifies Next.js, but Agence uses CRA + Express. Ask in next class.
- [x] **Confirm solo vs. pair** — other students also working solo; Team Process (25 pts) treated as free points.

---

## Phase 1: Finish Agent Layer ✅

- [x] `/add-agent portfolioAgent marketData` — scaffold via skill
- [x] Implement portfolioAgent: concentration risk (>20% position), unrealized loss (>10%), cash drag (>20% cash)
- [x] `/add-agent autopilotAgent both` — scaffold via skill
- [x] Implement autopilotAgent: rebalance signal when concentration > threshold, buy signal on 5%+ 24h dip
- [x] Run `npm run lint && npm test` — 107/107 passing

---

## Phase 2: Backend Wiring ✅

- [x] Design DB schema: `users`, `accounts`, `goals`, `transactions`, `trades` tables
- [x] Implement `server/db/queries.js` — all SQL here, PostgreSQL MCP for schema inspection
- [x] Implement `server/middleware/auth.js` — JWT verify middleware
- [x] Implement `server/middleware/errors.js` — centralized error handler
- [x] Implement `server/index.js` — Express app, middleware mount, route registration
- [x] Implement `server/routes/auth.js` — POST /api/v1/auth/register, /login
- [x] Implement `server/routes/accounts.js` — Plaid Link token + account sync
- [x] Implement `server/routes/portfolio.js` — Alpaca positions, P&L
- [x] Implement `server/routes/trades.js` — paper trade execution
- [x] Implement `server/routes/insights.js` — GET /api/v1/insights (calls orchestrator → judge)
- [x] Integration tests in `server/tests/integration/` — 11 tests (auth round-trip + insights pipeline)

---

## Phase 3: Frontend ✅

- [x] Set up React Router with protected routes
- [x] Auth flow: login + register pages, JWT storage
- [x] Plaid Link component: connect bank account
- [x] Insights feed: display ranked insights from judge
- [x] Portfolio view: Alpaca positions + P&L
- [x] Goals tracker: create + track savings goals
- [x] CSS / styling — dark nav, card layout, severity badges (PR #6, deployed to Vercel)

---

## Phase 4: Claude Code Features ✅

- [x] **Add a second custom skill** — `/run-insights` (`.claude/skills/run-insights/SKILL.md`)
- [x] **Configure hooks in `.claude/settings.json`:**
  - [x] `PreToolUse` hook: run ESLint on file edits
  - [x] `PostToolUse` hook: run tests after `git push`
- [x] **Create `.mcp.json`** in repo root with postgres + context7 config
- [x] **Create `.claude/agents/`** directory with at least 1 sub-agent (`insight-reviewer.md`)

---

## Phase 5: CI/CD & Deployment ✅

- [x] Create `.github/workflows/ci.yml` with stages: Lint, Unit tests, Security scan, AI PR review, Integration tests
- [ ] Configure Vercel project — preview deploys on PR (blocked: dkalo8 GitHub can't link to existing Vercel account; CLI deploy working)
- [x] Deploy backend API — Render (https://cs7180-project3-agence.onrender.com)
- [x] Deploy frontend — Vercel (https://agence-flame.vercel.app)
- [x] Set up pre-commit secrets detection — detect-secrets v1.5.0 + .secrets.baseline

---

## Phase 6: Testing Gaps ✅

- [x] Configure Playwright for E2E — 4/4 tests passing against live Vercel URL
- [x] Enable Jest coverage reporting — 70% threshold enforced in CI, ~89% actual
- [x] Add at least 3 integration tests (auth flow, insights endpoint) — 11 tests, 173/173 total

---

## Phase 7: Team Process / PRs ✅

- [x] Enable branch-per-feature workflow
- [x] Create GitHub Issues with acceptance criteria — Issues #1–#5 open
- [x] Open PRs for each feature — PR #6 (CSS styling) merged
- [x] Document 2 sprints (planning + retrospective) — `docs/sprint-1.md`, `docs/sprint-2.md`
- [x] Add AI disclosure metadata to PRs

---

## Phase 8: UX/UI Polish & Features

### 8A: Dashboard Redesign ✅
- [x] `GET /api/v1/portfolio/history` — Alpaca portfolio history, 1M/3M/6M/1Y
- [x] Rewrite `Dashboard.js`: equity hero, Recharts AreaChart, accounts table, holdings, insights rail
- [x] `PortfolioChart.js` with period selectors

### 8B: Expenses / Categories Page ✅
- [x] `GET /api/v1/transactions` route
- [x] `Expenses.js`: category bars + transaction table + period filter (All/1M/3M/6M/1Y)

### 8C: Watchlist ✅
- [x] `watchlist` DB table via `migrate.js` (runs on startup)
- [x] GET/POST/DELETE `/api/v1/watchlist`
- [x] `watchlistAgent.js`: movers ≥3%, negative sentiment
- [x] `Watchlist.js` page: add/remove tickers

### 8D: AI Chat Assistant ✅
- [x] `POST /api/v1/chat` — Claude Sonnet 4.6 with financial context injected
- [x] `ChatWidget.js`: floating bottom-right FAB, markdown rendering (react-markdown + remark-gfm)

### 8E: Bug Fixes (do first — unblock other features)
> Bugs found during testing — fix before adding more features

- [x] **Portfolio trade error (431)** — fixed: trades route now surfaces Alpaca error message instead of forwarding upstream status codes; error handler no longer bleeds 3rd-party 4xx to client
- [x] **Trade "unauthorized"** — root cause: Render env var named `ALPACA_API_KEY` but code read `ALPACA_KEY_ID`. Fixed: `alpaca.js` now falls back `ALPACA_KEY_ID || ALPACA_API_KEY`. Portfolio route `.catch()` fallbacks masked the auth failure on GET.
- [ ] **Dashboard balance wiring** — after buying stock via Portfolio, dashboard should reflect updated equity, positions, and sparkline history; verify `GET /api/v1/portfolio` + `GET /api/v1/portfolio/history` re-fetch correctly after trade
- [x] **AI chat full context** — chat route now loads watchlist + trade history alongside transactions/accounts/goals/positions; system prompt gives Claude complete visibility into all user data

### 8F: Watchlist Real-Time Prices ✅
- [x] **Backend** — `GET /api/v1/watchlist` enriched with Alpaca snapshot price + 24h % change; `alpacaService.getSnapshots` fixed to return object keyed by symbol (was returning array, causing null prices in both watchlist and insights)
- [x] **Frontend** — `Watchlist.js` table: Price + 24h Change columns with green/red coloring

### 8G: Polish Pass
> Small improvements with high UX impact

- [ ] **Trade history** — add trade history tab/table to `Portfolio.js` (calls existing `GET /api/v1/trades`)
- [ ] **Order types** — trade form currently hardcodes `market`; add stop/limit/market selector + conditionally show limit_price / stop_price fields
- [ ] **Empty states** — Expenses (→ connect bank), Portfolio (→ make first trade), Goals (→ create goal), Watchlist (→ add ticker)
- [ ] **Settings page** — new `Settings.js`: view/reconnect Plaid, display profile email, sign-out
- [ ] **Goal progress on dashboard** — top active goal with progress bar in dashboard right rail (below insights)
- [ ] **Responsive CSS** — all pages usable at 768px breakpoints

### 8H: Aesthetic Redesign
> Overhaul visual design from AI-generated HTML-y look to polished product UI.
> Do this AFTER all features/fixes are complete — covers everything in one pass.

- [ ] **Design system** — CSS variables for earthy dark palette (deep greens, warm near-black, amber accent), Google Fonts pairing (display serif + geometric sans), spacing/radius scale
- [ ] **Global styles** — apply new tokens to nav, cards, buttons, inputs, badges, tables across all pages
- [ ] **Page-by-page pass** — Dashboard, Insights, Expenses, Watchlist, Portfolio, Goals, Login/Register, ChatWidget
- [ ] **Motion** — add subtle CSS transitions on cards, FAB hover, page reveals
- [ ] Reference: `aesthetic-redesign.md` for full design mandate

### 8I: Google Auth
> Add Google OAuth sign-in alongside existing email/password.
> Do AFTER aesthetic redesign so login page gets new styles applied once.

- [ ] **Backend** — add Google OAuth strategy (Passport.js or direct token verify); new route `POST /api/v1/auth/google`; exchange Google ID token → issue JWT
- [ ] **Frontend** — add "Sign in with Google" button to Login + Register pages; use `@react-oauth/google` or similar
- [ ] **DB** — `users` table: add `google_id` column (nullable) via migration
- [ ] **Test** — mock Google token verify in unit test; integration test verifies JWT returned

---

## Phase 9: Documentation & Demo (do last)

- [x] Add Mermaid architecture diagram to README.md
- [ ] Write + publish blog post (Medium or dev.to) — 1,500+ words
- [ ] Record 5–10 min screencast
- [ ] Write 500-word individual reflection
- [ ] Submit showcase form

---

## Rubric Scorecard

| Category | Max | Est. Now | Achievable |
|---|---|---|---|
| Application Quality | 40 | 30 | 38 (bug fixes + watchlist prices + polish + redesign) |
| Claude Code Mastery | 55 | 47 | 50 (2 skills, hooks, .mcp.json, agent, 7/6 agents) |
| Testing & TDD | 30 | 28 | 28 (173 unit/integration + E2E + 89% coverage) |
| CI/CD & Production | 35 | 30 | 32 (Actions + Vercel + Render + secrets) |
| Team Process | 25 | 18 | 20 (Issues, PR, sprints, AI disclosure) |
| Documentation & Demo | 15 | 5 | 13 (diagram done; blog + video pending) |
| **Total** | **200** | **~158** | **~181** |
