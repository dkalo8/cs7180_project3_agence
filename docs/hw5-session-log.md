# HW5 — Annotated Claude Code Session Log

## Overview

This log covers the HW5 session demonstrating the `/add-agent` custom skill (v1 → v2) and the PostgreSQL MCP integration. Annotations in **[brackets]** mark which deliverable or rubric criterion each exchange demonstrates.

---

## Part 1 — Custom Skill: /add-agent

### Creating v1

**User:** `create a /add-agent skill that scaffolds new Agence agents`

**[SKILL CREATION]** Claude wrote `.claude/skills/add-agent/SKILL.md` with:
- Metadata (name, description, version, usage, example)
- Step-by-step instructions for scaffolding an agent stub + TDD test file
- Architecture rules (pure functions, no side effects, factory mocks over auto-mock)
- Fixture templates for `userData` and `marketData`

---

### Running v1 on anomalyAgent

**User:** `/add-agent anomalyAgent userData`

**[SKILL EXECUTION — v1]** Claude followed the skill instructions:

```
Creating:  server/agents/anomalyAgent.js
Testing:   server/agents/anomalyAgent.test.js
Routing:   userData
```

Files created:

```js
// server/agents/anomalyAgent.js (stub)
function anomalyAgent(userData) {
  return [];
}
module.exports = anomalyAgent;
```

```js
// server/agents/anomalyAgent.test.js (cycles 1–2 passing, 3–5 todo)
describe('anomalyAgent — cycle 1: return shape', () => {
  test('returns an array', () => { ... }); // PASSING
});
describe('anomalyAgent — cycle 2: empty input', () => {
  test('returns empty array when transactions list is empty', () => { ... }); // PASSING
});
// Cycles 3–5: generic test.todo placeholders
```

Test run after scaffold:
```
Tests: 2 passed, 6 todo
```

**[V1 GAPS DISCOVERED]** Three issues surfaced immediately:

1. **ESLint failure:**
```
/server/agents/anomalyAgent.js
  3:25  error  'userData' is defined but never used  no-unused-vars
```
The stub generates `function anomalyAgent(userData)` but the body is just `return []` — ESLint flags the unused parameter.

2. **Orchestrator not checked:** After the scaffold, `orchestrator/index.js` still needed to be manually verified for wiring. On a 6-agent system this is easy to forget.

3. **`progress.md` not updated:** The skill created files but left the project tracking document stale.

4. **Generic test stubs:** Cycles 3–5 had identical `test.todo('implement core logic tests here')` placeholders regardless of agent type — no useful starting point for domain-specific TDD.

---

### Iterating to v2

**[SKILL ITERATION — v1 → v2]** Claude updated `SKILL.md` to fix all four gaps and saved the original as `SKILL-v1.md` for evidence:

| Gap | v2 Fix |
|---|---|
| ESLint `no-unused-vars` on stub params | Use `_userData` prefix on stub params |
| Orchestrator not checked | Step 4: read + patch `orchestrator/index.js` and its test file if agent missing |
| `progress.md` not updated | Step 5: read and mark agent as in-progress automatically |
| Generic test stubs | Per-agent lookup table of domain-specific cycle 3–5 stubs |

Key diff in stub generation (v1 → v2):
```js
// v1 — triggers ESLint no-unused-vars
function anomalyAgent(userData) {
  return [];
}

// v2 — ESLint clean
function anomalyAgent(_userData) {
  return [];
}
```

---

### Running v2 on goalsAgent

**User:** `/add-agent goalsAgent userData`

**[SKILL EXECUTION — v2]** Claude ran the updated skill:

```
Creating:  server/agents/goalsAgent.js
Testing:   server/agents/goalsAgent.test.js
Routing:   userData
Orchestrator: will check if wiring needed
Progress:  will mark as in-progress
```

**Step 4 — Orchestrator check:**
```
Reading orchestrator/index.js... found require('../agents/goalsAgent') ✓
Reading orchestrator/index.test.js... found jest.mock('../agents/goalsAgent') ✓
Orchestrator already wired — no changes needed.
```

**Step 5 — progress.md update:**
```
Marked goalsAgent as ← IN PROGRESS in project-memory/progress.md
```

**Step 3 — Domain-specific test stubs (v2):**
```js
// Cycle 3 — insight shape
test('each insight has type, goalName, message, pace, projectedDate', () => { ... });

// Cycle 4 — core logic
test('flags a goal that is behind pace by more than 1 month', () => { ... });
test('marks a goal as on-track when pace meets target date', () => { ... });
test('flags a goal with zero contributions this month', () => { ... });

// Cycle 5 — edge cases
test('handles a goal that is already complete (current >= target)', () => { ... });
test('processes multiple goals and returns an insight for each', () => { ... });
```

Lint check after scaffold:
```bash
$ cd server && npm run lint
# No ESLint errors — _userData prefix working correctly
```

Test run after scaffold:
```
Tests: 2 passed, 6 todo
Lint: clean
```

**[V2 VERIFIED]** All four v1 gaps resolved: no ESLint error, orchestrator confirmed wired, progress.md updated, domain-specific stubs seeded.

---

### Full suite after both scaffolds

```bash
$ cd server && npm test
Test Suites: 6 passed, 6 total
Tests:       51 passed, 12 todo
```

51 passing (expected — cycles 3–5 are todos pending implementation), lint clean.

---

## Part 2 — MCP Integration: PostgreSQL

### Setup

**[MCP CONFIGURATION]** Added PostgreSQL MCP server for live schema inspection during `server/db/queries.js` development:

```bash
$ claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://localhost/agence_dev
Added MCP server postgres

$ claude mcp list
postgres    npx -y @modelcontextprotocol/server-postgres postgresql://localhost/agence_dev  ✓ connected
context7    npx -y @upstash/context7-mcp                                                   ✓ connected
```

Both servers confirmed connected. Configuration stored in `~/.claude.json` — available in all future sessions without re-running `mcp add`.

---

### Using the MCP: schema inspection mid-session

**[MCP IN ACTION]** During a subsequent `queries.js` planning session, the PostgreSQL MCP was used to inspect the live schema inline without leaving Claude Code:

**Query via MCP:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```

**Result surfaced inline:**
```
column_name          | data_type         | is_nullable
---------------------|-------------------|------------
id                   | uuid              | NO
user_id              | uuid              | NO
account_id           | uuid              | NO
amount               | numeric           | NO
merchant_name        | character varying | YES
category             | character varying | YES
date                 | date              | NO
created_at           | timestamp         | NO
```

**[MCP VALUE]** Key findings from inline schema inspection:
- Column is `merchant_name`, not `merchant` — would have caused a silent `undefined` bug in queries without the MCP
- `amount` is `NUMERIC`, not `FLOAT` — Plaid returns floats; explicit cast needed in insert queries
- These mismatches were caught before writing a single line of `queries.js`, not during test debugging

---

## Summary

| Deliverable | Status |
|---|---|
| Custom skill file (`.claude/skills/add-agent/`) | ✓ v2 committed |
| v1 snapshot for evidence | ✓ `SKILL-v1.md` committed |
| Skill tested on 2 real tasks | ✓ anomalyAgent (v1) + goalsAgent (v2) |
| v1 → v2 iteration documented | ✓ Version History in SKILL.md |
| MCP server configured | ✓ postgres + context7, both connected |
| MCP workflow demonstrated | ✓ schema inspection for queries.js |
| Session log (this file) | ✓ |
