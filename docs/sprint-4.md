# Sprint 4 — Planning & Retrospective

**Dates:** 2026-04-10 – 2026-04-14
**Goal:** Advanced auth, watchlist news, nav overhaul, password reset, Step 5 polish, security hardening, and About page.

---

## Sprint Planning

### Scope Selected
- **Phase 9C**: Google OAuth — find-or-create user, link to existing email accounts
- **Phase 9D**: Watchlist news feed — Finnhub per-ticker news, AI summary, caching
- **Phase 9E**: Nav redesign — dropdown grouping (Money▾, Markets▾)
- **Phase 9F**: Password reset — JWT reset token, email delivery via SendGrid
- **Step 5 Polish**: goal types, drag-and-drop reordering, risk tolerance, account selection, household view toggle, portfolio dropdown fix
- **5b Code Review**: Multi-agent parallel review → 11 targeted fixes
- **About page**: public `/about` route explaining architecture, agents, and nav guide

### Approach
- Google Auth: `google-auth-library` token verify server-side; find-or-create covers 3 cases (existing Google, existing email, new user)
- Watchlist news: Finnhub per-ticker, Promise.all, sessionStorage cache per ticker (not per list)
- Password reset: JWT with separate secret + type field; SendGrid HTTPS (Render blocks SMTP ports)
- Code review: parallel multi-agent review (security, architecture, tests, frontend) → fixes in priority order
- All work on `feat/phase10-docs` worktree branch; merged via PR #7

### Definition of Done
- 246 tests passing across all suites
- All 11 code review fixes verified by second parallel review pass
- About page pixel-verified on desktop + mobile (375px)
- `npm run lint && npm test` clean before every commit

---

## Async Standups (Solo)

**2026-04-10** — 9C Google Auth done and deployed. Starting 9D watchlist news feed + Finnhub SDK v2 fix.

**2026-04-13** — 9D, 9E, 9F all complete. Step 5 polish items underway (goal types, drag-and-drop, risk profile, account selection, household view). Starting multi-agent code review.

**2026-04-14** — 11 code review fixes complete + verified. About page built and mobile-fixed. Worktree created for Phase 10 doc work. Closing out sprint.

---

## Sprint Retrospective

### What Was Built

#### Phase 9C — Google OAuth
- `POST /api/v1/auth/google`: verifies Google credential via `google-auth-library`; find-or-create covers 3 cases: existing Google ID → login, existing email → link `google_id`, new → `createUserWithGoogle`
- DB: `google_id VARCHAR UNIQUE`; `password_hash` no longer NOT NULL
- Frontend: `@react-oauth/google`, `GoogleLogin` on Login + Register, `GoogleOAuthProvider` in `index.js`
- Account profile shows sign-in method (Google / Email+Password)
- `invalidateAll()` on logout clears cross-account cache
- 5 new tests (mock `google-auth-library`); 197 → 214 total

#### Phase 9D — Watchlist News Feed
- `server/services/finnhub.js`: `getNewsArticles(symbol)` — Finnhub company news, 7 articles/ticker
- `GET /api/v1/news?tickers=AAPL,TSLA` — Promise.all per ticker, graceful `[]` fallback, 6 tests
- Watchlist.js: collapsible "Recent News" per ticker; 3 shown by default, "X more" expand; Agence Overview AI summary per ticker (Claude Haiku, analyst framing)
- Per-ticker cache: `news_AAPL`, `news_TSLA` — add fetches only new ticker; remove invalidates that entry only; batch-fetches all uncached tickers in ONE request
- Finnhub SDK v2 fix: removed `ApiClient.instance` (undefined in v2) → `new finnhub.DefaultApi(API_KEY)`
- Watchlist UX: alphabetical sort, search filter, refresh button, auto-refresh on add/remove

#### Phase 9E — Nav Redesign
- `AppNav.js`: 6 flat links → Insights (top-level), Money▾ (Expenses, Goals), Markets▾ (Portfolio, Watchlist), Account
- CSS-only hover dropdowns: `opacity/visibility` transition, `align-self: stretch` for full nav-height hover zone
- 3 bug-fix iterations: `--navy-900` undefined (→ `--navy-950`), chevron removed, dropdown position fixed

#### Phase 9F — Password Reset
- `POST /api/v1/auth/forgot-password`: JWT reset token (1h, separate secret), SendGrid email, always 200 (no email-exists leak)
- `POST /api/v1/auth/reset-password`: verifies token type + expiry, bcrypt hashes new password
- `ForgotPassword.js` + `ResetPassword.js` pages; "Forgot password?" link on Login
- Email chain: SendGrid HTTPS → Resend HTTPS → `console.log` dev fallback (Render blocks SMTP ports 25/465/587)
- 9 new tests (400/401/200 cases, expired token, wrong type); 223 total

#### Step 5 Polish Backlog
- **Goal types**: `goal_type` column (`savings`/`growth`/`speculation`); pill badge per goal; `<select>` on create
- **Drag-and-drop goal ordering**: `goals.position` column; `PATCH /goals/reorder`; HTML5 drag API; optimistic reorder with rollback on failure
- **Risk tolerance**: `users.risk_tolerance`; `PATCH /me`; Settings pill radio (conservative/moderate/aggressive); `autopilotAgent` reads risk level
- **Account selection**: `users.active_account_id`; `PATCH /me`; Settings clickable account rows; filters transactions + insights by active account
- **Household view toggle**: `users.active_view` (`personal`|`household`); `PATCH /me`; Settings toggle; Dashboard household badge conditional on `activeView === 'household'`
- **Portfolio dropdown fix**: CSS selector changed from `.page main select` to `.form-select` opt-in class (no padding-right conflict)

#### 5b — Code Review Fixes (11 fixes)
Parallel multi-agent review (security + architecture + tests + frontend agents) identified 11 issues; second review confirmed all fixed:

1. `marketContextAgent` single-param refactor — was silently returning `[]` in production (wrong arg count)
2. Orchestrator test: watchlistAgent mock + data-routing assertion added
3. `invalidateInsightsCache()` called after all mutations (Goals, Portfolio, Watchlist, Settings)
4. Retry interceptor: GET/HEAD/OPTIONS only — no POST retries (prevented duplicate trades)
5. `PlaidLink.js`: `.then()` → async/await with `cancelled` cleanup flag
6. Goals reorder: store `previous`, restore on `.catch()`
7. `helmet` added to `server/index.js`
8. Password ≥ 8 chars enforced on register + reset-password (2 new tests)
9. `updateGoalCurrent` adds `AND user_id = $3` ownership filter
10. `axios` updated to 1.15.0 (patches CVSS 10.0 SSRF CVE)
11. `express-rate-limit`: auth 10 req/15 min, insights+chat 60 req/min; skipped in test env

Final test count: 246/246 passing

#### About Page
- Public `/about` route (no PrivateRoute), linked in AppNav left of Insights
- Sections: Hero, The Problem, How It Works (4-step), The Six Agents (CSS Grid, 6 cards), Navigating the App, Tech Stack
- Mobile fix: `<style>` tag with `@media (max-width: 640px)` — step labels and nav path labels wrap to full width on narrow viewports

### What Went Well
- Parallel multi-agent code review caught the `marketContextAgent` zero-output bug that had been silently active in production — manual review had missed it
- `express-rate-limit` with `skip: () => process.env.NODE_ENV === 'test'` pattern worked cleanly (no test breakage)
- SendGrid HTTPS was the correct email solution for Render free tier on first try after diagnosing SMTP port blocks
- Per-ticker news caching (add fetches only new ticker, remove invalidates that entry) felt like the right granularity

### What Could Be Improved
- `detect-secrets` hook blocked commits twice due to test passwords in new test files — need to add pragma comments proactively when writing security-related tests
- `chat.js` Anthropic client instantiation must stay inside the handler (not module scope) — Jest mocking order broke when moved to module scope; took one debugging cycle to identify

### Velocity
- ~16 hours across 4 days
- ~30 commits, all conventional format
- Test count: 192 → 246 (+54 tests across 9C/9D/9F/5b)

---

## AI Disclosure
This sprint used Claude Code (Claude Sonnet 4.6) for:
- Implementing all feature routes, queries, and frontend pages
- Multi-agent parallel code review (security, architecture, tests, frontend specialist agents)
- Diagnosing production bugs (marketContextAgent zero-output, Finnhub SDK v2 breaking change, Render SMTP blocks)
- About page layout iterations (desktop + mobile)

All feature decisions, security review, production debugging direction, and final approval were performed by the human author.
