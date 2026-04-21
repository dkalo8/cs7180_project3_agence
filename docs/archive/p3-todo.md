# Agence — P3 TODO Checklist

**Deadline:** April 21, 2026 | **Points:** 200 | **Current estimate:** ~273 tests, ~99% complete

---

## Pre-Submission Fixes (do first)

- [x] **No emojis** — strip all emojis from About page and AI chat responses
- [x] **Shift+Enter in chat** — newline without send; Enter alone sends
- [x] **Insight filter** — add filter UI or reduce default insight count so feed isn't overwhelming
- [x] **Empty insight guard** — handle case where judge returns empty/null insight gracefully

---

## Phase 11: Bug Fixes & Enhancements (do before Remaining)

- [x] **README: remove Plaid sandbox instructions** — graders use `kalo13@hotmail.com` / `Agence123!` directly; no sandbox setup needed
- [x] **After-hours trade UX** — detect after-hours orders from Alpaca response; show "Order queued — market closed, executes at open" instead of "Order placed"; don't mark as filled until confirmed
- [x] **Ticker autocomplete** — as user types in Portfolio buy/sell + Watchlist add fields, show dropdown of matching tickers from a known symbol list to prevent wrong-stock errors
- [x] **DB migration decision** — migrate to Neon post-P3 (steps in `docs/post-p3.md`); DB fine through deadline

---

## Remaining (do in order)

- [ ] **Blog publish** — draft in `docs/blog-post.md`; publish to LinkedIn/Medium; add URL to showcase form
- [ ] **Screencast** — 5–10 min demo; login → dashboard → insights → expenses → goals → portfolio → watchlist → settings; narrate agent outputs and Claude Code tooling
- [ ] **Showcase form** — submit after blog + video live (project name, Vercel URL, GitHub URL, thumbnail, video link, blog link)

---

## Rubric Scorecard

| Category | Max | Est. Now | Gap / Why Not Max |
|---|---|---|---|
| Application Quality | 40 | 36 | React+Express vs Next.js spec; no Sentry monitoring |
| Claude Code Mastery | 55 | 53 | Worktree ✅ 2 PRs w/ C.L.E.A.R. ✅ — minor gap: skill usage evidence could be richer |
| Testing & TDD | 30 | 28 | TDD red-before-green not always explicit in commit messages |
| CI/CD & Production | 35 | 33 | 4 security gates ✅; no Sentry/structured logging |
| Team Process | 25 | 22 | Solo project — peer evaluations structurally N/A (rubric designed for pairs) |
| Documentation & Demo | 15 | 9 | Sprint docs + README + reflection done ✅; blog + video still pending (-5) |
| **Subtotal** | **200** | **~181** | |
| **Bonus** | **+10** | **+10** | fast-check ✅ (+3) + Stryker ✅ (+3) + Agent SDK ✅ (+4) |
| **Total** | **210** | **~191** | **~200 when blog published + video recorded** |

---

## Completed ✅

### Phases 1–7: Core Build
- Agent layer: spendingAgent, anomalyAgent, goalsAgent, portfolioAgent, marketContextAgent, autopilotAgent, watchlistAgent
- Backend: Express API, PostgreSQL, JWT auth, all routes, orchestrator + LLM-as-judge
- Frontend: React Router, auth flow, all pages, Plaid Link
- Claude Code: 2 custom skills (add-agent v1→v2, run-insights), hooks, `.mcp.json`, insight-reviewer sub-agent
- CI/CD: GitHub Actions (lint/test/coverage/security/E2E/AI review), Render + Vercel deploy, detect-secrets
- Testing: unit + integration + E2E (Playwright), 70% coverage threshold enforced
- Team process: branch workflow, Issues #1–5, PRs #6–#7, 4 sprints, AI disclosure, C.L.E.A.R. reviews

### Phase 8: UX/UI Polish
- **8A** Dashboard redesign — equity hero, AreaChart, accounts table, insights rail
- **8B** Expenses page — category bars + transaction table + period filter
- **8C** Watchlist — add/remove tickers, real-time prices + 24h change
- **8D** AI Chat assistant — Claude Sonnet 4.6, floating FAB, financial context injected
- **8E** Bug fixes — trade 431 error, Alpaca auth, chat context, account balance display
- **8F** Watchlist real-time prices — Alpaca snapshots, green/red coloring
- **8G** Polish — trade history tab, order types, empty states, settings page, goal progress rail
- **8H** Frontend caching — `apiCache.js` sessionStorage cache, Dashboard pre-warms all 8 endpoints

### Phase 9A: Household Accounts
- DB migration, backend routes (13 tests), frontend invite/leave/remove, shared data queries
- `active_view` persisted in DB; Settings toggle; Dashboard badge conditional on `activeView === 'household'`

### Phase 9B: Aesthetic Redesign
- Design system (navy palette, Cormorant Garamond + Outfit), full page-by-page pass, motion
- Clickable insight cards with deep-link navigation to source transactions
- Anomaly detection: large transactions, duplicate charges, repeated identical charges (txId tagging)

### Phase 9C: Google Auth
- `POST /api/v1/auth/google`; google-auth-library token verify; find-or-create-or-link user
- `@react-oauth/google` on Login + Register; `invalidateAll()` on logout clears cross-account cache

### Phase 9D: Watchlist News Feed
- `GET /api/v1/news?tickers=...` — Finnhub, Promise.all per ticker, 7 articles/ticker
- Collapsible "Recent News" section in Watchlist.js; 2-min TTL cache; per-ticker expand

### Phase 9E: Nav Redesign
- CSS-only hover dropdowns; Money▾ (Expenses, Goals), Markets▾ (Portfolio, Watchlist)

### Phase 9F: Password Reset
- `POST /api/v1/auth/forgot-password` + `POST /api/v1/auth/reset-password`; JWT reset token (1h)
- SendGrid HTTPS API primary; console.log fallback in dev

### Step 5: Polish Backlog
- Responsive CSS, dashboard balance wiring, goal types + drag-and-drop ordering
- Investor risk profile → autopilot rules, account selection, watchlist insight filtering
- Watchlist + portfolio deep-links from Insights, household view toggle

### Step 5b: Code Review Fixes
- helmet, rate limiting, ownership filter on goal updates, axios CVE patch, retry interceptor guard
- PlaidLink async/await, goal reorder optimistic restore, password ≥ 8 chars enforced

### About Page
- Hero + vision, 4-step how-it-works, 6 agent cards, nav guide, tech stack. Public route `/about`.

### Phase 10: Documentation & Demo Prep
- **10A** `feat/phase10-docs` worktree → PR #7 merged; literal parallel dev + worktree evidence
- **10B** sprint-3.md + sprint-4.md created; sprint-1/2 reviewed (accurate)
- **10C** README: Plaid sandbox instructions, Mermaid diagram updated (7 agents), test count updated
- **10D** Blog post drafted (`docs/blog-post.md`, 1,600+ words)
- **10E** Individual reflection written (`docs/reflection.md`, 547 words)

### Bonus (+10 pts)
- **fast-check (+3)** — 17 property-based tests in `agents/agents.property.test.js` (spendingAgent 5, anomalyAgent 5, goalsAgent 7)
- **Stryker (+3)** — mutation score **74.64%** overall (spendingAgent 85.71%, anomalyAgent 71.60%, goalsAgent 65.52%); `npm run mutation`
- **Agent SDK (+4)** — `POST /api/v1/chat` tool-use agent loop; 5 tools, MAX_TOOL_ROUNDS=5, parallel execution; 10 tests; rollback tag `v1-pre-agent-sdk`

### Bug Fixes & Security (post-Phase 10)
- duplicate_charge deep-link: routes to `?amount=X&date=Y`; highlights ALL matching rows
- repeated_charge deep-link: routes to `?merchant=X&amount=Y`; highlights all same-merchant rows
- Judge metadata stripping fixed: `metaByMessage` lookup preserves type/txId/amount/date through LLM
- Dashboard today P&L: uses `account.last_equity` (Alpaca yesterday close) instead of history diff
- Negative Plaid amounts: `Math.abs()` on all anomalyAgent insight amounts and messages
- Security gate #4: `detect-secrets` scan added to CI security job
- OWASP Top 10 awareness documented in `CLAUDE.md` (A01–A09 + CI gates)
- C.L.E.A.R. review comments + AI disclosure posted on PR #6 and PR #7
