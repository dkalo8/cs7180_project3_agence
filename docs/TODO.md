# Agence — P3 TODO Checklist

**Deadline:** April 21, 2026 | **Points:** 200 | **Current estimate:** ~181/181 tests, ~88% complete

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
- [x] Implement `server/routes/auth.js` — POST /api/v1/auth/register, /login, GET /api/v1/auth/me
- [x] Implement `server/routes/accounts.js` — Plaid Link token + account sync
- [x] Implement `server/routes/portfolio.js` — Alpaca positions, P&L
- [x] Implement `server/routes/trades.js` — paper trade execution (market/limit/stop/stop_limit order types)
- [x] Implement `server/routes/insights.js` — GET /api/v1/insights (calls orchestrator → judge)
- [x] Integration tests in `server/tests/integration/` — 11 tests (auth round-trip + insights pipeline)

---

## Phase 3: Frontend ✅

- [x] Set up React Router with protected routes
- [x] Auth flow: login + register pages, JWT storage
- [x] Plaid Link component: connect bank account
- [x] Insights feed: display ranked insights from judge
- [x] Portfolio view: Alpaca positions + P&L + trade history tab
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
- [x] Add at least 3 integration tests (auth flow, insights endpoint) — 11 tests, 181/181 total

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
- [x] `POST /api/v1/chat` — Claude Sonnet 4.6 with full financial context (accounts, transactions, positions, watchlist, trades, goals)
- [x] `ChatWidget.js`: floating bottom-right FAB, markdown rendering (react-markdown + remark-gfm)

### 8E: Bug Fixes ✅
- [x] **Portfolio trade error (431)** — trades route surfaces Alpaca error message; error handler no longer bleeds 3rd-party 4xx
- [x] **Trade "unauthorized"** — `alpaca.js` fallback `ALPACA_KEY_ID || ALPACA_API_KEY`; portfolio `.catch()` fallbacks were masking the auth failure
- [x] **AI chat full context** — watchlist + trade history alongside transactions/accounts/goals/positions
- [x] **Account balance display** — `getAccountsByUserId` now LEFT JOINs `balances` so Settings/Account page shows real Plaid balances

### 8F: Watchlist Real-Time Prices ✅
- [x] **Backend** — `GET /api/v1/watchlist` enriched with Alpaca snapshot price + 24h % change; `alpacaService.getSnapshots` fixed to return object keyed by symbol
- [x] **Frontend** — `Watchlist.js` table: Price + 24h Change columns with green/red coloring

### 8G: Polish Pass ✅ (partial)
- [x] **Trade history** — Positions / Trade History tab toggle in `Portfolio.js`
- [x] **Order types** — market/limit/stop/stop_limit selector; conditional limit_price + stop_price fields
- [x] **Empty states** — all pages verified
- [x] **Account/Settings page** — `/settings` route: profile email (via `GET /api/v1/auth/me`), linked accounts, sign-out
- [x] **Goal progress on dashboard** — top active goal with progress bar in right rail
- [ ] **Drag-and-drop goal ordering** — let user set goal priority via drag-and-drop on Goals page
- [ ] **Dashboard balance wiring** — after buying stock, dashboard should reflect updated equity, positions, and sparkline; verify re-fetch after trade
- [ ] **Dashboard percent-change zeros** — 24h change shows 0% across the board; likely because only brokerage equity is tracked, not the cash account; investigate Alpaca `/account` cash field + combine cash + equity into displayed total
- [ ] **Responsive CSS** — deferred until after 9B aesthetic redesign (redesign will redo CSS in one pass)
- [ ] **Account selection** — if user has multiple Plaid or trading accounts, allow switching active account on dashboard
- [ ] **Investor risk profile** — settings field for risk tolerance (conservative/moderate/aggressive); feed into autopilot agent rules
- [ ] **Goal types** — add `goal_type` column to goals table (savings/growth/speculation); display type badge, tailor pace/progress logic per type

---

## Phase 9: Priority Features (do in order)

### 9A: Household Accounts ✅
> "As a household user, I want to invite my partner to a shared dashboard so we can see our combined finances together."

- [x] **DB migration** — `households` + `household_members` tables added to `migrate.js` (idempotent, runs on startup)
- [x] **Backend routes** — `POST /api/v1/household` (create), `POST /api/v1/household/invite` (invite by email), `GET /api/v1/household`; 13 tests
- [x] **Frontend** — Account page: create form, member list, Remove button (owner), Leave button, invite form; Dashboard shows "Household: [name]" badge
- [x] **Shared data** — goals/watchlist/transactions queries use `= ANY(uuid[])` to aggregate all household member data; `getHouseholdMemberIds` called in each route

### 9B: Aesthetic Redesign ✅ (core done, polish pending)
> Overhaul visual design from AI-generated HTML-y look to polished product UI.
> Do AFTER household accounts — covers everything in one CSS pass.

- [x] **Design system** — CSS variables (navy palette), Google Fonts (Cormorant Garamond + Outfit), spacing/radius/shadow scale
- [x] **Global styles** — tokens applied to nav, cards, buttons, inputs, badges, tables across all pages
- [x] **Page-by-page pass** — Dashboard, Insights, Expenses, Watchlist, Portfolio, Goals, Login/Register, ChatWidget
- [x] **Motion** — fadeUp page-load animation, card hover lift, FAB hover scale
- [x] **Page title consistency** — Portfolio + Goals now use `.page-header h2`; all pages consistent (Cormorant Garamond, 2rem, weight 400)
- [x] **Insights page title** — added `.page-header` with "Insights" h2
- [x] **Insight cards clickable** — `SOURCE_ROUTE` map (`spending/anomaly→/expenses`, `goals→/goals`, `portfolio/autopilot→/portfolio`, `market/watchlist→/watchlist`); cards with known source show "View →" link

### 9C: Google Auth
> Add Google OAuth sign-in alongside existing email/password.
> Do AFTER aesthetic redesign so login page gets new styles applied once.

- [ ] **Backend** — add Google OAuth strategy (Passport.js or direct token verify); new route `POST /api/v1/auth/google`; exchange Google ID token → issue JWT
- [ ] **Frontend** — add "Sign in with Google" button to Login + Register pages; use `@react-oauth/google` or similar
- [ ] **DB** — `users` table: add `google_id` column (nullable) via migration
- [ ] **Tests** — mock Google token verify in unit test; integration test verifies JWT returned

---

## Phase 10: Documentation & Demo (do last)

- [x] Add Mermaid architecture diagram to README.md
- [ ] **Add Plaid sandbox instructions to README.md** — graders need: how to link an account, sandbox credentials (username/password), and what to expect after linking
- [ ] Write + publish blog post (Medium or dev.to) — 1,500+ words
- [ ] Record 5–10 min screencast
- [ ] Write 500-word individual reflection
- [ ] Submit showcase form

---

## Rubric Scorecard

| Category | Max | Est. Now | Achievable |
|---|---|---|---|
| Application Quality | 40 | 32 | 38 (household accounts + redesign) |
| Claude Code Mastery | 55 | 47 | 50 (2 skills, hooks, .mcp.json, agent, 7/6 agents) |
| Testing & TDD | 30 | 28 | 28 (181 unit/integration + E2E + 89% coverage) |
| CI/CD & Production | 35 | 30 | 32 (Actions + Vercel + Render + secrets) |
| Team Process | 25 | 18 | 20 (Issues, PR, sprints, AI disclosure) |
| Documentation & Demo | 15 | 5 | 13 (diagram done; blog + video pending) |
| **Total** | **200** | **~160** | **~181** |
