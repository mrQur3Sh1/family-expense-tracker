import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

const AuthWrapper = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const auth = localStorage.getItem('expense_auth');
    if (auth === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async () => {
    if (!pin || pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify PIN with backend
      const response = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.valid) {
          setIsAuthenticated(true);
          localStorage.setItem('expense_auth', 'authenticated');
          setError('');
        } else {
          setError('Invalid PIN');
          setPin('');
        }
      } else {
        throw new Error('Server error');
      }
    } catch (err) {
      console.error('PIN verification failed:', err);
      // Fallback to hardcoded PIN for development/offline
      if (pin === '1234') {
        setIsAuthenticated(true);
        localStorage.setItem('expense_auth', 'authenticated');
        setError('');
      } else {
        setError('Invalid PIN (offline mode)');
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('expense_auth');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-purple-100">
          <div className="text-center mb-8">
            <div className="bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Lock className="text-purple-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Family Budget</h1>
            <p className="text-gray-600">Enter PIN to access your expenses</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                Security PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                placeholder="••••"
                maxLength={4}
                autoFocus
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-center">
                {error}
              </div>
            )}
            
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Unlock App'}
            </button>
            
            <div className="text-center space-y-2">
              <div className="text-sm text-gray-500">
                Try PIN: <span className="font-mono bg-gray-100 px-2 py-1 rounded">Qureshi</span>
              </div>
    
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 z-50 p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg"
        title="Logout"
      >
        <Lock size={16} />
      </button>
      {children}
    </div>
  );
};

export default AuthWrapper;