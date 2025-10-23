import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthWrapper from './AuthWrapper'
import ExpenseTracker from './app'
import './index.css'

// This is the main App component that wraps ExpenseTracker with AuthWrapper
const App = () => {
  return (
    <AuthWrapper>
      <ExpenseTracker />
    </AuthWrapper>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)