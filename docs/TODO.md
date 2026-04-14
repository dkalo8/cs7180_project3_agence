# Agence — P3 TODO Checklist

**Deadline:** April 21, 2026 | **Points:** 200 | **Current estimate:** ~192/192 tests, ~90% complete

> Remaining work ordered by priority. Completed phases collapsed below.

---

## Remaining Work (do in order)

### 1. 9C: Google Auth ✅
- [x] Backend — `POST /api/v1/auth/google`; google-auth-library token verify; find-or-create user; link google_id to existing email accounts
- [x] DB — `google_id VARCHAR UNIQUE`, `password_hash` NOT NULL dropped in migrate.js
- [x] Frontend — `@react-oauth/google`; `GoogleLogin` on Login + Register; `GoogleOAuthProvider` in index.js
- [x] Tests — 5 tests (mock google-auth-library); 197 total passing
- [x] UX — "Sign-in: Google / Email+password" row in Account profile; Sign out removed from nav (Account page only); `invalidateAll()` on logout to clear cross-account cache

### 2. E2E CI Fix ✅
- [x] Added backend warm-up step to `.github/workflows/ci.yml` — polls `/health` up to 12× (15s apart, max 3 min) before running Playwright; fixes Render cold-start timeouts

### 3. 9D: Watchlist News Feed ✅
- [x] **Backend** — `GET /api/v1/news?tickers=AAPL,TSLA` — `finnhub.getNewsArticles()`, Promise.all per ticker, graceful fallback to `[]`; 6 tests (214 total)
- [x] **Frontend** — collapsible "Recent News" section at bottom of `Watchlist.js`; 5 articles per ticker; links open in new tab; loads after watchlist fetch
- [x] **Cache** — `getNews(tickers)` in `apiCache.js` with 2-min TTL; cache key includes ticker list

### 3. 9E: Nav Redesign (dropdown grouping) ✅
- [x] Logo → `/`, Insights (top-level), Money▾ (Expenses, Goals), Markets▾ (Portfolio, Watchlist), Account
- [x] CSS-only hover dropdowns with opacity/visibility transition and invisible bridge padding
- [x] E2E selectors unchanged — tests only reference `.nav` and `link[Insights]`

### 4. 9F: Password Reset ✅
- [x] **Backend** — `POST /api/v1/auth/forgot-password` (JWT reset token, Resend email, always 200 — no email-exists leak); `POST /api/v1/auth/reset-password` (verify token type + expiry, bcrypt hash update)
- [x] **Email** — Resend package; falls back to `console.log` reset URL if `RESEND_API_KEY` not set (dev-friendly)
- [x] **Frontend** — "Forgot password?" on Login → `/forgot-password`; `/reset-password?token=...` with success redirect to login
- [x] **Tests** — 9 new tests (400/401/200 cases, expired token, wrong type); 223/223 total

### 5. Polish backlog (in priority order)
- [x] **Responsive CSS** — mobile breakpoints across all pages (highest visibility, affects every page)
- [x] **Dashboard balance wiring** — after buying stock, dashboard should reflect updated equity, positions, and sparkline
- [x] **Goal types** — add `goal_type` column (savings/growth/speculation); display type badge
- [x] **Drag-and-drop goal ordering** — let user set goal priority via drag-and-drop on Goals page
- [x] **Investor risk profile** — settings field for risk tolerance (conservative/moderate/aggressive); feed into autopilot agent rules
- [x] **Account selection** — multiple Plaid accounts supported; active account filter persisted in DB; Settings page lets user select/clear active account; PlaidLink on Settings to add more accounts
- [x] **Watchlist insight filtering** — removed noisy catch-all `watchlist_quote`; added positive-sentiment `watchlist_sentiment` (info); price-move severity tiers (≥8% high, ≥3% medium)
- [x] **Watchlist deep-link from Insights** — clicking watchlist insight navigates to `/watchlist?ticker=X`; Watchlist scrolls to + highlights the row
- [x] **Household badge visibility + view toggle** — `active_view` persisted in DB (`personal`|`household`); Settings toggle; Dashboard badge only shows when `activeView === 'household'`
- [x] **Portfolio dropdown arrows** — Portfolio selects now use `.form-select` opt-in class (consistent chevron, no padding-right conflict)

### 5b. Code Review Fixes ✅

- [x] **Fix 1** — marketContextAgent single-param refactor; 20 tests updated; orchestrator call was already correct
- [x] **Fix 2** — Orchestrator test: add watchlistAgent mock, `watchlist` in return-shape assertion, data-routing assertion
- [x] **Fix 3** — `invalidateInsightsCache()` called after mutations in Goals, Portfolio, Watchlist, Settings
- [x] **Fix 4** — Retry interceptor guards GET/HEAD/OPTIONS only (no more POST retries → no duplicate trades)
- [x] **Fix 5** — PlaidLink: .then() → async/await with `cancelled` cleanup flag
- [x] **Fix 6** — Goals reorder: store `previous`, restore on `.catch()` 
- [x] **Fix 7** — `helmet` installed + `app.use(helmet())` in server/index.js
- [x] **Fix 8** — Password ≥ 8 chars enforced on register + reset-password; 2 new tests (246 total)
- [x] **Fix 9** — `updateGoalCurrent(userId, goalId, current)` adds `AND user_id = $3` ownership filter
- [x] **Fix 10** — axios updated to 1.15.0 in both server/ and client/ (patches CVSS 10.0 SSRF CVE)
- [x] **Fix 11** — `express-rate-limit`: auth routes 10 req/15 min; insights+chat 60 req/min; skipped in test env

---

- [x] **About page** — hero + vision, 4-step how-it-works, 6 agent cards (icon/source/what/why), nav guide, tech stack. Public route `/about`, top-level nav link next to Insights.

### 5. Phase 10: Documentation & Demo (deadline-sensitive)

#### 10A: Parallel Dev + Second PR (covers p3 rubric gaps)
- [x] **Create `feat/phase10-docs` worktree** — `git worktree add ../agence-phase10 -b feat/phase10-docs`; do all Phase 10 doc work on this branch (gives literal worktree evidence + 2nd feature branch)
- [x] **Merge PR #7** (`feat/phase10-docs` → main) — open at github.com/dkalo8/agence-finance-copilot/pull/7; merge after blog + reflection added to branch

#### 10B: Sprint Docs
- [x] **Create sprint-3.md** — phases 8A–8H, 9A household, 9B aesthetic redesign; planning, retro, 3 standup entries, AI disclosure
- [x] **Create sprint-4.md** — 9C Google Auth, 9D news, 9E nav, 9F password reset, Step 5, 5b, About; planning, retro, 3 standup entries, AI disclosure
- [x] **Review sprint-1.md + sprint-2.md** — both accurate; no changes needed

#### 10C: README
- [x] **Add Plaid sandbox instructions** — `user_good` / `pass_good`, step-by-step link flow, what to expect
- [x] **Architecture diagram** — Mermaid diagram already present; updated to 7 agents (watchlistAgent added)

#### 10D: Blog Post
- [x] **Draft written** — `docs/blog-post.md` in `feat/phase10-docs` branch; 1,600+ words covering problem, architecture, LLM-as-judge, Claude Code workflow, caching lesson, marketContextAgent incident
- [ ] **Publish** — in LinkedIn; add published URL to PR #7 description and showcase form

#### 10E: Demo + Reflection
- [ ] **Record 5–10 min screencast** — show: login → dashboard → insights → expenses → goals → portfolio → watchlist → settings; narrate agent outputs and Claude Code tooling
- [x] **Individual reflection written** — `docs/reflection.md` in `feat/phase10-docs` branch; 547 words on multi-agent review insight, hooks feedback loop, Claude's limits

#### 10F: Submit
- [ ] **Submit showcase form** — project name, Vercel URL, GitHub URL, thumbnail, video link, blog link

---

### Bonus (+10 pts available)

- [x] **fast-check property tests (+3)** — 17 property-based tests in `server/agents/agents.property.test.js`; covers spendingAgent (5), anomalyAgent (5), goalsAgent (7); run via `npm test`
- [x] **Stryker mutation testing (+3)** — `stryker.config.json` targets 3 core agents; `npm run mutation`; score ~67% (spendingAgent 85.7%, goalsAgent 67.2%, anomalyAgent 50.6%); HTML report at `reports/mutation/mutation.html`
- [ ] **Agent SDK upgrade (+4)** — convert `POST /api/v1/chat` from single system-prompt call to tool-use agent loop with tools: `get_transactions`, `get_portfolio`, `get_goals`, `get_insights`

### Next Steps (post-submission improvements)

- [x] **duplicate_charge deep-link bug** — clicking insight now routes to `?amount=X&date=Y`; Expenses.js highlights ALL rows matching that amount+date, not just one txId. `anomalyAgent` insight now includes `date` field.
- [ ] **Improve anomalyAgent mutation score** — add exact-message assertions in `anomalyAgent.test.js` to kill surviving string-template mutants; target: 70%+
- [ ] **Agent SDK chat upgrade** — see bonus above (+4)
- [ ] **Blog publish + screencast** — publish blog post to LinkedIn/Medium; record 5–10 min demo; submit showcase form

---

## Rubric Scorecard

| Category | Max | Est. Now | Gap / Why Not Max |
|---|---|---|---|
| Application Quality | 40 | 36 | React+Express vs Next.js spec; no Sentry monitoring |
| Claude Code Mastery | 55 | 53 | Worktree ✅ 2 PRs w/ C.L.E.A.R. ✅ — minor gap: skill usage evidence could be richer |
| Testing & TDD | 30 | 28 | TDD red-before-green not always explicit in commit messages |
| CI/CD & Production | 35 | 32 | No tsc (JS project, N/A) + no Sentry/structured logging |
| Team Process | 25 | 22 | Solo project — peer evaluations structurally N/A (rubric designed for pairs) |
| Documentation & Demo | 15 | 9 | Sprint docs + README + reflection done ✅; blog + video still pending (-5) |
| **Total** | **200** | **~180** | **~189 when blog published + video recorded** |

---

## Completed ✅

### Phases 1–7 (core build)
- Agent layer: spendingAgent, anomalyAgent, goalsAgent, portfolioAgent, marketContextAgent, autopilotAgent, watchlistAgent
- Backend: Express API, PostgreSQL, JWT auth, all routes, orchestrator + LLM-as-judge
- Frontend: React Router, auth flow, all pages, Plaid Link
- Claude Code: 2 custom skills, hooks, `.mcp.json`, sub-agent
- CI/CD: GitHub Actions (lint/test/security/AI review), Render + Vercel deploy, detect-secrets
- Testing: 192 tests (unit + integration + E2E), 89% coverage
- Team process: branch workflow, Issues #1–5, PRs, 2 sprints, AI disclosure

### Phase 8: UX/UI Polish
- **8A** Dashboard redesign — equity hero, AreaChart, accounts table, insights rail
- **8B** Expenses page — category bars + transaction table + period filter
- **8C** Watchlist — add/remove tickers, real-time prices + 24h change
- **8D** AI Chat assistant — Claude Sonnet 4.6, full financial context, floating FAB
- **8E** Bug fixes — trade 431 error, Alpaca auth, chat context, account balance display
- **8F** Watchlist real-time prices — Alpaca snapshots, green/red coloring
- **8G** Polish — trade history tab, order types, empty states, settings page, goal progress rail
- **8H** Frontend caching — `apiCache.js` sessionStorage cache, Dashboard pre-warms all 8 endpoints

### Phase 9A: Household Accounts
- DB migration, backend routes (13 tests), frontend invite/leave/remove, shared data queries

### Phase 9B: Aesthetic Redesign
- Design system (navy palette, Cormorant Garamond + Outfit), full page-by-page pass, motion
- Page title consistency, clickable insight cards with deep-link navigation to source transactions
- Anomaly detection: large transactions, duplicate charges, repeated identical charges (txId tagging)
