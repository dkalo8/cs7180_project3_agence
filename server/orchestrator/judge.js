'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a personal finance insight judge. You receive structured outputs from multiple financial analysis agents and rank them into a prioritized insight feed.

Score each insight on these four dimensions (1-5 each):
- actionability: Can the user act on this today?
- urgency: Is this time-sensitive?
- crossDomainRelevance: Does this connect spending behavior with investment behavior?
- confidence: How strong is the underlying signal?

Return ONLY valid JSON in this exact format:
{
  "insights": [
    {
      "source": "<agent name: spending|anomaly|goals|portfolio|market|autopilot|watchlist>",
      "message": "<insight message>",
      "severity": "<high|medium|low|info based on urgency+actionability>",
      "actionability": <1-5>,
      "urgency": <1-5>,
      "crossDomainRelevance": <1-5>,
      "confidence": <1-5>,
      "score": <sum of the four dimensions>
    }
  ]
}

Include all non-trivial insights. Sort by score descending. Do not include any text outside the JSON object.`;

/**
 * Synthesizes agent outputs into a prioritized insight feed via LLM-as-judge.
 * Falls back to flattened raw insights if Anthropic API fails.
 *
 * @param {Object} agentOutputs - { spending, anomaly, goals, portfolio, market, autopilot }
 * @returns {Promise<Array>} - ranked insights with score fields
 */
async function runJudge(agentOutputs) {
  // Build message → original insight metadata lookup so we can merge it back after judge strips fields
  const metaByMessage = {};
  for (const insights of Object.values(agentOutputs)) {
    for (const ins of (Array.isArray(insights) ? insights : [])) {
      if (ins.message) metaByMessage[ins.message] = ins;
    }
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here are the outputs from all financial analysis agents. Please score and rank them:\n\n${JSON.stringify(agentOutputs, null, 2)}`,
        },
      ],
    });

    const text = response.content[0].text;
    const parsed = JSON.parse(text);
    // Merge original metadata (type, txId, amount, date, ticker, merchant) back into scored insights
    return parsed.insights.map(ins => ({
      ...(metaByMessage[ins.message] || {}),
      ...ins,
    }));
  } catch {
    // Fallback: flatten all agent outputs without scoring
    return Object.values(agentOutputs).flat();
  }
}

module.exports = { runJudge };
