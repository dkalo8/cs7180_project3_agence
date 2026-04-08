# Agence — AI-Powered Personal Finance & Investment Copilot

Parallel agents analyze spending, anomalies, savings goals, portfolio health, and market context. LLM-as-judge synthesizes prioritized insights. Supports autopilot paper trading.
See @docs/PRD.md for full product context.

## Tech Stack
- Frontend: React (client/)
- Backend: Node.js + Express (server/)
- Database: PostgreSQL
- Auth: JWT
- LLM: Anthropic Claude (orchestrator/judge.js)
- Testing: Jest + Supertest

## API Responsibility Map — DO NOT MIX THESE UP
- **Alpaca**: price quotes, portfolio positions, P&L, trade execution (paper only)
- **Plaid**: bank balances, transaction history — NEVER investment/portfolio data
- **Finnhub**: news articles, sentiment scoring — NEVER price data
- **Anthropic**: insight synthesis via orchestrator/judge.js

## Architecture
- server/agents/        — AI analysis agents (pure functions: (userData, marketData) => insights[])
- server/orchestrator/  — parallel agent runner (Promise.all, never sequential) + LLM-as-judge
- server/routes/        — Express API routes (/api/v1/:resource pattern)
- server/db/            — ALL DB queries live here via queries.js — never write SQL anywhere else
- server/middleware/     — JWT auth, error handling
- client/src/           — React frontend (functional components only)

## Commands
npm run dev        # Express + nodemon
npm run lint       # ESLint — run before every commit, must pass clean
npm test           # Jest — run before every commit, must pass clean
npm run test:watch # TDD mode for red-green-refactor

## Rules
- **API boundaries**: Alpaca = prices/portfolio/trades. Plaid = banking/transactions. Finnhub = news/sentiment. Never cross these.
- **Paper trading only**: Never set ALPACA_PAPER=false. P3 is paper trading only.
- **SQL quarantine**: All queries go through server/db/queries.js. Zero exceptions.
- **Agent purity**: Agents are pure functions. No side effects, no DB calls, no API calls inside agents.
- **Parallel execution**: Orchestrator runs agents via Promise.all — never sequentially.
- **TDD**: Tests written BEFORE implementation. Never implement beyond what failing tests require.
- **Async/await only**: No raw .then() chains.
- **Commits**: Conventional Commits (feat:, fix:, test:, refactor:, chore:). Run `npm run lint && npm test` before every commit — both must pass. Never commit directly to main.
- Unit tests live beside source files as *.test.js
- Integration tests go in server/tests/integration/

## Dev Workflow (follow this every session, no exceptions)

1. **One task at a time** — pick the next item from `project-memory/progress.md`
2. **TDD** — write failing test first, then implement until green
3. **Verify** — run `npm run lint && npm test` in server/; both must pass clean
4. **Log** — append a note to the active `project-memory/batch-fixes/YYYY-MM-DD-*.md` (create if new session)
5. **Update progress** — update `project-memory/progress.md` to reflect current state
6. **Commit + push** — `git add`, commit with Conventional Commits format, push to `dkalo8/cs7180_project3_agence`
7. **Repeat** — pick next task

Never accumulate multiple unverified changes before committing. Small steps, verify, commit, repeat.

## On Compaction
Preserve these rules above all else: API boundary map (Alpaca/Plaid/Finnhub responsibilities), ALPACA_PAPER=false prohibition, SQL quarantine, agent purity, parallel execution via Promise.all.

## Communication Style
- **Always use caveman mode** — invoke `/caveman full` at the start of every session. Terse, no fluff, fragments OK. If session starts without it active, invoke it immediately before responding.

## Reminders
- Alpaca = prices/portfolio/trades. Plaid = banking only. Finnhub = news/sentiment only.
- Never set ALPACA_PAPER=false
- ALL DB queries go through server/db/queries.js — nowhere else
- Agents are pure functions — no side effects