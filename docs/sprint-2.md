# Sprint 2 — Planning & Retrospective

**Dates:** 2026-04-06 – 2026-04-08  
**Goal:** Claude Code features, CI/CD pipeline, production deployment, full testing coverage.

---

## Sprint Planning

### Scope Selected
- Phase 4: Claude Code features (hooks, .mcp.json, second skill, sub-agent)
- Phase 5: GitHub Actions CI, Vercel + Render deployment, pre-commit secrets detection
- Phase 6: Integration tests, Jest coverage reporting, Playwright E2E tests
- Phase 7 (partial): GitHub Issues, CSS styling PR

### Approach
- Complete phases in order per docs/TODO.md
- Each phase committed before moving to the next
- Feature branches + PRs for user-facing changes (CSS styling)

### Definition of Done
- CI pipeline green on every push to main
- Live URLs working end-to-end (register → login → dashboard)
- 118+ tests passing, 70%+ coverage enforced in CI
- At least 1 merged PR with AI disclosure

---

## Async Standups (Solo)

**2026-04-06** — Starting sprint. Claude Code features first (hooks, MCP, sub-agent, second skill) — these are the highest-signal rubric items. Will commit each feature independently before moving to CI/CD.

**2026-04-07** — CI/CD pipeline green on first push. Render + Vercel both live. Starting integration tests and Playwright E2E. Need to confirm 70% coverage threshold enforced in CI before closing this out.

**2026-04-08** — All testing stages passing. CSS styling delivered via `feat/css-styling` branch + PR #6 with AI disclosure. Sprint complete — all phases 4–7 done, 118 tests passing, both deployments live.

---

## Sprint Retrospective

### What Was Built
- **Claude Code features**: `settings.json` hooks (PreToolUse ESLint, PostToolUse tests), `.mcp.json` (postgres + context7), `insight-reviewer` sub-agent, `/run-insights` skill
- **CI/CD**: 6-job GitHub Actions pipeline (lint, test, coverage, client build, security audit, AI PR review, E2E). Green on first run.
- **Deployment**: Render backend + PostgreSQL (agence_db), Vercel frontend — both live and tested
- **Pre-commit secrets**: `detect-secrets` v1.5.0 with baseline — caught test JWT strings on first real use
- **Integration tests**: 11 tests (auth round-trip + insights pipeline) mocking only pg Pool
- **Coverage**: 70% threshold enforced in CI; actual ~95% statements
- **E2E (Playwright)**: 4/4 tests passing against live Vercel URL
- **CSS styling**: Full visual redesign — dark nav, card layout, severity badges. Delivered via feature branch + PR #6
- **GitHub Issues**: 5 issues (#1–#5) with acceptance criteria for remaining features

### What Went Well
- GitHub Actions pipeline was green on the first run — incremental backend build paid off
- Pre-commit hook caught false positives immediately on first use (demonstrating it works)
- Playwright tests required one iteration to fix (localStorage.clear() doesn't update React state) but were straightforward after
- SSL fix for Render PostgreSQL was a one-liner once diagnosed via curl

### What Could Be Improved
- Vercel GitHub integration couldn't be linked to `dkalo8` account (conflicts with existing `dkalo97` account) — worked around with CLI deploys, but auto-deploy on PR is missing
- Render defaulted to US West region — minor latency for East Coast users, acceptable for a class project

### Velocity
- ~8 hours of focused work
- ~12 commits across phases 4–7

---

## AI Disclosure
This sprint used Claude Code (Claude Sonnet 4.6) for:
- Writing GitHub Actions workflow YAML
- Writing integration and E2E test files
- Diagnosing and fixing deployment issues (SSL, CORS, env vars)
- Creating GitHub Issues and PR descriptions
- Writing CSS styles

All architectural decisions, deployment account setup, and final review were performed by the human author.
