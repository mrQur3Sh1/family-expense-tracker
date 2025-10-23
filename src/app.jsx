import React, { useState, useEffect } from 'react';
import { Wallet, Calendar, Plus, Trash2, TrendingDown, Edit2 } from 'lucide-react';

const API_BASE = '/api';

const ExpenseTracker = () => {
  // App states only - no authentication states
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Form states
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetDays, setBudgetDays] = useState('30');
  const [budgetDate, setBudgetDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('groceries');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
    
    // Monitor online status
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
    // Load from localStorage immediately for instant startup
    const savedBudget = localStorage.getItem('budget');
    const savedExpenses = localStorage.getItem('expenses');
    
    if (savedBudget) {
      setBudget(JSON.parse(savedBudget));
    }
    
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
    
    // Sync with backend in background if online
    if (navigator.onLine) {
      syncWithBackend();
    }
  };

  const syncWithBackend = async () => {
    try {
      // Sync budget
      const budgetRes = await fetch(`${API_BASE}/budget`);
      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        if (budgetData) {
          const formattedBudget = {
            amount: budgetData.amount,
            startDate: budgetData.start_date,
            endDate: budgetData.end_date,
            days: budgetData.days
          };
          setBudget(formattedBudget);
          localStorage.setItem('budget', JSON.stringify(formattedBudget));
        }
      }
      
      // Sync expenses
      const expensesRes = await fetch(`${API_BASE}/expenses`);
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        const formattedExpenses = expensesData.map(exp => ({
          id: exp.id,
          name: exp.name,
          amount: exp.amount,
          category: exp.category,
          date: exp.date
        }));
        setExpenses(formattedExpenses);
        localStorage.setItem('expenses', JSON.stringify(formattedExpenses));
      }
      
      setError(null);
    } catch (err) {
      // Silently fail - app continues to work offline
      console.log('Backend sync failed, continuing offline');
    }
  };

  const handleAddBudget = async () => {
    if (!budgetAmount || !budgetDays) return;
    
    const endDate = new Date(budgetDate);
    endDate.setDate(endDate.getDate() + parseInt(budgetDays));
    
    const budgetData = {
      amount: parseFloat(budgetAmount),
      startDate: budgetDate,
      endDate: endDate.toISOString().split('T')[0],
      days: parseInt(budgetDays)
    };

    // Save locally first for instant response
    setBudget(budgetData);
    localStorage.setItem('budget', JSON.stringify(budgetData));
    
    setBudgetAmount('');
    setBudgetDays('30');
    setBudgetDate(new Date().toISOString().split('T')[0]);
    setShowAddBudget(false);

    // Sync to backend in background
    if (isOnline) {
      try {
        await fetch(`${API_BASE}/budget`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(budgetData)
        });
      } catch (err) {
        // Silent fail - data already saved locally
        console.log('Backend save failed, data saved locally');
      }
    }
  };

  const handleAddExpense = async () => {
    if (!expenseName || !expenseAmount) return;
    
    const newExpense = {
      id: Date.now(),
      name: expenseName,
      amount: parseFloat(expenseAmount),
      category: expenseCategory,
      date: expenseDate
    };

    // Add locally first for instant response
    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
    
    setExpenseName('');
    setExpenseAmount('');
    setExpenseCategory('groceries');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setShowAddExpense(false);

    // Sync to backend in background
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
          // Update with real ID from backend
          const updatedWithRealId = updatedExpenses.map(exp => 
            exp.id === newExpense.id ? { ...exp, id: savedExpense.id } : exp
          );
          setExpenses(updatedWithRealId);
          localStorage.setItem('expenses', JSON.stringify(updatedWithRealId));
        }
      } catch (err) {
        // Silent fail - data already saved locally
        console.log('Backend save failed, data saved locally');
      }
    }
  };

  const handleDeleteExpense = async (id) => {
    // Delete locally first for instant response
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(updatedExpenses);
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));

    // Sync to backend in background
    if (isOnline) {
      try {
        await fetch(`${API_BASE}/expenses?id=${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        // Silent fail - data already deleted locally
        console.log('Backend delete failed, data deleted locally');
      }
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = budget ? budget.amount - totalExpenses : 0;
  const percentUsed = budget ? (totalExpenses / budget.amount) * 100 : 0;

  const categories = {
    groceries: { icon: '🛒', label: 'Groceries' },
    kitchen: { icon: '🍳', label: 'Kitchen' },
    utilities: { icon: '⚡', label: 'Utilities' },
    transportation: { icon: '🚗', label: 'Transport' },
    healthcare: { icon: '🏥', label: 'Healthcare' },
    entertainment: { icon: '🎬', label: 'Entertainment' },
    other: { icon: '📦', label: 'Other' }
  };

  // Main App UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`}></div>
          <span className="text-xs text-gray-600">
            {isOnline ? 'Online' : 'Offline Mode'}
          </span>
        </div>
        {error && (
          <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            Working offline
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 border border-purple-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Wallet className="text-purple-600" size={32} />
                Family Budget
              </h1>
              <p className="text-gray-600 mt-1">Track your monthly expenses</p>
            </div>
          </div>

          {/* Budget Overview */}
          {budget ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <Calendar size={16} />
                  {budget.days} days ({new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()})
                </span>
                <button
                  onClick={() => setShowAddBudget(true)}
                  className="text-purple-600 hover:text-purple-700 flex items-center gap-1 hover:bg-purple-50 px-2 py-1 rounded-lg transition-all"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="text-sm text-gray-600 mb-2">Total Budget</div>
                  <div className="text-xl font-bold text-purple-600">
                    ₨{budget.amount.toLocaleString()}
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                  <div className="text-sm text-gray-600 mb-2">Spent</div>
                  <div className="text-xl font-bold text-red-600">
                    ₨{totalExpenses.toLocaleString()}
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="text-sm text-gray-600 mb-2">Remaining</div>
                  <div className="text-xl font-bold text-green-600">
                    ₨{remaining.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="space-y-3">
                <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${
                      percentUsed > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                      percentUsed > 70 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 
                      'bg-gradient-to-r from-green-500 to-green-600'
                    }`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{percentUsed.toFixed(1)}% used</span>
                  <span className={`font-medium ${
                    remaining < 0 ? 'text-red-600' : 
                    percentUsed > 90 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {remaining < 0 ? `₨${Math.abs(remaining).toLocaleString()} over budget` : 
                     `₨${remaining.toLocaleString()} left`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6">
                <Wallet className="mx-auto text-purple-600 mb-4" size={48} />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Set Your Monthly Budget</h3>
                <p className="text-gray-600 mb-6">Get started by setting your budget amount</p>
                
                <button
                  onClick={() => setShowAddBudget(true)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-lg"
                >
                  <Plus size={20} />
                  Set Budget
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Expense Button - Only show if budget exists */}
        {budget && (
          <button
            onClick={() => setShowAddExpense(true)}
            className="w-full mb-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-3xl shadow-xl hover:shadow-2xl hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-3 font-semibold text-lg border border-purple-200"
          >
            <Plus size={24} />
            Add New Expense
          </button>
        )}

        {/* Add Budget Modal */}
        {showAddBudget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-center">Set Your Budget</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Amount (₨)
                  </label>
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                    placeholder="150000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Days
                  </label>
                  <input
                    type="number"
                    value={budgetDays}
                    onChange={(e) => setBudgetDays(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={budgetDate}
                    onChange={(e) => setBudgetDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddBudget(false)}
                    className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBudget}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold"
                  >
                    Save Budget
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Expense Modal */}
        {showAddExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-center">Add Expense</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What did you buy?
                  </label>
                  <input
                    type="text"
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Vegetables, Rice, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₨)
                  </label>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {Object.entries(categories).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.icon} {val.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddExpense(false)}
                    className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddExpense}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold"
                  >
                    Add Expense
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expenses List */}
        {expenses.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-purple-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingDown className="text-red-600" />
              Recent Expenses
              <span className="text-sm font-normal text-gray-500 ml-auto">
                {expenses.length} item{expenses.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-purple-50 hover:to-pink-50 transition-all border border-gray-200 hover:border-purple-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{categories[expense.category].icon}</div>
                    <div>
                      <div className="font-semibold text-gray-800">{expense.name}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString()} • {categories[expense.category].label}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-red-600 text-lg">₨{expense.amount.toLocaleString()}</span>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-110"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for Expenses */}
        {expenses.length === 0 && budget && (
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100 text-center">
            <TrendingDown className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No expenses yet</h3>
            <p className="text-gray-600 mb-6">Start tracking your spending to stay within budget</p>
            <button
              onClick={() => setShowAddExpense(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold"
            >
              Add Your First Expense
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseTracker;