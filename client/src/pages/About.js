import AppNav from '../components/AppNav';

const AGENTS = [
  {
    name: 'Spending Agent',
    icon: '💳',
    source: 'Plaid',
    what: 'Categorizes every transaction and compares month-over-month. Flags budget overruns before they snowball.',
    why: 'Most budgeting apps show you what happened. Agence tells you what it means.',
  },
  {
    name: 'Anomaly Agent',
    icon: '🔍',
    source: 'Plaid',
    what: 'Detects unusual charges — large one-offs, duplicate transactions, and repeated identical amounts.',
    why: 'Catches fraud signals and billing errors you\'d miss scrolling a transaction list.',
  },
  {
    name: 'Goals Agent',
    icon: '🎯',
    source: 'Plaid',
    what: 'Tracks pace toward each savings goal. Projects completion date based on current contribution rate.',
    why: 'Turns abstract targets into a live countdown with a clear verdict: on track or off.',
  },
  {
    name: 'Portfolio Agent',
    icon: '📈',
    source: 'Alpaca',
    what: 'Analyzes position concentration, unrealized P&L, and portfolio composition against your risk profile.',
    why: 'Surfaces the risks hiding inside a healthy-looking total return number.',
  },
  {
    name: 'Market Context Agent',
    icon: '🌐',
    source: 'Alpaca + Finnhub',
    what: 'Pulls real-time price moves and news sentiment for every ticker on your watchlist.',
    why: 'Connects market events to your actual holdings — not just a generic feed.',
  },
  {
    name: 'Autopilot Agent',
    icon: '🤖',
    source: 'Alpaca',
    what: 'Evaluates your rule-based triggers against live market conditions and executes paper trades automatically.',
    why: 'Lets you test trading strategies in a risk-free paper environment without manual order entry.',
  },
];

const NAV_GUIDE = [
  { path: 'Dashboard', desc: 'Portfolio equity hero, account balances, and your top AI insight. The one screen that tells you if today needs attention.' },
  { path: 'Insights', desc: 'Ranked feed of everything the agents found — sorted by severity. Clickable cards deep-link to the relevant page.' },
  { path: 'Money → Expenses', desc: 'Full transaction history with category breakdown bars and month-over-month comparison.' },
  { path: 'Money → Goals', desc: 'Create savings goals, track progress bars, and drag to reprioritize.' },
  { path: 'Markets → Portfolio', desc: 'Live positions, P&L, and trade history. Place paper orders directly from this page.' },
  { path: 'Markets → Watchlist', desc: 'Add tickers to track. See real-time prices, 24h change, and latest news sentiment per symbol.' },
  { path: 'Account → Settings', desc: 'Connect bank accounts via Plaid, set risk tolerance, manage household sharing, and toggle personal vs. household view.' },
];

export default function About() {
  return (
    <div className="page">
      <style>{`
        @media (max-width: 640px) {
          .about-step-row { flex-wrap: wrap !important; }
          .about-step-label { min-width: unset !important; width: 100%; }
          .about-nav-row { flex-wrap: wrap !important; }
          .about-nav-label { min-width: unset !important; width: 100%; }
        }
      `}</style>
      <AppNav />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 2.5rem 4rem' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.4rem, 6vw, 3.6rem)',
            fontWeight: 600,
            color: 'var(--navy-800)',
            marginBottom: '0.5rem',
            lineHeight: 1.15,
          }}>
            Agents + Finance = Agence
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            maxWidth: 560,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Six AI agents analyze your complete financial picture simultaneously.
            A judge synthesizes their outputs into one ranked, actionable insight feed.
          </p>
        </div>

        {/* The problem */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 className="section-heading">The Problem</h2>
          <div className="insight-card" style={{ padding: '1.5rem 1.75rem', flexDirection: 'column', alignItems: 'flex-start' }}>
            <p style={{ margin: 0, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
              Robinhood and Rocket Money both exist — but they don't talk to each other.
              Your spending behavior and your investment behavior are deeply connected,
              yet no mainstream product surfaces that connection. Agence does.
              When your dining spend spikes the same month your portfolio dips,
              Agence sees both and tells you.
            </p>
          </div>
        </section>

        {/* Architecture */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 className="section-heading">How It Works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              ['1. Connect', 'Link your bank via Plaid and your paper trading account via Alpaca. Data stays in your account — never sold or shared.'],
              ['2. Agents run in parallel', 'All six agents fire simultaneously via Promise.all. No sequential bottlenecks — the full analysis takes as long as the slowest agent, not their sum.'],
              ['3. LLM-as-judge synthesizes', 'Claude (claude-sonnet-4-6) receives every agent\'s raw output and ranks insights by urgency, impact, and actionability into a single prioritized feed.'],
              ['4. You act', 'Click any insight card to jump directly to the relevant page — the transaction, goal, or position that triggered it.'],
            ].map(([step, desc]) => (
              <div key={step} className="about-step-row" style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                background: 'var(--bg-surface)',
                border: '1px solid var(--navy-200)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
              }}>
                <span className="about-step-label" style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: 'var(--navy-600)',
                  minWidth: 200,
                  flexShrink: 0,
                  paddingTop: 2,
                }}>{step}</span>
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}>{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Agent cards */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 className="section-heading">The Six Agents</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {AGENTS.map(agent => (
              <div key={agent.name} className="insight-card" style={{ padding: '1.25rem 1.4rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{agent.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{agent.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>via {agent.source}</div>
                  </div>
                </div>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {agent.what}
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--navy-400)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {agent.why}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Nav guide */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 className="section-heading">Navigating the App</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {NAV_GUIDE.map(({ path, desc }) => (
              <div key={path} className="about-nav-row" style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                padding: '0.75rem 1rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--navy-200)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <code className="about-nav-label" style={{
                  fontSize: '0.8rem',
                  background: 'var(--navy-100)',
                  color: 'var(--navy-600)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 6,
                  whiteSpace: 'nowrap',
                  minWidth: 200,
                  display: 'inline-block',
                }}>{path}</code>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section>
          <h2 className="section-heading">Tech Stack</h2>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            {[
              'React', 'Node.js + Express', 'PostgreSQL', 'JWT Auth',
              'Anthropic Claude', 'Plaid API', 'Alpaca Paper Trading',
              'Finnhub News', 'Claude Code', 'Render + Vercel', 'GitHub Actions CI',
            ].map(tech => (
              <span key={tech} style={{
                background: 'var(--navy-100)',
                color: 'var(--navy-600)',
                padding: '0.3rem 0.75rem',
                borderRadius: 20,
                fontSize: '0.82rem',
                fontWeight: 500,
              }}>{tech}</span>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
