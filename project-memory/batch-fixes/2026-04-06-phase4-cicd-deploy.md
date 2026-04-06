# Phase 4 + CI/CD + Deployment

## Session: 2026-04-06

## What was done

### Phase 4: Claude Code Features
- `.claude/settings.json` — PreToolUse hook: ESLint on any server/*.js edit. PostToolUse hook: run tests after git push.
- `.mcp.json` — postgres (postgresql://localhost/agence_dev) + context7 MCP servers configured at repo root.
- `.claude/agents/insight-reviewer.md` — sub-agent that reviews orchestrator output for actionability, accuracy, redundancy, severity calibration, and cross-domain value.
- `.claude/skills/run-insights/SKILL.md` — second custom skill: scaffolds and runs the full orchestrator→judge pipeline against fixture data without a live server.

### CI/CD: GitHub Actions
- `.github/workflows/ci.yml` — 5 parallel jobs:
  1. `server-lint` — ESLint on server/
  2. `server-test` — Jest 107 tests with JWT_SECRET env var
  3. `client-build` — CRA build (CI=false to suppress warnings-as-errors)
  4. `security` — npm audit --audit-level=high on both server/ and client/ (continue-on-error)
  5. `ai-review` — claude-code-action@beta on PRs only, checks API boundaries + agent purity + security
- First run: ✅ green immediately

### Deployment
- `render.yaml` — Render infrastructure-as-code for agence-api web service
- `client/vercel.json` — SPA rewrite rule (`/(.*) → /index.html`) for React Router
- **Render**: https://cs7180-project3-agence.onrender.com — Node/Express backend, US West Oregon
- **Vercel**: https://agence-flame.vercel.app — CRA frontend, deployed via CLI (dkalo97 Vercel account, couldn't link dkalo8 GitHub)
- **Render PostgreSQL**: agence_db, schema applied via `psql $DATABASE_URL -f schema.sql`

### Bug fix: SSL for Render PostgreSQL
- Render managed databases require SSL; bare `new Pool({ connectionString })` returned `{"error":"SSL/TLS required"}`
- Fix: `ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false`
- Local dev unaffected (DATABASE_URL not set locally → ssl: false)

### Verified end-to-end
- Register + login working in production: POST /api/v1/auth/register returns 201 + JWT
- Dashboard loads at https://agence-flame.vercel.app after login
- /health returns `{"status":"ok"}`

## Commits
- feat: add Claude Code features (Phase 4) — 289b3c1
- feat: add GitHub Actions CI workflow — 5a3aa9f
- chore: add Vercel + Render deployment config — 9e81371
- fix: enable SSL for Render PostgreSQL connection — 4ba9d0b

## Next
- Integration tests (auth flow + insights endpoint)
- Remaining backend routes (accounts/Plaid, portfolio/Alpaca, trades/Alpaca)
- CSS styling
- Team Process (PRs, issues, sprint docs)
- Documentation & Demo (blog, screencast, reflection)
