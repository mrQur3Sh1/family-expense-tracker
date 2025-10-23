import React, { useState, useEffect } from 'react';
import { Wallet, Calendar, Plus, Trash2, TrendingDown, Edit2 } from 'lucide-react';

const API_BASE = '/api';

const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  try {
    const cleaned = String(v).replace(/[^\d.-]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

const ExpenseTracker = () => {
  // App states
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState(null);

  // Budget form
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetDays, setBudgetDays] = useState('30');
  const [budgetDate, setBudgetDate] = useState(new Date().toISOString().split('T')[0]);

  // Expense form
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('groceries');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    initializeApp();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeApp = () => {
    const savedBudgetRaw = localStorage.getItem('budget');
    const savedExpensesRaw = localStorage.getItem('expenses');

    if (savedBudgetRaw) {
      try {
        const b = JSON.parse(savedBudgetRaw);
        if (b) setBudget({ ...b, amount: toNumber(b.amount) });
      } catch (e) {
        console.warn('parse saved budget', e);
      }
    }

    if (savedExpensesRaw) {
      try {
        const arr = JSON.parse(savedExpensesRaw) || [];
        setExpenses(arr.map(exp => ({ ...exp, amount: toNumber(exp.amount) })));
      } catch (e) {
        console.warn('parse saved expenses', e);
      }
    }

    if (navigator.onLine) syncWithBackend();
  };

  const syncWithBackend = async () => {
    try {
      // Budget sync
      const budgetRes = await fetch(`${API_BASE}/budget`);
      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        if (budgetData) {
          const formattedBudget = {
            amount: toNumber(budgetData.amount),
            startDate: budgetData.start_date,
            endDate: budgetData.end_date,
            days: budgetData.days
          };
          setBudget(formattedBudget);
          localStorage.setItem('budget', JSON.stringify(formattedBudget));
        } else {
          // backend explicitly returned null -> clear frontend
          setBudget(null);
          localStorage.removeItem('budget');
        }
      } else {
        // non-OK: treat as no budget
        setBudget(null);
        localStorage.removeItem('budget');
      }

      // Expenses sync
      const expensesRes = await fetch(`${API_BASE}/expenses`);
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        const formattedExpenses = (expensesData || []).map(exp => ({
          id: exp.id,
          name: exp.name,
          amount: toNumber(exp.amount),
          category: exp.category,
          date: exp.date
        }));
        setExpenses(formattedExpenses);
        localStorage.setItem('expenses', JSON.stringify(formattedExpenses));
      }
      setError(null);
    } catch (err) {
      console.log('Backend sync failed', err);
      setError('Offline or sync error');
    }
  };

  const handleAddBudget = async () => {
    if (!budgetAmount || !budgetDays) return;
    const endDate = new Date(budgetDate);
    endDate.setDate(endDate.getDate() + parseInt(budgetDays, 10));
    const budgetData = {
      amount: toNumber(budgetAmount),
      startDate: budgetDate,
      endDate: endDate.toISOString().split('T')[0],
      days: parseInt(budgetDays, 10)
    };

    setBudget(budgetData);
    localStorage.setItem('budget', JSON.stringify(budgetData));
    setBudgetAmount(''); setBudgetDays('30'); setBudgetDate(new Date().toISOString().split('T')[0]);
    setShowAddBudget(false);

    if (isOnline) {
      try {
        await fetch(`${API_BASE}/budget`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(budgetData)
        });
      } catch (err) {
        console.warn('backend save budget failed', err);
      }
    }
  };

  const handleDeleteBudget = async () => {
    const ok = window.confirm('Delete current budget? This will remove it from the app and the database.');
    if (!ok) return;

    // Optimistically clear
    setBudget(null);
    localStorage.removeItem('budget');

    if (isOnline) {
      try {
        const res = await fetch(`${API_BASE}/budget`, { method: 'DELETE' });
        if (!res.ok) {
          console.warn('Server delete failed', res.status);
          // try to re-sync
          syncWithBackend();
        }
      } catch (err) {
        console.warn('Delete call failed', err);
      }
    }
  };

  const handleAddExpense = async () => {
    if (!expenseName || !expenseAmount) return;

    const newExpense = {
      id: Date.now(),
      name: expenseName,
      amount: toNumber(expenseAmount),
      category: expenseCategory,
      date: expenseDate
    };

    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));

    setExpenseName('');
    setExpenseAmount('');
    setExpenseCategory('groceries');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setShowAddExpense(false);

    if (isOnline) {
      try {
        const response = await fetch(`${API_BASE}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newExpense.name,
            amount: newExpense.amount,
            category: newExpense.category,
            date: newExpense.date
          })
        });

        if (response.ok) {
          const savedExpense = await response.json();
          const normalized = {
            id: savedExpense.id ?? newExpense.id,
            name: savedExpense.name ?? newExpense.name,
            amount: toNumber(savedExpense.amount ?? newExpense.amount),
            category: savedExpense.category ?? newExpense.category,
            date: savedExpense.date ?? newExpense.date
          };
          const replaced = updatedExpenses.map(exp => exp.id === newExpense.id ? normalized : exp);
          setExpenses(replaced);
          localStorage.setItem('expenses', JSON.stringify(replaced));
        }
      } catch (err) {
        console.warn('Backend save failed, data saved locally', err);
      }
    }
  };

  const handleDeleteExpense = async (id) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(updatedExpenses);
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));

    if (isOnline) {
      try {
        await fetch(`${API_BASE}/expenses?id=${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn('Backend delete failed', err);
      }
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0);
  const budgetAmountNumber = budget ? toNumber(budget.amount) : 0;
  const remaining = budget ? (budgetAmountNumber - totalExpenses) : 0;
  const percentUsed = (budgetAmountNumber > 0) ? (totalExpenses / budgetAmountNumber) * 100 : 0;

  const categories = {
    groceries: { icon: '🛒', label: 'Groceries' },
    kitchen: { icon: '🍳', label: 'Kitchen' },
    utilities: { icon: '⚡', label: 'Utilities' },
    transportation: { icon: '🚗', label: 'Transport' },
    healthcare: { icon: '🏥', label: 'Healthcare' },
    entertainment: { icon: '🎬', label: 'Entertainment' },
    other: { icon: '📦', label: 'Other' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`} />
            <span className="text-xs text-gray-600">{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>
          {error && <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">Working offline</div>}
        </div>

        {/* Header / budget area */}
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6 mb-6 border border-purple-100">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Wallet className="text-purple-600" size={28} />
                <span>Family Budget</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Track your monthly expenses</p>
            </div>
          </div>

          {budget ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm text-gray-600 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} />
                  <span>{budget.days} days ({new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowAddBudget(true)} className="text-purple-600 hover:text-purple-700 flex items-center gap-1 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-purple-200">
                    <Edit2 size={14} /> <span className="sr-only">Edit budget</span>
                  </button>
                  <button onClick={handleDeleteBudget} className="text-red-600 hover:text-red-700 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-red-200">
                    Delete
                  </button>
                </div>
              </div>

              {/* Responsive cards: 1 column on mobile, 3 on md */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="text-sm text-gray-600 mb-2">Total Budget</div>
                  <div className="text-lg sm:text-xl font-bold text-purple-600">
                    ₨{budgetAmountNumber.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                  <div className="text-sm text-gray-600 mb-2">Spent</div>
                  <div className="text-lg sm:text-xl font-bold text-red-600">
                    ₨{totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="text-sm text-gray-600 mb-2">Remaining</div>
                  <div className="text-lg sm:text-xl font-bold text-green-600">
                    ₨{(Number.isFinite(remaining) ? remaining : 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 overflow-hidden">
                  <div
                    className={`h-3 sm:h-4 rounded-full transition-all duration-500 ${percentUsed > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : percentUsed > 70 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-green-500 to-green-600'}`}
                    style={{ width: `${Math.min(Math.max(percentUsed, 0), 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">{(Number.isFinite(percentUsed) ? percentUsed.toFixed(1) : 0)}% used</span>
                  <span className={`font-medium ${remaining < 0 ? 'text-red-600' : percentUsed > 90 ? 'text-orange-600' : 'text-green-600'}`}>
                    {remaining < 0 ? `₨${Math.abs(remaining).toLocaleString(undefined, {minimumFractionDigits: 2})} over budget` : `₨${remaining.toLocaleString(undefined, {minimumFractionDigits: 2})} left`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-4">
                <Wallet className="mx-auto text-purple-600 mb-3" size={40} />
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Set Your Monthly Budget</h3>
                <p className="text-sm text-gray-600 mb-4">Get started by setting your budget amount</p>
                <button onClick={() => setShowAddBudget(true)} className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg text-base font-semibold">
                  <Plus size={18} className="inline mr-2" /> Set Budget
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Expense Button */}
        {budget && (
          <div className="mb-6">
            <button onClick={() => setShowAddExpense(true)} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-xl transition transform active:scale-95 text-lg font-semibold flex items-center justify-center gap-3">
              <Plus size={20} /> Add New Expense
            </button>
          </div>
        )}

        {/* Add Budget Modal */}
        {showAddBudget && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            role="dialog"
            aria-modal="true"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddBudget(false)} />
            <div className="w-full sm:max-w-md bg-white rounded-t-xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl transform translate-y-0 sm:translate-y-0"
                 style={{ maxHeight: '92vh', overflow: 'auto' }}>
              <h2 className="text-xl font-bold text-center mb-4">Set Your Budget</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Amount (₨)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300 text-lg"
                    placeholder="150000"
                    aria-label="Budget amount"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Days</label>
                    <input type="number" value={budgetDays} onChange={(e) => setBudgetDays(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300" aria-label="Number of days" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input type="date" value={budgetDate} onChange={(e) => setBudgetDate(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300" aria-label="Budget start date"/>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setShowAddBudget(false)} className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleAddBudget} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Expense Modal (bottom-sheet on mobile) */}
        {showAddExpense && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddExpense(false)} />
            <div className="w-full sm:max-w-md bg-white rounded-t-xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl" style={{ maxHeight: '92vh', overflow: 'auto' }}>
              <h2 className="text-xl font-bold text-center mb-4">Add Expense</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">What did you buy?</label>
                  <input type="text" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Vegetables, Rice, etc." aria-label="Expense name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₨)</label>
                  <input type="number" inputMode="numeric" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg" placeholder="5000" aria-label="Expense amount" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                    {Object.entries(categories).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" aria-label="Expense date" />
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setShowAddExpense(false)} className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleAddExpense} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold">Add Expense</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expenses list */}
        <div className="space-y-4">
          {expenses.length > 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6 border border-purple-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingDown className="text-red-600" /> Recent Expenses <span className="text-sm text-gray-500 ml-auto">{expenses.length} item{expenses.length !== 1 ? 's' : ''}</span></h2>
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="flex items-start sm:items-center gap-3 w-full">
                      <div className="text-2xl">{categories[expense.category]?.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 truncate">{expense.name}</div>
                        <div className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()} • {categories[expense.category]?.label}</div>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-0 flex items-center gap-3">
                      <div className="font-bold text-red-600 text-lg">₨{toNumber(expense.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      <button onClick={() => handleDeleteExpense(expense.id)} aria-label={`Delete ${expense.name}`} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            budget && (
              <div className="bg-white rounded-3xl shadow-xl p-6 border border-purple-100 text-center">
                <h3 className="text-lg font-semibold text-gray-800">No expenses yet</h3>
                <p className="text-sm text-gray-600 mb-4">Start tracking your spending to stay within budget</p>
                <button onClick={() => setShowAddExpense(true)} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold">Add Your First Expense</button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;