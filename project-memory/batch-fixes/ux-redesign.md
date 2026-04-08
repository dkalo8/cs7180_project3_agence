# Session 2026-04-08 — Phase 9 UX/UI

## 9A: Dashboard Redesign ✅
- Dashboard.js rewritten: 2-col grid, equity hero, Recharts AreaChart, accounts table, holdings, insights rail
- New PortfolioChart.js: 1M/3M/6M/1Y period selectors
- New GET /api/v1/portfolio/history + getPortfolioHistory() in alpaca service
- CORS: explicit allowlist (localhost:3000 + agence-flame.vercel.app)
- Client baseURL: dev = localhost:5000/api/v1, prod = REACT_APP_API_URL
- 147 → now 152 tests

## 9B: Expenses Page ✅
- New GET /api/v1/transactions: raw transactions + backend category summary
- New Expenses.js: client-side category bars + transaction table + period filter
- Bug fix: categories computed client-side (not from backend hardcoded current-month); default period = "All" so Plaid sandbox older transactions show
- Wired /expenses in App.js + AppNav
- 152/152 tests

## Local dev CORS — unresolved
- CRA proxy + Express CORS conflict in user's env (shell REACT_APP_API_URL interference)
- All UI verification done on Vercel (agence-flame.vercel.app) + Render

- Bug fixes: tx.date is full ISO string from DB → use new Date(tx.date); date display truncated to YYYY-MM-DD
- Label fix: "This Month" → "1M". User added "1 Year" + spelled-out labels (1 Month / 3 Months / 6 Months / 1 Year).

## 9C: Watchlist ✅
- watchlist DB table via migrate.js (idempotent, runs on server startup)
- queries.js: addToWatchlist, getWatchlistByUserId, removeFromWatchlist
- server/routes/watchlist.js: GET/POST/DELETE /api/v1/watchlist (upcases ticker)
- server/agents/watchlistAgent.js: pure fn; mover ≥3% → watchlist_mover, neg sentiment → watchlist_sentiment
- orchestrator: watchlistAgent added to Promise.all (7 agents total)
- Watchlist.js: add ticker form, table with remove button, empty state
- AppNav: /watchlist link added
- 167/167 tests

## 9D: AI Chat Assistant ✅
- server/routes/chat.js: POST /api/v1/chat — loads portfolio/accounts/goals/transactions in parallel, injects as Claude Sonnet 4.6 system prompt, multi-turn history support
- ChatWidget.js: floating 💬 FAB bottom-right, collapsible popup, persists across navigation via AuthShell in App.js
- react-markdown + remark-gfm: tables, bold, lists render properly in bubbles
- Assistant bubbles stretch full width; last table column white-space: nowrap (no number breaking)
- Removed Chat.js page + /chat route — chat is now a widget not a page
- CI fixes: coveragePathIgnorePatterns excludes services/ and migrate.js; E2E test updated for new dashboard (no h2 "Welcome back")
- 173/173 tests

## Next: 9E Polish Pass
- Trade history tab on Portfolio.js
- Empty states with CTAs
- Settings page
- Goal progress on dashboard
- Responsive CSS
