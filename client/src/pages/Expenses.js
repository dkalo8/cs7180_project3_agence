import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AppNav from '../components/AppNav';
import { getTransactions } from '../api/apiCache';

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
  if (months === 0) return transactions;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  cutoff.setHours(0, 0, 0, 0);
  return transactions.filter(tx => new Date(tx.date) >= cutoff);
}

function buildCategories(transactions) {
  const groups = {};
  for (const tx of transactions) {
    const cat = tx.category || 'OTHER';
    groups[cat] = (groups[cat] || 0) + parseFloat(tx.amount);
  }
  return Object.entries(groups)
    .map(([name, total]) => ({ name, total: parseFloat(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total);
}

const MONTH_OPTIONS = [
  { label: 'All', value: 0 },
  { label: '1 Month', value: 1 },
  { label: '3 Months', value: 3 },
  { label: '6 Months', value: 6 },
  { label: '1 Year', value: 12 },
];

export default function Expenses() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [months, setMonths] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();
  const highlightRef = useRef(null);
  const searchParams = new URLSearchParams(location.search);
  const highlightTxId = searchParams.get('txId');
  const highlightAmount = searchParams.get('amount');
  const highlightDate = searchParams.get('date');
  const highlightMerchant = searchParams.get('merchant');

  useEffect(() => {
    getTransactions()
      .then(transactions => setAllTransactions(transactions))
      .catch(() => setError('Could not load transactions.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [loading]);

  const filtered = filterByMonths(allTransactions, months);
  const categories = buildCategories(filtered);
  const maxCategoryTotal = Math.max(...categories.map(c => c.total), 1);

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
                  .filter(c => c.total > 0)
                  .map(cat => (
                    <div key={cat.name} className="category-bar-row">
                      <div className="category-bar-label">
                        <span>{labelFor(cat.name)}</span>
                        <span className="category-bar-totals">${fmt(cat.total)}</span>
                      </div>
                      <div className="category-bar-track">
                        <div
                          className="category-bar-fill"
                          style={{ width: `${(cat.total / maxCategoryTotal) * 100}%` }}
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
                    {(() => {
                      let firstMatch = true;
                      return filtered.map(tx => {
                        const txMerchant = (tx.merchant_name || tx.merchant || '').toLowerCase();
                        const txAbsAmt = Math.abs(parseFloat(tx.amount));
                        const hlAbsAmt = Math.abs(parseFloat(highlightAmount || '0'));
                        const isMatch = highlightTxId
                          ? tx.id === highlightTxId
                          : highlightAmount != null && highlightDate
                            ? Math.abs(txAbsAmt - hlAbsAmt) < 0.01 &&
                              String(tx.date).slice(0, 10) === String(highlightDate).slice(0, 10)
                            : highlightAmount != null && highlightMerchant
                              ? Math.abs(txAbsAmt - hlAbsAmt) < 0.01 &&
                                txMerchant === highlightMerchant.toLowerCase()
                              : highlightAmount != null &&
                                Math.abs(txAbsAmt - hlAbsAmt) < 0.01;
                        const setRef = isMatch && firstMatch;
                        if (setRef) firstMatch = false;
                        return (
                          <tr
                            key={tx.id}
                            ref={setRef ? highlightRef : null}
                            className={isMatch ? 'tx-highlight' : ''}
                          >
                            <td className="tx-date">{String(tx.date).slice(0, 10)}</td>
                            <td>{tx.merchant_name || '—'}</td>
                            <td><span className="tx-category">{labelFor(tx.category)}</span></td>
                            <td className="right">${fmt(tx.amount)}</td>
                          </tr>
                        );
                      });
                    })()}
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
