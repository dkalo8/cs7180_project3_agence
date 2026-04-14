# Agent SDK, fast-check, Stryker — Bonus Work

**Date:** 2026-04-14  
**Tests:** 269 → 273 passing (+4 new chat tests)

---

## What Was Done

### 1. fast-check property-based testing (+3 bonus pts)
- **File:** `server/agents/agents.property.test.js`
- 17 property-based tests covering all 3 core agents:
  - `spendingAgent` (5 tests) — arbitrary transaction arrays, category sums always ≥ 0, MoM comparison shape
  - `anomalyAgent` (5 tests) — large tx always flagged, duplicate key collision, negative Plaid amounts
  - `goalsAgent` (7 tests) — on_track/goal_behind/complete logic for arbitrary target/current pairs
- Runs via `npm test` (included in jest suite)

### 2. Stryker mutation testing (+3 bonus pts)
- **Config:** `server/stryker.config.json`
- **Command:** `npm run mutation`
- **Report:** `server/reports/mutation/mutation.html`
- **Score (updated after abs() fixes):** 74.64% overall — spendingAgent 85.71%, anomalyAgent 71.60%, goalsAgent 65.52%
- anomalyAgent jumped from 50.6% → 71.60% after Math.abs() fixes killed 8 more mutants
- Targets 3 core agents only; surviving mutants mostly string-template and boundary (> vs >=) variants

### 3. Agent SDK upgrade — POST /api/v1/chat (+4 bonus pts)
- **File:** `server/routes/chat.js` (full rewrite)
- **Before:** Single Claude call with all financial data pre-loaded into system prompt
- **After:** Tool-use agent loop — Claude requests only the data it needs

#### Architecture
- `TOOLS` array — 5 tool definitions: `get_transactions`, `get_portfolio`, `get_goals`, `get_watchlist`, `get_trades`
- `executeTool(name, input, userId)` — dispatches to `queries.*` or `alpacaService.*`, returns structured JSON
- `runAgentLoop(anthropic, messages, userId)` — multi-turn loop:
  - Max 5 rounds (`MAX_TOOL_ROUNDS`)
  - Executes all tool calls in a turn via `Promise.all` (parallel)
  - Appends `tool_result` user message after each round
  - Returns text when `stop_reason === 'end_turn'`
  - Returns fallback string if max rounds exceeded

#### Test coverage (chat.test.js — 10 tests)
- 401 without token
- 400 missing/empty message
- 200 with text reply (no tools)
- Conversation history passed through
- Tool definitions present on every call (all 5 names verified)
- Multi-turn: tool call → tool result → final reply (2 Claude calls)
- Tool result contains correct DB data (goals parsed to numbers)
- Parallel tools in one turn → 2 tool_result entries in single user message
- Max rounds fallback → exactly 5 Claude calls, string reply returned

#### Git tag
- `v1-pre-agent-sdk` — tagged at commit 34688a5 before rewrite; safe rollback point

---

## Rubric Gap Analysis (done at same time)

Remaining items before Apr 21 submission:
1. **Security gate #4** — add `detect-secrets` or gitleaks scan to CI (currently 3 gates)
2. **OWASP Top 10 in CLAUDE.md** — rubric explicitly requires it under Security
3. **Stryker re-run** — get updated score after anomalyAgent abs() fixes
4. **Verify PRs with C.L.E.A.R. + AI disclosure** — need 2 PRs on GitHub showing writer/reviewer pattern
5. **Blog publish** — draft in `docs/blog-post.md`, needs LinkedIn/Medium URL
6. **Screencast** — 5–10 min demo video
7. **Showcase form** — submit after video + blog live

---

## Key Design Decisions

- Lazy data fetching: old impl loaded all 7 data sources unconditionally; new impl only fetches what Claude decides it needs
- Parallel tool execution within a turn via `Promise.all` (consistent with orchestrator pattern)
- Fallback string (not 500 error) when max rounds exceeded — graceful degradation
- `executeTool` returns parsed JS objects; JSON.stringify in loop for tool_result content field
