# spendingAgent — Explore & Design Notes

## Exploration findings

Explored the project structure to understand the agent contract before
implementing. Key findings:

- **Contract** (CLAUDE.md): agents are pure functions `(userData, marketData) => insights[]`
  — no DB calls, no API calls, no side effects
- **All other agent files** are empty placeholders — spendingAgent is first to implement
- **Orchestrator** (`server/orchestrator/index.js`) will run all agents via `Promise.all`
- **Unit tests** live beside source as `spendingAgent.test.js`
- `marketData` is passed for signature consistency but not used by this agent

## Design decisions

### Input shape
```js
userData = {
  transactions: [{ id, amount, category, date, name }]
  // amount > 0 = expense, date = ISO string "YYYY-MM-DD"
}
```

### Output shape
```js
[{ type: string, message: string, severity: 'info' | 'warning' }]
```

### Acceptance criteria
1. Returns `[]` for empty or missing transactions — never throws
2. Returns a `top_category` insight naming the highest-spend category
3. Returns a `category_spike` warning when any category exceeds 30% of total spend
4. Returns a `monthly_increase` warning when current-month spend exceeds prior month by >20%
5. Each insight has `{ type, message, severity }`

### Implementation approach
- Group transactions by category using reduce
- Compute total spend and per-category totals
- Derive current month vs prior month by comparing transaction dates to today
- Keep all logic functional — no mutation, no side effects
