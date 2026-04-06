# Routes, Services, and Frontend Completion

## What was done

Completed all remaining backend routes, external API service wrappers, and frontend pages. The application now has a fully functional backend and a polished frontend.

---

### Backend Services

#### `server/services/plaid.js` (new)
- Wraps Plaid SDK v41: `createLinkToken`, `exchangePublicToken`, `getTransactions`, `getBalances`
- Configured for sandbox environment via `PLAID_ENV`, `PLAID_CLIENT_ID`, `PLAID_SECRET`

#### `server/services/alpaca.js` (updated)
- Added `placeOrder(ticker, action, quantity)` using Alpaca `createOrder` with `type: 'market'`, `time_in_force: 'day'`
- Paper mode (`paper: true`) hardcoded — never real money

---

### Backend Routes

#### `server/routes/accounts.js` (implemented, was stub)
- `POST /api/v1/accounts/link-token` — calls `plaidService.createLinkToken(userId)`, returns `{ link_token }`
- `POST /api/v1/accounts/exchange` — exchanges public token, fetches transactions + balances in parallel, saves to DB
- Maps Plaid transaction fields → DB format (`plaidTransactionId`, `merchantName`, `category` from `personal_finance_category.primary`)
- 6 TDD tests

#### `server/routes/portfolio.js` (implemented, was stub)
- `GET /api/v1/portfolio` — fetches Alpaca positions + account in parallel, returns `{ positions, cash, equity }`
- Maps Alpaca fields: `symbol→ticker`, `avg_entry_price→avgCost`, `unrealized_plpc→unrealizedPLPct * 100`
- 5 TDD tests

#### `server/routes/trades.js` (implemented, was stub)
- `POST /api/v1/trades` — validates `ticker/action/quantity`, calls `alpacaService.placeOrder`, saves to DB via `queries.createTrade`
- `GET /api/v1/trades` — returns trade history for authenticated user
- 8 TDD tests

#### `server/routes/goals.js` (new)
- `GET /api/v1/goals` — returns goals for authenticated user
- `POST /api/v1/goals` — creates a goal with `name`, `target`, `monthlyContribution`
- Registered in `server/index.js` at `/api/v1/goals`
- 6 TDD tests

---

### Frontend

#### `client/src/components/PlaidLink.js` (new)
- Uses `react-plaid-link` (`usePlaidLink` hook)
- Fetches link token from `/accounts/link-token` on mount
- On Plaid success: calls `/accounts/exchange` with `public_token`
- Shows "Connect Bank Account" button, disabled until ready

#### `client/src/pages/Goals.js` (implemented, was placeholder)
- Form: name, target amount, monthly contribution
- Progress bar per goal: `current/target` percentage, color green when complete
- Pace label: "~N months to go" based on `monthly_contribution`
- Calls `GET /goals` on mount, `POST /goals` on submit

#### `client/src/pages/Portfolio.js` (implemented, was placeholder)
- Calls `GET /portfolio`, displays equity + cash summary cards
- Positions table: ticker, qty, avg cost, price, market value, unrealized P&L, return %
- `.gain` (green) / `.loss` (red) CSS classes for P&L columns

#### `client/src/pages/Dashboard.js` (updated)
- Added PlaidLink button above the dashboard cards
- Shows "Bank account connected!" confirmation on success

#### `client/src/index.css` (updated)
- Added `.plaid-link-btn` styles (dark button, hover state, disabled state)
- All other styles: dark nav, card grid, severity badges, portfolio table, auth pages

---

### Test Results
- **143/143 passing**, 18 test suites (up from 118/15 at session start)
- New test files: `accounts.test.js`, `trades.test.js`, `goals.test.js`
- All test files have `// pragma: allowlist secret` on JWT_SECRET lines to pass detect-secrets hook

---

### Recurring Issue: detect-secrets false positives
- Every new test file with `process.env.JWT_SECRET = 'test-secret'` triggers the pre-commit hook
- Fix: add `// pragma: allowlist secret` inline comment on the JWT_SECRET line, then regenerate `.secrets.baseline` with `detect-secrets scan --exclude-files 'package-lock\.json' --exclude-files 'node_modules/' > .secrets.baseline`
