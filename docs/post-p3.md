# Agence — Post-P3 Feature Backlog

Items discussed but deferred from P3 scope. Tackle after April 21 submission.

---

## Accounts & Portfolio

- [ ] **Multi-account trading support** — separate Alpaca paper account per "view" (personal vs household). Currently one API key = one portfolio. Requires: second Alpaca paper account + credentials, DB table to store multiple Alpaca connections per user, account-switcher in Portfolio page.
- [ ] **Account types** — IRA, Roth IRA, secondary taxable brokerage account. Each needs its own Alpaca credentials + account row in DB. UI: account-type label per account, tax-efficiency insights per type.
- [ ] **Household trading account** — household-scoped Alpaca account so toggling "Household" view shows a combined or separate portfolio value. Currently `activeView` only scopes Plaid (banking) data + the Dashboard badge label.
- [ ] **Linked account removal** — allow unlinking a Plaid account (DELETE /accounts/:id, cascade transactions/balances). Currently accounts are append-only.

---

## Email & Auth

- [ ] **Password reset from verified domain** — current sender is `onboarding@resend.dev` (Resend sandbox). For production: verify a real domain in Resend or SendGrid, set `RESEND_FROM` / `SENDGRID_FROM` to a branded address (e.g. `noreply@agence.app`).
- [ ] **Apple / GitHub OAuth** — add more sign-in providers via `google-auth-library` pattern or Passport.js.
- [ ] **Two-factor authentication (TOTP)** — TOTP via `otplib`; QR code enrollment in Settings.

---

## Intelligence & Agents

- [ ] **Tax agent** — identify short-term vs long-term capital gains positions, tax-loss harvesting opportunities.
- [ ] **Debt paydown agent** — if user has linked credit card or loan accounts via Plaid, surface high-interest debt vs investment return comparisons.
- [ ] **Budget agent** — user-set monthly budget per category; agent fires when 80%+ of budget consumed.
- [ ] **Recurring transaction detection** — use Plaid's recurring transaction API (or own detection) to show subscriptions + expected next charges.
- [ ] **Better anomaly scoring** — ML model or embedding-based similarity instead of rule-based thresholds. Use historical average as dynamic baseline.

---

## UX / Accessibility

- [ ] **Real-time Watchlist prices** — WebSocket (Alpaca data stream) instead of polling on page load.
- [ ] **Transaction CSV export** — "Download CSV" button on Expenses page.
- [ ] **Dark mode** — toggle in Account settings; store preference in `users` table.
- [ ] **Notification center** — in-app alerts for autopilot trades executed, large anomalies, goal completion.
- [ ] **Mobile app** — React Native wrapper sharing the same Express API. Or PWA with manifest + service worker.

---

## Infrastructure

- [ ] **Upgrade Render tier** — free tier spins down after inactivity (30s cold start). Upgrade to Starter ($7/mo) for always-on.
- [ ] **Rate limiting** — `express-rate-limit` on auth endpoints + insights (LLM calls are expensive).
- [ ] **Request logging** — structured JSON logs (pino or winston) with request ID tracing.
- [ ] **Secrets rotation** — automate JWT_SECRET rotation; document recovery procedure.
