import React, { useState, useEffect } from 'react';
import { Wallet, Calendar, Plus, Trash2, TrendingDown, Edit2 } from 'lucide-react';

const ExpenseTracker = () => {
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  
  // Form states
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetDays, setBudgetDays] = useState('');
  const [budgetDate, setBudgetDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('groceries');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Load data from database on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch budget
      const budgetRes = await fetch('/api/budget');
      const budgetData = await budgetRes.json();
      if (budgetData && budgetData.amount) {
        setBudget({
          amount: parseFloat(budgetData.amount),
          startDate: budgetData.start_date,
          endDate: budgetData.end_date,
          days: budgetData.days
        });
      }
      
      // Fetch expenses
      const expensesRes = await fetch('/api/expenses');
      const expensesData = await expensesRes.json();
      setExpenses(expensesData.map(exp => ({
        id: exp.id,
        name: exp.name,
        amount: parseFloat(exp.amount),
        category: exp.category,
        date: exp.date
      })));
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBudget = async () => {
    if (!budgetAmount || !budgetDays) return;
    
    const endDate = new Date(budgetDate);
    endDate.setDate(endDate.getDate() + parseInt(budgetDays));
    
    try {
      const response = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(budgetAmount),
          startDate: budgetDate,
          endDate: endDate.toISOString().split('T')[0],
          days: parseInt(budgetDays)
        })
      });
      
      const data = await response.json();
      setBudget({
        amount: parseFloat(data.amount),
        startDate: data.start_date,
        endDate: data.end_date,
        days: data.days
      });
      
      setBudgetAmount('');
      setBudgetDays('');
      setBudgetDate(new Date().toISOString().split('T')[0]);
      setShowAddBudget(false);
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Failed to save budget. Please try again.');
    }
  };

  const handleAddExpense = async () => {
    if (!expenseName || !expenseAmount) return;
    
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: expenseName,
          amount: parseFloat(expenseAmount),
          category: expenseCategory,
          date: expenseDate
        })
      });
      
      const data = await response.json();
      const newExpense = {
        id: data.id,
        name: data.name,
        amount: parseFloat(data.amount),
        category: data.category,
        date: data.date
      };
      
      setExpenses([newExpense, ...expenses]);
      
      setExpenseName('');
      setExpenseAmount('');
      setExpenseCategory('groceries');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setShowAddExpense(false);
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense. Please try again.');
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE'
      });
      
      setExpenses(expenses.filter(exp => exp.id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = budget ? budget.amount - totalExpenses : 0;
  const percentUsed = budget ? (totalExpenses / budget.amount) * 100 : 0;

  const categories = {
    groceries: { icon: '🛒', label: 'Groceries' },
    kitchen: { icon: '🍳', label: 'Kitchen' },
    utilities: { icon: '⚡', label: 'Utilities' },
    other: { icon: '📦', label: 'Other' }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Wallet className="text-purple-600" />
              Family Expenses
            </h1>
          </div>

          {/* Budget Overview */}
          {budget ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <Calendar size={16} />
                  {budget.days} days ({budget.startDate} to {budget.endDate})
                </span>
                <button
                  onClick={() => setShowAddBudget(true)}
                  className="text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Budget</div>
                  <div className="text-lg font-bold text-purple-600">
                    ₨{budget.amount.toLocaleString()}
                  </div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Spent</div>
                  <div className="text-lg font-bold text-red-600">
                    ₨{totalExpenses.toLocaleString()}
                  </div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Remaining</div>
                  <div className="text-lg font-bold text-green-600">
                    ₨{remaining.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    percentUsed > 90 ? 'bg-red-500' : percentUsed > 70 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>
              <div className="text-center text-sm text-gray-600">
                {percentUsed.toFixed(1)}% used
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddBudget(true)}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Set Monthly Budget
            </button>
          )}
        </div>

        {/* Add Budget Modal */}
        {showAddBudget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Set Monthly Budget</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₨)
                  </label>
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddBudget(false)}
                    className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBudget}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Expense Button */}
        {budget && (
          <button
            onClick={() => setShowAddExpense(true)}
            className="w-full mb-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 font-semibold"
          >
            <Plus size={24} />
            Add New Expense
          </button>
        )}

        {/* Add Expense Modal */}
        {showAddExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Add Expense</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expense Name
                  </label>
                  <input
                    type="text"
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddExpense(false)}
                    className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddExpense}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expenses List */}
        {expenses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingDown className="text-red-600" />
              Recent Expenses
            </h2>
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{categories[expense.category].icon}</span>
                    <div>
                      <div className="font-medium text-gray-800">{expense.name}</div>
                      <div className="text-sm text-gray-500">{expense.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-red-600">₨{expense.amount.toLocaleString()}</span>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseTracker;