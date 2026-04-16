const spendingAgent = require('./spendingAgent');

const makeTransaction = (id, amount, category, date) => ({ id, amount, category, date, name: 'Test' });

// Current and prior month helpers
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const priorMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const dateIn = (ym) => `${ym}-10`;

describe('spendingAgent', () => {
  describe('edge cases', () => {
    it('returns empty array when transactions is empty', () => {
      const result = spendingAgent({ transactions: [] }, {});
      expect(result).toEqual([]);
    });

    it('returns empty array when userData has no transactions key', () => {
      const result = spendingAgent({}, {});
      expect(result).toEqual([]);
    });

    it('returns empty array when userData is null', () => {
      const result = spendingAgent(null, {});
      expect(result).toEqual([]);
    });
  });

  describe('insight shape', () => {
    it('every insight has type, message, and severity', () => {
      const cm = currentMonth();
      const userData = {
        transactions: [
          makeTransaction(1, 100, 'Food & Drink', dateIn(cm)),
          makeTransaction(2, 50,  'Transport',    dateIn(cm)),
        ],
      };
      const results = spendingAgent(userData, {});
      expect(results.length).toBeGreaterThan(0);
      results.forEach((insight) => {
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('message');
        expect(insight).toHaveProperty('severity');
        expect(['info', 'medium']).toContain(insight.severity);
      });
    });
  });

  describe('top_category insight', () => {
    it('identifies the highest-spend category', () => {
      const cm = currentMonth();
      const userData = {
        transactions: [
          makeTransaction(1, 320, 'Food & Drink', dateIn(cm)),
          makeTransaction(2, 80,  'Transport',    dateIn(cm)),
          makeTransaction(3, 50,  'Shopping',     dateIn(cm)),
        ],
      };
      const results = spendingAgent(userData, {});
      const insight = results.find((i) => i.type === 'top_category');
      expect(insight).toBeDefined();
      expect(insight.message).toContain('Food & Drink');
      expect(insight.severity).toBe('info');
    });
  });

  describe('category_spike insight', () => {
    it('flags a category that exceeds 30% of total spend', () => {
      const cm = currentMonth();
      const userData = {
        transactions: [
          makeTransaction(1, 420, 'Food & Drink', dateIn(cm)), // 84% of 500
          makeTransaction(2, 80,  'Transport',    dateIn(cm)),
        ],
      };
      const results = spendingAgent(userData, {});
      const insight = results.find((i) => i.type === 'category_spike');
      expect(insight).toBeDefined();
      expect(insight.message).toContain('Food & Drink');
      expect(insight.severity).toBe('medium');
    });

    it('does not flag when no category exceeds 30%', () => {
      const cm = currentMonth();
      const userData = {
        transactions: [
          makeTransaction(1, 100, 'Food & Drink', dateIn(cm)),
          makeTransaction(2, 100, 'Transport',    dateIn(cm)),
          makeTransaction(3, 100, 'Shopping',     dateIn(cm)),
          makeTransaction(4, 100, 'Bills',        dateIn(cm)),
        ],
      };
      const results = spendingAgent(userData, {});
      const insight = results.find((i) => i.type === 'category_spike');
      expect(insight).toBeUndefined();
    });
  });

  describe('monthly_increase insight', () => {
    it('flags spend increase greater than 20% vs prior month', () => {
      const cm = currentMonth();
      const pm = priorMonth();
      const userData = {
        transactions: [
          makeTransaction(1, 500, 'Food & Drink', dateIn(cm)), // current: 500
          makeTransaction(2, 400, 'Food & Drink', dateIn(pm)), // prior:   400 → +25%
        ],
      };
      const results = spendingAgent(userData, {});
      const insight = results.find((i) => i.type === 'monthly_increase');
      expect(insight).toBeDefined();
      expect(insight.severity).toBe('medium');
    });

    it('does not flag spend increase of 20% or less', () => {
      const cm = currentMonth();
      const pm = priorMonth();
      const userData = {
        transactions: [
          makeTransaction(1, 480, 'Food & Drink', dateIn(cm)), // +20% exactly
          makeTransaction(2, 400, 'Food & Drink', dateIn(pm)),
        ],
      };
      const results = spendingAgent(userData, {});
      const insight = results.find((i) => i.type === 'monthly_increase');
      expect(insight).toBeUndefined();
    });

    it('does not flag when there are no prior month transactions', () => {
      const cm = currentMonth();
      const userData = {
        transactions: [
          makeTransaction(1, 500, 'Food & Drink', dateIn(cm)),
        ],
      };
      const results = spendingAgent(userData, {});
      const insight = results.find((i) => i.type === 'monthly_increase');
      expect(insight).toBeUndefined();
    });
  });
});
