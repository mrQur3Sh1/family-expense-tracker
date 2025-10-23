import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

const AuthWrapper = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already authenticated
    const auth = localStorage.getItem('expense_auth');
    if (auth === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    // Set your PIN here (in production, use environment variable)
    const correctPin = '1234'; // Change this to your desired PIN
    
    if (pin === correctPin) {
      setIsAuthenticated(true);
      localStorage.setItem('expense_auth', 'authenticated');
      setError('');
    } else {
      setError('Invalid PIN');
      setPin('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('expense_auth');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Lock className="mx-auto text-purple-600 mb-4" size={48} />
            <h1 className="text-2xl font-bold text-gray-800">Family Expense Tracker</h1>
            <p className="text-gray-600 mt-2">Enter PIN to access</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl tracking-widest"
              placeholder="••••"
              maxLength={4}
            />
            
            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}
            
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 z-50 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Logout
      </button>
      {children}
    </div>
  );
};

export default AuthWrapper;