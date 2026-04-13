# Step 5 Polish Backlog

_Session: 2026-04-13 (multi-session)_

## What Was Built

### Goal Types (badge)
- Added `goal_type` column to goals table via migrate.js (`VARCHAR(20) DEFAULT 'savings'`)
- `VALID_GOAL_TYPES = new Set(['savings', 'growth', 'speculation'])` in routes/goals.js
- Goals.js: `<select className="form-select">` for type on create; badge rendered per goal
- CSS: `.goal-type-badge`, `.goal-type-savings` (blue), `.goal-type-growth` (green), `.goal-type-speculation` (amber) pill styles

### Drag-and-Drop Goal Ordering
- DB: `goals.position INTEGER DEFAULT 0` column in migrate.js
- `reorderGoals(userId, orderedIds)` in queries.js — sequential UPDATE per index
- `PATCH /goals/reorder` route — validates array, calls reorderGoals
- Goals.js: HTML5 drag API (`draggable`, `onDragStart/Enter/End`); optimistic state reorder; `invalidate('goals')` + background PATCH
- CSS: `.goal-draggable { cursor: grab }`, `.goal-drag-over { border-color: var(--navy-400) }`
- Fix: `invalidate('goals')` was missing → order didn't persist on reload (stale 5-min cache)
- Fix: `getGoalsByUserId` ORDER BY changed to `position ASC, created_at ASC`

### goalsAgent snake_case fix
- Agent was destructuring `monthlyContribution` (camelCase) but DB rows return `monthly_contribution`
- Fix: reads both names; wraps in `Number(contrib)` to handle Postgres numeric strings (`"300.00"`)

### Watchlist Insight Filtering
- Removed `watchlist_quote` catch-all insight (emitted for every ticker — too noisy)
- Added positive sentiment: `article.sentimentScore > 0.7` → `watchlist_sentiment` insight with `severity: 'info'`
- Severity thresholds: price move ≥8% → high, ≥3% → medium; negative sentiment → medium; positive → info

### Watchlist Deep-Link from Insights
- Insights.js: `base && insight.ticker ? \`${base}?ticker=${insight.ticker}\` : base`
- Watchlist.js: reads `?ticker=` from URL, attaches `ref` + `tx-highlight` CSS animation to matched row, scrolls on load

### Investor Risk Profile (Settings)
- DB: `users.risk_tolerance VARCHAR(20) DEFAULT 'moderate'` in migrate.js
- `updateRiskTolerance(userId, riskTolerance)` in queries.js
- `GET /me` returns `riskTolerance`; `PATCH /me` validates + updates it
- Settings.js: pill radio buttons (conservative / moderate / aggressive) + Save
- autopilotAgent: `RISK_THRESHOLDS` map per level; reads `userData?.riskTolerance || 'moderate'`

### Account Selection (Plaid active account filter)
- DB: `users.active_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL` in migrate.js
- `updateActiveAccount(userId, accountId)` in queries.js; `PATCH /me` accepts `activeAccountId`
- `getTransactionsByUserId(userIds, accountId = null)` — optional `AND account_id = $2` filter
- transactions.js route: fetches user in parallel, passes `active_account_id` to query
- insights.js: filters transactions client-side to `active_account_id` before passing to agents
- Settings.js: clickable account rows with custom radio indicator; click toggles active; "Clear selection" link

### PlaidLink on Settings (add additional accounts)
- PlaidLink.js: added `label` prop
- Settings.js: added `PlaidLink` button under Linked Bank Accounts with `label="Connect another bank"` and `onSuccess` that invalidates + refreshes account list

### Household activeView Toggle
- DB: `users.active_view VARCHAR(20) DEFAULT 'personal'` in migrate.js
- `updateActiveView(userId, view)` in queries.js
- `GET /me` returns `activeView`; `PATCH /me` validates `personal|household`, calls `updateActiveView`
- Settings.js: Personal/Household toggle buttons appear when household exists; saves on click; seeds from profile
- Dashboard.js: fetches profile on mount; household badge conditionally on `activeView === 'household'`

### Portfolio Dropdown Fix
- Root cause: `.page main select` selector was applying custom chevron SVG to Portfolio's inline-styled selects; `padding` shorthand in inline style overrode `padding-right: 2.2rem` → text overlapped arrow
- Fix: changed CSS selector to `.form-select` (opt-in); Goals.js goalType select uses `className="form-select"`; Portfolio selects now also use `className="form-select"` (inline padding removed, class handles padding)

### CSS opt-in select class
- `.form-select`: `appearance: none`, custom chevron SVG, `background-position: right 0.85rem center`, `padding-right: 2.2rem`
- Changed from `.page main select` to `.form-select` to avoid scoping conflicts

## Tests Added / Fixed
- `auth.test.js`: 2 new tests — `activeView` update (household), invalid `activeView` (400)
- `insights.test.js`: added `queries.getUserById.mockResolvedValue(...)` to beforeEach (was returning undefined → runJudge called 0 times)
- `transactions.test.js`: added `queries.getUserById.mockResolvedValue(...)` to beforeEach
- `queries.test.js`: `getUserById` test regex fixed from `/SELECT.*FROM users/i` to `/SELECT[\s\S]*FROM users/i` (multiline SQL)
- `autopilotAgent.test.js`: renamed old "cycle 5 edge cases" to "cycle 6" after adding new risk tolerance cycle 5

## Test Count
244/244 passing across 24 test suites
