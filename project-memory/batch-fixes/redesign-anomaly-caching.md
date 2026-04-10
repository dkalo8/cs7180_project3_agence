# Session 2026-04-10 — 9B Redesign, Anomaly Improvements, Frontend Caching

## 9B: Aesthetic Redesign ✅
- `client/src/index.css`: full design system — CSS variables (navy palette), Google Fonts (Cormorant Garamond display + Outfit body/numbers), spacing/radius/shadow scale
- Page-by-page pass: Dashboard, Insights, Expenses, Watchlist, Portfolio, Goals, Login/Register, ChatWidget
- Severity badges: subtle tinted pills (background tint + colored text) replacing solid fills
- Numeric display fonts: `.dash-hero-value`, `.summary-value`, `.chart-tooltip-value` → `var(--font-body)` weight 600
- Motion: fadeUp page-load animation, card hover lift, FAB hover scale
- Page title consistency: all pages use `.page-header h2` (Cormorant Garamond, 2rem, weight 400)
- 192/192 tests

## Insight Cards Deep-Link Navigation ✅
- `server/orchestrator/index.js`: `tag()` helper tags every insight with `source` field before returning
- `client/src/pages/Insights.js`: `SOURCE_ROUTE` map (spending/anomaly→/expenses, goals→/goals, etc.); `onClick` navigates with `?txId=` (preferred) or `?amount=` (fallback)
- `client/src/pages/Expenses.js`: reads `?txId` + `?amount` URL params; `useRef` + `scrollIntoView` scrolls to matching row; `@keyframes highlight-fade` + `.tx-highlight` animates the matched row
- Orchestrator tests updated to `expect.objectContaining()` (insights now carry extra `source` field)

## Anomaly Agent Improvements ✅
- `server/agents/anomalyAgent.js`:
  - All insight objects now include `txId: tx.id`
  - Duplicate charge key: changed from `merchant|amount|date` to `amount|date` (merchant excluded — often null/inconsistent)
  - Added `repeated_charge` detection: same known merchant + same amount across 2+ different dates → `{ type: 'repeated_charge', severity: 'medium', txId: txs[0].id }`
- 8 anomaly tests passing

## 8H: Frontend Caching ✅
- New `client/src/api/insightsCache.js`: `/insights` cached 5 min in sessionStorage
- New `client/src/api/apiCache.js`: general `getCached(key, endpoint, ttlMs, extract)` + convenience wrappers
  - 5 min TTL: insights, transactions, goals, accounts, household, profile
  - 2 min TTL: portfolio, watchlist, trades, history (price/position-sensitive)
- Dashboard pre-warms all 8 endpoints on mount (fire-and-forget)
- All pages (Portfolio, Goals, Expenses, Watchlist, Settings) read from cache
- Mutations call `invalidate(key)` before re-fetch: trade→portfolio+trades, goal create→goals, household mutations→household
- Build verified clean; deployed to Vercel

## TODO.md Restructure
- Collapsed all completed phases (1–9B) into a summary block
- Remaining work in priority order: 9C Google Auth → 9D News/Watchlist → 9E Nav redesign → polish backlog → Phase 10 docs
- 9D: Finnhub news user-facing in Watchlist page (collapsible per-ticker news feed)
- 9E: Nav dropdowns — Insights (top-level), Money (Expenses+Goals), Markets (Portfolio+Watchlist+News), Account (Settings)
