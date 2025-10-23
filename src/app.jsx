import React, { useState, useEffect } from 'react';
import { Wallet, Calendar, Plus, Trash2, TrendingDown, Edit2, X } from 'lucide-react';

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
          setBudget(null);
          localStorage.removeItem('budget');
        }
      } else {
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

    setBudget(null);
    localStorage.removeItem('budget');

    if (isOnline) {
      try {
        const res = await fetch(`${API_BASE}/budget`, { method: 'DELETE' });
        if (!res.ok) {
          console.warn('Server delete failed', res.status);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-4 px-3 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'} shadow-lg`} />
            <span className="text-xs sm:text-sm text-gray-600 font-medium">{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>
          {error && <div className="text-xs sm:text-sm text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg shadow-sm">Working offline</div>}
        </div>

        {/* Header / budget area */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-8 mb-5 sm:mb-6 border border-purple-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                <Wallet className="text-purple-600" size={28} />
                <span className="sm:inline">Family Budget</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Track your monthly expenses</p>
            </div>
          </div>

          {budget ? (
            <div className="space-y-5 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <Calendar size={16} className="flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{budget.days} days ({new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()})</span>
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowAddBudget(true)} className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all text-xs sm:text-sm font-medium">
                    <Edit2 size={14} /> Edit
                  </button>
                  <button onClick={handleDeleteBudget} className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all text-xs sm:text-sm font-medium">
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl sm:rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs sm:text-sm text-gray-600 mb-2 font-medium">Total Budget</div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">
                    ₨{budgetAmountNumber.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
                <div className="text-center p-4 sm:p-5 bg-gradient-to-br from-red-50 to-red-100 rounded-xl sm:rounded-2xl border border-red-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs sm:text-sm text-gray-600 mb-2 font-medium">Spent</div>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">
                    ₨{totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
                <div className="text-center p-4 sm:p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs sm:text-sm text-gray-600 mb-2 font-medium">Remaining</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    ₨{(Number.isFinite(remaining) ? remaining : 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 shadow-inner overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${percentUsed > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : percentUsed > 70 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-green-500 to-green-600'}`}
                    style={{ width: `${Math.min(Math.max(percentUsed, 0), 100)}%` }}
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2 text-xs sm:text-sm">
                  <span className="text-gray-600 font-medium">{(Number.isFinite(percentUsed) ? percentUsed.toFixed(1) : 0)}% used</span>
                  <span className={`font-semibold ${remaining < 0 ? 'text-red-600' : percentUsed > 90 ? 'text-orange-600' : 'text-green-600'}`}>
                    {remaining < 0 ? `₨${Math.abs(remaining).toLocaleString(undefined, {minimumFractionDigits: 2})} over budget` : `₨${remaining.toLocaleString(undefined, {minimumFractionDigits: 2})} left`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6 sm:p-8">
                <Wallet className="mx-auto text-purple-600 mb-4" size={48} />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Set Your Monthly Budget</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-6">Get started by setting your budget amount</p>
                <button onClick={() => setShowAddBudget(true)} className="w-full sm:w-auto sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl text-sm sm:text-base mx-auto">
                  <Plus size={20} /> Set Budget
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Expense Button */}
        {budget && (
          <button onClick={() => setShowAddExpense(true)} className="w-full mb-5 sm:mb-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl sm:rounded-3xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 sm:gap-3 font-semibold text-base sm:text-lg border border-purple-200">
            <Plus size={20} className="sm:w-6 sm:h-6" /> Add New Expense
          </button>
        )}

        {/* Add Budget Modal */}
        {showAddBudget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Set Your Budget</h2>
                <button onClick={() => setShowAddBudget(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Monthly Amount (₨)</label>
                  <input type="number" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base sm:text-lg transition-all" placeholder="150000" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Days</label>
                  <input type="number" value={budgetDays} onChange={(e) => setBudgetDays(e.target.value)} className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="30" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                  <input type="date" value={budgetDate} onChange={(e) => setBudgetDate(e.target.value)} className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button onClick={() => setShowAddBudget(false)} className="flex-1 py-3 sm:py-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all">Cancel</button>
                  <button onClick={handleAddBudget} className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all">Save Budget</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Expense Modal */}
        {showAddExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Add Expense</h2>
                <button onClick={() => setShowAddExpense(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">What did you buy?</label>
                  <input type="text" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="Vegetables, Rice, etc." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₨)</label>
                  <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base sm:text-lg transition-all" placeholder="5000" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white">
                    {Object.entries(categories).map(([key, val]) => (
                      <option key={key} value={key}>{val.icon} {val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                  <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button onClick={() => setShowAddExpense(false)} className="flex-1 py-3 sm:py-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all">Cancel</button>
                  <button onClick={handleAddExpense} className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all">Add Expense</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expenses list */}
        {expenses.length > 0 && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-6 border border-purple-100">
            <h2 className="text-lg sm:text-xl font-bold mb-5 sm:mb-6 flex items-center gap-2">
              <TrendingDown className="text-red-600" size={20} /> 
              <span>Recent Expenses</span>
              <span className="text-xs sm:text-sm font-normal text-gray-500 ml-auto">{expenses.length} item{expenses.length !== 1 ? 's' : ''}</span>
            </h2>
            <div className="space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-2">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all border border-gray-200 gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="text-2xl sm:text-3xl flex-shrink-0">{categories[expense.category].icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-800 text-sm sm:text-base truncate">{expense.name}</div>
                      <div className="text-xs sm:text-sm text-gray-500 truncate">{new Date(expense.date).toLocaleDateString()} • {categories[expense.category].label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <span className="font-bold text-red-600 text-sm sm:text-lg whitespace-nowrap">₨{toNumber(expense.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <button onClick={() => handleDeleteExpense(expense.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all flex-shrink-0">
                      <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {expenses.length === 0 && budget && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 border border-purple-100 text-center">
            <TrendingDown className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">No expenses yet</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">Start tracking your spending to stay within budget</p>
            <button onClick={() => setShowAddExpense(true)} className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base">Add Your First Expense</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseTracker;