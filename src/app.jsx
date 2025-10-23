import React, { useState, useEffect } from 'react';
import { Wallet, Calendar, Plus, Trash2, TrendingDown, Edit2, PieChart, DollarSign, AlertCircle } from 'lucide-react';

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
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetDays, setBudgetDays] = useState('30');
  const [budgetDate, setBudgetDate] = useState(new Date().toISOString().split('T')[0]);

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
  };

  const handleAddBudget = () => {
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
    setBudgetAmount('');
    setBudgetDays('30');
    setBudgetDate(new Date().toISOString().split('T')[0]);
    setShowAddBudget(false);
  };

  const handleDeleteBudget = () => {
    const ok = window.confirm('Delete current budget?');
    if (!ok) return;
    setBudget(null);
    localStorage.removeItem('budget');
  };

  const handleAddExpense = () => {
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
  };

  const handleDeleteExpense = (id) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(updatedExpenses);
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0);
  const budgetAmountNumber = budget ? toNumber(budget.amount) : 0;
  const remaining = budget ? (budgetAmountNumber - totalExpenses) : 0;
  const percentUsed = (budgetAmountNumber > 0) ? (totalExpenses / budgetAmountNumber) * 100 : 0;

  const categories = {
    groceries: { icon: '🛒', label: 'Groceries', color: 'bg-green-100 border-green-300' },
    kitchen: { icon: '🍳', label: 'Kitchen', color: 'bg-orange-100 border-orange-300' },
    utilities: { icon: '⚡', label: 'Utilities', color: 'bg-yellow-100 border-yellow-300' },
    transportation: { icon: '🚗', label: 'Transport', color: 'bg-blue-100 border-blue-300' },
    healthcare: { icon: '🏥', label: 'Healthcare', color: 'bg-red-100 border-red-300' },
    entertainment: { icon: '🎬', label: 'Entertainment', color: 'bg-purple-100 border-purple-300' },
    other: { icon: '📦', label: 'Other', color: 'bg-gray-100 border-gray-300' }
  };

  const categoryStats = Object.keys(categories).map(cat => {
    const total = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + toNumber(e.amount), 0);
    return { category: cat, total, ...categories[cat] };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-purple-100 shadow-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Wallet className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-800">Family Budget</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Smart expense tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} />
              <span className="text-xs text-gray-600 hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Budget & Stats */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Budget Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 lg:p-8 border border-purple-100 transform transition-all hover:shadow-2xl">
              {budget ? (
                <div className="space-y-4 sm:space-y-6">
                  {/* Budget Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Calendar size={16} className="flex-shrink-0" />
                      <span className="truncate">{budget.days} days</span>
                      <span className="hidden md:inline">
                        ({new Date(budget.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(budget.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowAddBudget(true)} className="text-purple-600 hover:text-purple-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors text-sm">
                        <Edit2 size={14} /> <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button onClick={handleDeleteBudget} className="text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors text-sm">
                        <span className="hidden sm:inline">Delete</span>
                        <Trash2 size={14} className="sm:hidden" />
                      </button>
                    </div>
                  </div>

                  {/* Budget Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl sm:rounded-2xl border border-purple-200 transform transition-all hover:scale-105">
                      <DollarSign className="mx-auto mb-1 sm:mb-2 text-purple-600" size={20} />
                      <div className="text-xs text-gray-600 mb-1">Budget</div>
                      <div className="text-base sm:text-xl font-bold text-purple-600 truncate">
                        ₨{budgetAmountNumber.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl sm:rounded-2xl border border-red-200 transform transition-all hover:scale-105">
                      <TrendingDown className="mx-auto mb-1 sm:mb-2 text-red-600" size={20} />
                      <div className="text-xs text-gray-600 mb-1">Spent</div>
                      <div className="text-base sm:text-xl font-bold text-red-600 truncate">
                        ₨{totalExpenses.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl border border-green-200 transform transition-all hover:scale-105">
                      <Wallet className="mx-auto mb-1 sm:mb-2 text-green-600" size={20} />
                      <div className="text-xs text-gray-600 mb-1">Left</div>
                      <div className="text-base sm:text-xl font-bold text-green-600 truncate">
                        ₨{Math.max(remaining, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 sm:space-y-3">
                    <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 shadow-inner overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${percentUsed > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : percentUsed > 70 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-green-500 to-green-600'}`}
                        style={{ width: `${Math.min(Math.max(percentUsed, 0), 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-gray-600 font-medium">{percentUsed.toFixed(1)}% used</span>
                      {remaining < 0 && (
                        <span className="flex items-center gap-1 text-red-600 font-bold animate-pulse">
                          <AlertCircle size={14} />
                          Over budget!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 sm:space-y-6 py-4 sm:py-8">
                  <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6 sm:p-8">
                    <Wallet className="mx-auto text-purple-600 mb-4" size={48} />
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Set Your Budget</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-6">Start tracking your expenses today</p>
                    <button onClick={() => setShowAddBudget(true)} className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">
                      <Plus size={20} /> Set Budget
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Add Expense Button */}
            {budget && (
              <button onClick={() => setShowAddExpense(true)} className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl sm:rounded-3xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 sm:gap-3 font-semibold text-base sm:text-lg border border-purple-200 transform hover:scale-[1.02] active:scale-[0.98]">
                <Plus size={24} /> Add Expense
              </button>
            )}

            {/* Expenses List */}
            {expenses.length > 0 ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 border border-purple-100">
                <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
                  <TrendingDown className="text-red-600" size={24} />
                  <span>Recent Expenses</span>
                  <span className="text-xs sm:text-sm font-normal text-gray-500 ml-auto">{expenses.length} items</span>
                </h2>
                <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl transition-all border border-gray-200 hover:shadow-md transform hover:scale-[1.01]">
                      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <div className="text-2xl sm:text-3xl flex-shrink-0">{categories[expense.category].icon}</div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-800 text-sm sm:text-base truncate">{expense.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            <span className="hidden sm:inline"> • {categories[expense.category].label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        <span className="font-bold text-red-600 text-sm sm:text-lg whitespace-nowrap">
                          ₨{toNumber(expense.amount).toLocaleString()}
                        </span>
                        <button onClick={() => handleDeleteExpense(expense.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : budget && (
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 border border-purple-100 text-center">
                <TrendingDown className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">No expenses yet</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-6">Start tracking your spending</p>
                <button onClick={() => setShowAddExpense(true)} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                  Add First Expense
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Category Breakdown */}
          {budget && categoryStats.length > 0 && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 border border-purple-100 sticky top-24">
                <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
                  <PieChart className="text-purple-600" size={24} />
                  By Category
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  {categoryStats.map((cat) => {
                    const percentage = budgetAmountNumber > 0 ? (cat.total / budgetAmountNumber) * 100 : 0;
                    return (
                      <div key={cat.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl sm:text-2xl">{cat.icon}</span>
                            <span className="text-xs sm:text-sm font-medium text-gray-700">{cat.label}</span>
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-gray-800">
                            ₨{cat.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${cat.color.replace('bg-', 'bg-gradient-to-r from-').replace('-100', '-400 to-').replace('border-', '').replace('-300', '-500')}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">{percentage.toFixed(1)}% of budget</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Budget Modal */}
      {showAddBudget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl transform transition-all animate-slide-up">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {budget ? 'Edit Budget' : 'Set Your Budget'}
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₨)</label>
                <input type="number" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base sm:text-lg transition-all" placeholder="150000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Days</label>
                <input type="number" value={budgetDays} onChange={(e) => setBudgetDays(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" placeholder="30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input type="date" value={budgetDate} onChange={(e) => setBudgetDate(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAddBudget(false)} className="flex-1 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all">
                  Cancel
                </button>
                <button onClick={handleAddBudget} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl transform transition-all animate-slide-up">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Add Expense
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input type="text" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" placeholder="Vegetables, Rice, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₨)</label>
                <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base sm:text-lg transition-all" placeholder="5000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                  {Object.entries(categories).map(([key, val]) => (
                    <option key={key} value={key}>{val.icon} {val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAddExpense(false)} className="flex-1 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all">
                  Cancel
                </button>
                <button onClick={handleAddExpense} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105">
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #9333ea, #ec4899);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #7c3aed, #db2777);
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

//FINAL EXPORT

export default ExpenseTracker;