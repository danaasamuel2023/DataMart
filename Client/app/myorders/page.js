'use client'
import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  AlertCircle,
  Moon,
  Sun,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  DollarSign
} from 'lucide-react';

const TransactionsPage = () => {
  // State variables
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [stats, setStats] = useState({
    totalCredits: 0,
    totalDebits: 0,
    creditCount: 0,
    debitCount: 0
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    dateRange: '7days'
  });
  const [verifyingId, setVerifyingId] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success'
  });
  const [darkMode, setDarkMode] = useState(false);

  // Mock router for demonstration
  const router = {
    push: (path) => console.log('Navigate to:', path)
  };

  // Initialize dark mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode');
      if (savedDarkMode !== null) {
        setDarkMode(savedDarkMode === 'true');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(prefersDark);
      }
    }
  }, []);

  // Update HTML class when dark mode changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Get token and user data from localStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      const userDataStr = localStorage.getItem('userData');
      
      if (!token) {
        router.push('/login');
        return;
      }
      
      setAuthToken(token);
      
      if (userDataStr) {
        try {
          const parsedUserData = JSON.parse(userDataStr);
          setUserData(parsedUserData);
        } catch (err) {
          console.error('Error parsing user data:', err);
          localStorage.removeItem('userData');
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    }
  }, []);

  // Fetch transactions when component mounts or filters change
  useEffect(() => {
    if (userData && authToken) {
      fetchTransactions();
    }
  }, [authToken, userData, pagination.page, filters]);

  // Function to calculate date range
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (filters.dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        return {};
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Function to fetch transactions
  const fetchTransactions = async () => {
    if (!authToken || !userData) return;
    
    setLoading(true);
    try {
      const userId = userData.id;
      const dateRange = getDateRange();
      let url = `https://datamartbackened.onrender.com/api/v1/data/user-transactions/${userId}?page=${pagination.page}&limit=${pagination.limit}`;
      
      if (filters.status) {
        url += `&status=${filters.status}`;
      }
      
      if (filters.type) {
        url += `&type=${filters.type}`;
      }
      
      if (dateRange.startDate) {
        url += `&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setTransactions(data.data.transactions);
        setPagination(data.data.pagination);
        setCurrentBalance(data.data.currentBalance || 0);
        
        if (data.data.overallStats) {
          setStats(data.data.overallStats);
        }
      } else {
        setError('Failed to fetch transactions');
      }
    } catch (err) {
      setError('An error occurred while fetching transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Function to verify pending transaction
  const verifyTransaction = async (transactionId, createdAt) => {
    if (!authToken || !userData) return;
    
    // Check if transaction is older than 5 hours
    const transactionTime = new Date(createdAt);
    const currentTime = new Date();
    const timeDifference = (currentTime - transactionTime) / (1000 * 60 * 60);
    
    if (timeDifference > 5) {
      showNotification('Cannot verify this transaction. It has been pending for more than 5 hours. Please contact admin.', 'error');
      return;
    }
    
    setVerifyingId(transactionId);
    try {
      const response = await fetch(`https://datamartbackened.onrender.com/api/v1/verify-pending-transaction/${transactionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('Transaction verified successfully!', 'success');
        fetchTransactions(); // Refresh the list
      } else {
        showNotification(data.message || 'Verification failed', 'error');
      }
    } catch (err) {
      showNotification('An error occurred during verification', 'error');
      console.error(err);
    } finally {
      setVerifyingId(null);
    }
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  // Get transaction icon based on type
  const getTransactionIcon = (type, isCredit) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'deposit':
        return <ArrowDownRight className={`${iconClass} text-green-500`} />;
      case 'withdrawal':
        return <ArrowUpRight className={`${iconClass} text-red-500`} />;
      case 'purchase':
        return <DollarSign className={`${iconClass} text-blue-500`} />;
      case 'transfer':
        return isCredit ? <ArrowDownRight className={`${iconClass} text-green-500`} /> : <ArrowUpRight className={`${iconClass} text-orange-500`} />;
      case 'refund':
        return <RefreshCw className={`${iconClass} text-green-500`} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  // Get status display
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'completed':
        return { 
          icon: <CheckCircle className="w-4 h-4" />, 
          color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
          text: 'Completed'
        };
      case 'pending':
        return { 
          icon: <Clock className="w-4 h-4" />, 
          color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
          text: 'Pending'
        };
      case 'failed':
        return { 
          icon: <XCircle className="w-4 h-4" />, 
          color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
          text: 'Failed'
        };
      default:
        return { 
          icon: <AlertCircle className="w-4 h-4" />, 
          color: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
          text: status
        };
    }
  };

  // Render statistics cards
  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Balance</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(currentBalance)}</p>
          </div>
          <Wallet className="w-8 h-8 text-blue-500" />
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Credits</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalCredits)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stats.creditCount} transactions</p>
          </div>
          <TrendingUp className="w-8 h-8 text-green-500" />
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Debits</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalDebits)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stats.debitCount} transactions</p>
          </div>
          <TrendingDown className="w-8 h-8 text-red-500" />
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Net Change</p>
            <p className={`text-xl font-bold ${stats.totalCredits - stats.totalDebits >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(stats.totalCredits - stats.totalDebits)}
            </p>
          </div>
          <Activity className="w-8 h-8 text-purple-500" />
        </div>
      </div>
    </div>
  );

  // Render transaction card for mobile
  const renderTransactionCard = (transaction) => {
    const status = getStatusDisplay(transaction.status);
    const isExpired = transaction.status === 'pending' && 
      ((new Date() - new Date(transaction.createdAt)) / (1000 * 60 * 60) > 5);
    
    return (
      <div key={transaction._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            {getTransactionIcon(transaction.type, transaction.isCredit)}
            <div className="ml-3">
              <p className="font-medium text-gray-900 dark:text-white capitalize">{transaction.type}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(transaction.createdAt)}</p>
            </div>
          </div>
          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.icon}
            <span className="ml-1">{status.text}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
            <span className={`font-bold text-lg ${transaction.isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {transaction.isCredit ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Balance</span>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(transaction.balanceAfter)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {transaction.balanceChange >= 0 ? '+' : ''}{formatCurrency(transaction.balanceChange)}
              </p>
            </div>
          </div>
          
          {transaction.description && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.description}</p>
            </div>
          )}
          
          {transaction.relatedPurchase && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {transaction.relatedPurchase.network} • {transaction.relatedPurchase.capacity}GB • {transaction.relatedPurchase.phoneNumber}
              </p>
            </div>
          )}
        </div>
        
        {transaction.status === 'pending' && !isExpired && (
          <button
            onClick={() => verifyTransaction(transaction._id, transaction.createdAt)}
            disabled={verifyingId === transaction._id}
            className="mt-4 w-full flex items-center justify-center py-2 px-4 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
          >
            {verifyingId === transaction._id ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Verify Transaction
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  // Loading state
  if (!userData || !authToken || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction History</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track all your financial activities</p>
          </div>
          
          <button 
            onClick={toggleDarkMode} 
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Statistics */}
        {renderStats()}
        
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="purchase">Purchases</option>
                <option value="transfer">Transfers</option>
                <option value="refund">Refunds</option>
              </select>
              
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            <button 
              onClick={fetchTransactions} 
              className="flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Notification */}
        {notification.show && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            notification.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
            <span>{notification.message}</span>
          </div>
        )}
        
        {/* Transactions List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance Change</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((transaction) => {
                  const status = getStatusDisplay(transaction.status);
                  return (
                    <tr key={transaction._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getTransactionIcon(transaction.type, transaction.isCredit)}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{transaction.type}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(transaction.createdAt)}</p>
                            {transaction.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{transaction.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`text-sm font-bold ${transaction.isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.isCredit ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{formatCurrency(transaction.balanceBefore)} → {formatCurrency(transaction.balanceAfter)}</p>
                          <p className={`text-xs ${transaction.balanceChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {transaction.balanceChange >= 0 ? '+' : ''}{formatCurrency(transaction.balanceChange)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.icon}
                          <span className="ml-1">{status.text}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {transaction.status === 'pending' && (
                          <button
                            onClick={() => verifyTransaction(transaction._id, transaction.createdAt)}
                            disabled={verifyingId === transaction._id}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium disabled:opacity-50"
                          >
                            {verifyingId === transaction._id ? 'Verifying...' : 'Verify'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Cards */}
          <div className="lg:hidden p-4 space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No transactions found
              </div>
            ) : (
              transactions.map(transaction => renderTransactionCard(transaction))
            )}
          </div>
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center mt-6 space-x-4">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {pagination.page} of {pagination.pages}
            </span>
            
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.pages}
              className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;