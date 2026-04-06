# Agence — P3 TODO Checklist

**Deadline:** April 21, 2026 | **Points:** 200 | **Current estimate:** ~107/107 tests, ~60% complete

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

## Phase 2: Backend Wiring ✅ (core done, 3 routes pending)

- [x] Design DB schema: `users`, `accounts`, `goals`, `transactions`, `trades` tables
- [x] Implement `server/db/queries.js` — all SQL here, PostgreSQL MCP for schema inspection
- [x] Implement `server/middleware/auth.js` — JWT verify middleware
- [x] Implement `server/middleware/errors.js` — centralized error handler
- [x] Implement `server/index.js` — Express app, middleware mount, route registration
- [x] Implement `server/routes/auth.js` — POST /api/v1/auth/register, /login
- [ ] Implement `server/routes/accounts.js` — Plaid Link token + account sync
- [ ] Implement `server/routes/portfolio.js` — Alpaca positions, P&L
- [ ] Implement `server/routes/trades.js` — paper trade execution
- [x] Implement `server/routes/insights.js` — GET /api/v1/insights (calls orchestrator → judge)
- [ ] Integration tests in `server/tests/integration/` for auth + insights route

---

## Phase 3: Frontend ✅ (scaffold done, polish pending)

- [x] Set up React Router with protected routes
- [x] Auth flow: login + register pages, JWT storage
- [ ] Plaid Link component: connect bank account
- [x] Insights feed: display ranked insights from judge
- [ ] Portfolio view: Alpaca positions + P&L
- [ ] Goals tracker: create + track savings goals
- [ ] CSS / styling — make it look like a real product

---

## Phase 4: Claude Code Features (~8 hrs, +10 pts) ✅

- [x] **Add a second custom skill** — `/run-insights` (`.claude/skills/run-insights/SKILL.md`)
- [x] **Configure hooks in `.claude/settings.json`:**
  - [x] `PreToolUse` hook: run ESLint on file edits
  - [x] `PostToolUse` hook: run tests after `git push`
- [x] **Create `.mcp.json`** in repo root with postgres + context7 config
- [x] **Create `.claude/agents/`** directory with at least 1 sub-agent (`insight-reviewer.md`)

---

## Phase 5: CI/CD & Deployment (~20 hrs, +25 pts)

- [x] Create `.github/workflows/ci.yml` with stages:
  - [x] Lint (ESLint)
  - [x] Unit tests (Jest)
  - [x] Security scan (`npm audit`)
  - [x] AI PR review (`claude-code-action`)
  - [ ] Integration tests (pending — test files not written yet)
- [ ] Configure Vercel project — preview deploys on PR (blocked: dkalo8 GitHub can't link to existing Vercel account; CLI deploy working at https://agence-flame.vercel.app)
- [x] Deploy backend API — Render (https://cs7180-project3-agence.onrender.com)
- [x] Deploy frontend — Vercel (https://agence-flame.vercel.app)
- [x] Set up pre-commit secrets detection — detect-secrets v1.5.0 + .secrets.baseline

---

## Phase 6: Testing Gaps (~10 hrs, +5 pts)

- [ ] Configure Playwright for E2E — at least 1 test for main user flow (login → see insights)
- [ ] Enable Jest coverage reporting — enforce 70%+ threshold in CI
- [ ] Add at least 3 integration tests (auth flow, insights endpoint, orchestrator round-trip)

---

## Phase 7: Team Process / PRs (~4 hrs, +variable pts)

- [ ] Enable branch-per-feature workflow — stop committing directly to main
- [ ] Create GitHub Issues with acceptance criteria for remaining features
- [ ] Open PRs for each feature, use writer/reviewer pattern
- [ ] Document 2 sprints (planning + retrospective)
- [ ] Add AI disclosure metadata to PRs

---

## Phase 8: Documentation & Demo (~6 hrs, +10 pts)

- [ ] Add Mermaid architecture diagram to README.md
- [ ] Write + publish blog post (Medium or dev.to) — 1,500+ words
- [ ] Record 5–10 min screencast
- [ ] Write 500-word individual reflection
- [ ] Submit showcase form

---

## Rubric Scorecard

| Category | Max | Est. Now | Achievable |
|---|---|---|---|
| Application Quality | 40 | 15 | 35 (needs Plaid/Alpaca + styling + deploy) |
| Claude Code Mastery | 55 | 25 | 45 (hooks + second skill + .mcp.json + agents) |
| Testing & TDD | 30 | 22 | 27 (integration + E2E gap) |
| CI/CD & Production | 35 | 0 | 30 (GitHub Actions + Vercel) |
| Team Process | 25 | 5 | 20 (PRs + issues + sprint docs) |
| Documentation & Demo | 15 | 5 | 13 (blog + video) |
| **Total** | **200** | **~72** | **~170** |
