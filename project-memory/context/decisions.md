# Architectural Decisions

Running log of key decisions and their rationale.

---

## 2026-03-28

### Agent purity (pure functions only)
**Decision**: All agents are `(userData, marketData) => insights[]` — no side effects, no DB/API calls inside agents.
**Why**: Trivial to unit test in isolation. Orchestrator handles all I/O before calling agents. Follows the harness design principle of separating data fetching from analysis.

### Promise.all orchestration (never sequential)
**Decision**: Orchestrator runs all 6 agents in parallel via `Promise.all`, never `await` in a loop.
**Why**: 6 agents × ~200ms each sequential = ~1.2s. Parallel = ~200ms. UX and rubric requirement.

### LLM-as-judge with explicit scoring dimensions
**Decision**: Judge receives structured JSON array from all agents, scores each insight on: actionability, urgency, cross-domain relevance, confidence.
**Why**: Generic "rank these" prompts produce poor results (see harness-design.md). Explicit dimensions align the model's judgment to what users actually need.

### SQL quarantine (all queries in queries.js)
**Decision**: Zero SQL anywhere outside `server/db/queries.js`. Routes call query functions, never write SQL inline.
**Why**: Prevents scattered DB logic, makes schema changes traceable, prevents SQL injection vectors from proliferating.

### Paper trading only
**Decision**: `ALPACA_PAPER=true` always. No toggle exposed.
**Why**: Project requirement. Real money trading is post-P3 scope and requires regulatory consideration.

### API boundary separation
**Decision**: Alpaca = prices/portfolio/trades. Plaid = banking/transactions. Finnhub = news/sentiment only.
**Why**: Clean separation prevents data integrity issues (e.g., using Plaid for portfolio data would give stale/wrong numbers). Each API is authoritative for its domain.

### TDD discipline (red-green-refactor)
**Decision**: Tests written before implementation. Never implement beyond what failing tests require.
**Why**: Project requirement + proven to produce better-designed agents. Both spendingAgent and marketContextAgent were implemented this way — both have clean, well-bounded interfaces as a result.

## Final Presentation Design Decisions (2026-04-21)

### Synthesis over Aggregation
Prioritized "Cognitive Load Reduction" by using a Judge LLM to distill 20+ raw agent observations into a single prioritized feed of insights. The UI focuses on "The One Thing That Matters" rather than a firehose of alerts.

### Pure-Function Agent Boundaries
Enforced a rule that agents have zero I/O and zero database calls. They are input-to-output logic blocks only. This made the system 100% unit-testable and allowed for trivial parallelization via `Promise.all`.

### Strategy-First Caching
Implemented an eager "pre-warm" cache on Dashboard mount to hide the latency of multiple financial API calls (Plaid + Alpaca + Finnhub). This moved perceived latency to the background, making the UI feel fast even with heavy data requirements.

### Constraint-First Development
Used `CLAUDE.md` as an automated policy enforcer rather than just a set of instructions. Enforced strict data boundaries (e.g., Plaid agents cannot see Alpaca data) to prevent "agent drift" and ensure insight purity.
