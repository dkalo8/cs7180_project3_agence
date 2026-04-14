# Sprint 3 — Planning & Retrospective

**Dates:** 2026-04-08 – 2026-04-10
**Goal:** UX/UI overhaul, household accounts, aesthetic design system, and frontend caching layer.

---

## Sprint Planning

### Scope Selected
- **Phase 8A–8H**: Full UI/UX rebuild — dashboard equity hero, expenses page, watchlist with real-time prices, AI chat widget, trade history, settings, goal progress, and frontend caching
- **Phase 9A**: Household account system — invite/accept/leave/remove, shared transaction + goal queries
- **Phase 9B**: Aesthetic redesign — navy design system, typography, motion, anomaly improvements, insight deep-links
- **Phase 9C** (start): Google OAuth integration

### Approach
- UX pages built feature-by-feature, each verified on Vercel before moving on (localhost CORS conflict prevents local testing)
- Household data must not bleed into personal view — DB queries parameterized by user ID set
- Design system tokens first, then page-by-page pass
- Frontend caching added last — least invasive, greatest leverage (pre-warms all 8 endpoints on dashboard mount)

### Definition of Done
- All new pages render correctly on Vercel production
- 192+ tests passing, lint clean
- No regression in existing agent output or orchestrator

---

## Async Standups (Solo)

**2026-04-08** — Starting Phase 8. Dashboard is the most visible page — rebuilding equity hero, AreaChart, account table first. Will wire real-time Alpaca history endpoint.

**2026-04-09** — Dashboard, Expenses, Watchlist, Chat done. Moving to household accounts (9A) and aesthetic redesign (9B). Will do full page-by-page design pass once household is working.

**2026-04-10** — 9A + 9B complete and deployed. Starting frontend caching (8H) to solve slow load on every route change. Then 9C Google Auth.

---

## Sprint Retrospective

### What Was Built

#### Phase 8A — Dashboard Redesign
- New `PortfolioChart.js` with Recharts `AreaChart`, period selectors (1M/3M/6M/1Y)
- `GET /api/v1/portfolio/history` via Alpaca paper — equity history by period
- Dashboard: 2-col grid, equity hero value, accounts table, holdings summary, AI insights rail
- CORS: explicit allowlist (localhost:3000 + agence-flame.vercel.app)

#### Phase 8B — Expenses Page
- New `GET /api/v1/transactions` with backend category summary
- `Expenses.js`: category bar chart, transaction table, period filter (All / 1M / 3M / 6M)
- Bug: `tx.date` is full ISO string — truncated to `YYYY-MM-DD` for display

#### Phase 8C — Watchlist
- `watchlist` DB table, `queries.js`: add/get/remove
- `GET/POST/DELETE /api/v1/watchlist` (auto-upcases ticker)
- `watchlistAgent.js`: mover ≥3% → `watchlist_mover`, negative sentiment → `watchlist_sentiment`
- `Watchlist.js`: add ticker form, table with remove, empty state
- Alpaca snapshots: real-time price + 24h change, green/red coloring

#### Phase 8D — AI Chat Widget
- `POST /api/v1/chat`: loads portfolio/accounts/goals/transactions in parallel, injects as Claude Sonnet 4.6 system prompt, multi-turn history
- `ChatWidget.js`: floating 💬 FAB bottom-right, collapsible popup, persists across navigation via `AuthShell` in `App.js`
- `react-markdown` + `remark-gfm`: tables, bold, lists render in chat bubbles

#### Phase 8E–8G — Bug Fixes + Polish
- Alpaca auth fix: `ALPACA_KEY_ID || ALPACA_API_KEY` env var resolution
- Trade history tab on Portfolio, order types (market/limit), settings page, goal progress on dashboard
- Shared `AppNav.js` component replacing per-page nav stubs
- Production fix: portfolio 500 → graceful empty-positions fallback

#### Phase 8H — Frontend Caching
- `apiCache.js`: `getCached(key, endpoint, ttlMs)` + sessionStorage; 5-min TTL for insights/transactions/goals/accounts; 2-min TTL for portfolio/watchlist/prices
- `insightsCache.js`: `/insights` cached 5 min
- Dashboard pre-warms all 8 endpoints on mount (fire-and-forget)
- All pages read from cache; mutations call `invalidate(key)` before re-fetch

#### Phase 9A — Household Accounts
- DB migration: `households`, `household_members` tables with `role` (owner/member)
- Backend routes: `POST /households` (create), `POST /households/invite`, `POST /households/accept`, `DELETE /households/leave`, `DELETE /households/members/:memberId`
- Shared data queries: `getTransactionsByUserId` + `getGoalsByUserId` accept array of user IDs for household view
- `Settings.js`: Household panel — create, invite by email, view members, leave/remove

#### Phase 9B — Aesthetic Redesign
- CSS variables: full navy palette (`--navy-950` → `--navy-100`), spacing scale, radius, shadow
- Typography: Cormorant Garamond (display/headings) + Outfit (body/numbers) via Google Fonts
- Page-by-page pass: Dashboard, Insights, Expenses, Watchlist, Portfolio, Goals, Login/Register, ChatWidget
- Motion: `fadeUp` page-load animation, card hover lift, FAB hover scale
- Severity badges: tinted pills (background tint + colored border-left)
- Anomaly agent: `txId` on all insights, `repeated_charge` detection (same merchant+amount across 2+ dates)
- Insight deep-links: `SOURCE_ROUTE` map in Insights.js; click navigates with `?txId=` / `?amount=` params; Expenses.js scrolls + highlights matching row

### What Went Well
- Recharts AreaChart wired cleanly to Alpaca portfolio history in one session
- CSS variable system made the full page-by-page pass systematic and fast
- Household DB design (separate members table with role) kept shared-data queries clean and additive
- Frontend caching layer required no backend changes — pure client-side optimization

### What Could Be Improved
- CORS localhost conflict remained unresolved — all UI verification on Vercel adds friction (deploy → wait → verify loop)
- Alpaca auth env var naming mismatch (`ALPACA_API_KEY` in Render vs `ALPACA_KEY_ID` in code) caused silent failures until POST /orders surfaced it
- Dashboard pre-warm fires 8 parallel requests — could be staggered to avoid Render cold-start queue

### Velocity
- ~14 hours across 3 days
- ~20 commits, all conventional format
- Test count: 118 → 192 (+74 tests)

---

## AI Disclosure
This sprint used Claude Code (Claude Sonnet 4.6) via Claude Code CLI for:
- Scaffolding all new pages, components, and routes
- Implementing the CSS design system tokens and full page redesign
- Household DB schema and query design
- Frontend caching architecture (apiCache.js strategy)

All feature decisions, UX choices, design direction, and code review were performed by the human author.
