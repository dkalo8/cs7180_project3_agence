import { useState, useEffect } from 'react';
import AppNav from '../components/AppNav';
import api from '../api/client';

const CATEGORY_LABELS = {
  FOOD_AND_DRINK: 'Food & Drink',
  TRAVEL: 'Travel',
  SHOPPING: 'Shopping',
  ENTERTAINMENT: 'Entertainment',
  RENT_AND_UTILITIES: 'Rent & Utilities',
  GENERAL_SERVICES: 'Services',
  TRANSFER_OUT: 'Transfers',
  INCOME: 'Income',
  OTHER: 'Other',
};

function labelFor(cat) {
  return CATEGORY_LABELS[cat] || cat?.replace(/_/g, ' ') || 'Other';
}

function fmt(n) {
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function filterByMonths(transactions, months) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  cutoff.setHours(0, 0, 0, 0);
  return transactions.filter(tx => new Date(tx.date + 'T00:00:00') >= cutoff);
}

const MONTH_OPTIONS = [
  { label: 'This Month', value: 1 },
  { label: '3 Months',   value: 3 },
  { label: '6 Months',   value: 6 },
];

export default function Expenses() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/transactions')
      .then(({ data }) => {
        setAllTransactions(data.transactions || []);
        setCategories(data.categories || []);
      })
      .catch(() => setError('Could not load transactions.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterByMonths(allTransactions, months);
  const maxCategoryTotal = Math.max(...categories.map(c => c.currentTotal), 1);

  return (
    <div className="page">
      <AppNav />
      <main>
        <div className="page-header">
          <h2>Expenses</h2>
          <div className="period-btns">
            {MONTH_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`period-btn${months === opt.value ? ' active' : ''}`}
                onClick={() => setMonths(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="muted">Loading transactions…</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && allTransactions.length === 0 && (
          <div className="empty-state">
            <p>No transactions yet.</p>
            <p className="muted">Connect your bank account on the dashboard to pull in your spending data.</p>
          </div>
        )}

        {!loading && allTransactions.length > 0 && (
          <>
            {/* Category breakdown */}
            <section className="expenses-section">
              <h3 className="dash-section-title">Spending by Category</h3>
              <div className="category-bars">
                {categories
                  .filter(c => c.currentTotal > 0)
                  .map(cat => (
                    <div key={cat.name} className="category-bar-row">
                      <div className="category-bar-label">
                        <span>{labelFor(cat.name)}</span>
                        <span className="category-bar-totals">
                          ${fmt(cat.currentTotal)}
                          {cat.momDelta !== 0 && (
                            <span className={cat.momDelta > 0 ? 'loss' : 'gain'} style={{ marginLeft: '0.4rem', fontSize: '0.78rem' }}>
                              {cat.momDelta > 0 ? '↑' : '↓'} ${fmt(cat.momDelta)} MoM
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="category-bar-track">
                        <div
                          className="category-bar-fill"
                          style={{ width: `${(cat.currentTotal / maxCategoryTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            {/* Transaction list */}
            <section className="expenses-section">
              <h3 className="dash-section-title">
                Transactions
                <span className="dash-section-link">{filtered.length} shown</span>
              </h3>
              {filtered.length === 0 ? (
                <p className="muted">No transactions in this period.</p>
              ) : (
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Merchant</th>
                      <th>Category</th>
                      <th className="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(tx => (
                      <tr key={tx.id}>
                        <td className="tx-date">{tx.date}</td>
                        <td>{tx.merchant_name || '—'}</td>
                        <td><span className="tx-category">{labelFor(tx.category)}</span></td>
                        <td className="right">${fmt(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
