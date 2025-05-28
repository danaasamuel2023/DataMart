'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
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
  Zap,
  Activity,
  TrendingUp,
  DollarSign,
  Calendar,
  Search
} from 'lucide-react';

const TransactionsPage = () => {
  const router = useRouter();
  
  // State variables
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 100,
    pages: 0
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [verifyingId, setVerifyingId] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success'
  });
  const [darkMode, setDarkMode] = useState(false);

  // Effect to check system preference for dark mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if user has already set a preference
      const savedDarkMode = localStorage.getItem('darkMode');
      
      if (savedDarkMode !== null) {
        setDarkMode(savedDarkMode === 'true');
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(prefersDark);
      }
    }
  }, []);

  // Effect to update HTML class when dark mode changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save preference to localStorage
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
  }, [router]);

  // Fetch transactions when component mounts or filters change
  useEffect(() => {
    if (userData && authToken) {
      fetchTransactions();
    }
  }, [authToken, userData, pagination.page, statusFilter]);

  // Function to fetch transactions
  const fetchTransactions = async () => {
    if (!authToken || !userData) return;
    
    setLoading(true);
    try {
      const userId = userData.id;
      let url = `https://datamartbackened.onrender.com/api/v1/user-transactions/${userId}?page=${pagination.page}&limit=${pagination.limit}`;
      
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.data.success) {
        setTransactions(response.data.data.transactions);
        setPagination(response.data.data.pagination);
      } else {
        setError('Failed to fetch transactions');
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        // Handle token expiration
        showNotification('Your session has expired. Please log in again.', 'error');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.push('/login');
      } else {
        setError('An error occurred while fetching transactions');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to verify pending transaction with time check
  const verifyTransaction = async (transactionId, createdAt) => {
    if (!authToken || !userData) return;
    
    // Check if transaction is older than 5 hours
    const transactionTime = new Date(createdAt);
    const currentTime = new Date();
    const timeDifference = (currentTime - transactionTime) / (1000 * 60 * 60); // Convert to hours
    
    if (timeDifference > 5) {
      showNotification('Cannot verify this transaction. It has been pending for more than 5 hours. Please contact admin.', 'error');
      return;
    }
    
    setVerifyingId(transactionId);
    try {
      const response = await axios.post(`https://datamartbackened.onrender.com/api/v1/verify-pending-transaction/${transactionId}`, {}, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.data.success) {
        showNotification('Transaction verified successfully!', 'success');
        // Update the transaction in the list
        setTransactions(prevTransactions => 
          prevTransactions.map(t => 
            t._id === transactionId ? { ...t, status: 'completed' } : t
          )
        );
      } else {
        showNotification(response.data.message || 'Verification failed', 'error');
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        // Handle token expiration
        showNotification('Your session has expired. Please log in again.', 'error');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.push('/login');
      } else {
        showNotification('An error occurred during verification', 'error');
        console.error(err);
      }
    } finally {
      setVerifyingId(null);
    }
  };

  // Check if a transaction is expired (older than 5 hours)
  const isTransactionExpired = (createdAt) => {
    const transactionTime = new Date(createdAt);
    const currentTime = new Date();
    const timeDifference = (currentTime - transactionTime) / (1000 * 60 * 60); // Convert to hours
    return timeDifference > 5;
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  // Handle status filter change
  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPagination({ ...pagination, page: 1 }); // Reset to first page when filter changes
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({
      show: true,
      message,
      type
    });
    
    // Auto-hide notification after 5 seconds
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

  // Get status icon and color
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'completed':
        return { 
          icon: <CheckCircle className="w-5 h-5" />, 
          color: 'text-emerald-600 bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700',
          text: 'Completed'
        };
      case 'pending':
        return { 
          icon: <Clock className="w-5 h-5" />, 
          color: 'text-yellow-600 bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700',
          text: 'Pending'
        };
      case 'failed':
        return { 
          icon: <XCircle className="w-5 h-5" />, 
          color: 'text-red-600 bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 dark:text-red-400 border border-red-300 dark:border-red-700',
          text: 'Failed'
        };
      default:
        return { 
          icon: <AlertCircle className="w-5 h-5" />, 
          color: 'text-gray-600 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800/40 dark:to-gray-700/40 dark:text-gray-400 border border-gray-300 dark:border-gray-600',
          text: status
        };
    }
  };

  // Calculate transaction stats
  const transactionStats = {
    total: transactions.length,
    completed: transactions.filter(t => t.status === 'completed').length,
    pending: transactions.filter(t => t.status === 'pending').length,
    totalAmount: transactions.reduce((sum, t) => sum + (t.status === 'completed' ? t.amount : 0), 0)
  };

  // Render a transaction card for mobile view
  const renderTransactionCard = (transaction) => {
    const status = getStatusDisplay(transaction.status);
    const expired = transaction.status === 'pending' && isTransactionExpired(transaction.createdAt);
    
    return (
      <div key={transaction._id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-5 rounded-2xl shadow-xl mb-4 border border-emerald-200/50 dark:border-emerald-800/30 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-bold text-gray-900 dark:text-white capitalize text-lg">{transaction.type}</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center mt-1">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(transaction.createdAt)}
            </div>
          </div>
          <div className={`flex items-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm ${status.color}`}>
            {status.icon}
            <span className="ml-2">{status.text}</span>
            {expired && <span className="ml-2 text-red-500 dark:text-red-400">(Expired)</span>}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="text-2xl font-black text-gray-900 dark:text-white mb-2 flex items-center">
            <DollarSign className="w-6 h-6 mr-1 text-emerald-600" />
            {formatCurrency(transaction.amount)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 break-all bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
            <span className="font-bold text-gray-700 dark:text-gray-300">Reference:</span> {transaction.reference}
          </div>
        </div>
        
        {transaction.status === 'pending' && (
          <div className="mt-4">
            <button
              className={`w-full flex justify-center items-center py-4 px-6 rounded-2xl text-white font-bold text-base transition-all duration-300 shadow-lg ${
                expired 
                  ? 'bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700' 
                  : verifyingId === transaction._id 
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transform hover:scale-105'
              }`}
              disabled={verifyingId === transaction._id || expired}
              onClick={() => expired 
                ? showNotification('Cannot verify this transaction. It has been pending for more than 5 hours. Please contact admin.', 'error')
                : verifyTransaction(transaction._id, transaction.createdAt)
              }
            >
              {verifyingId === transaction._id ? (
                <div className="flex items-center">
                  <div className="w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin mr-3"></div>
                  Verifying...
                </div>
              ) : expired ? (
                <>
                  <AlertCircle className="w-6 h-6 mr-3" />
                  Contact Admin
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6 mr-3" />
                  Verify Now
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Show loading spinner if data is still loading
  if (!userData || !authToken || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-100 dark:border-emerald-900"></div>
            <div className="absolute top-0 w-20 h-20 rounded-full border-4 border-transparent border-t-emerald-500 dark:border-t-emerald-400 animate-spin"></div>
          </div>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-transparent bg-clip-text">
              DATAHUSTLE
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading transactions...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl shadow-2xl p-6 transform hover:scale-105 transition-all duration-300">
          <div className="flex justify-between items-center relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4">
                <Activity className="w-8 h-8 text-white animate-pulse" />
              </div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-white">Transaction History</h1>
              </div>
              <p className="text-white/90 text-lg font-medium">Track your DATAHUSTLE journey</p>
            </div>
            
            <button 
              onClick={toggleDarkMode} 
              className="relative z-10 p-3 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300 border border-white/30 shadow-lg transform hover:scale-105"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Transaction Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl mr-3">
                <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{transactionStats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl mr-3">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{transactionStats.completed}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-xl mr-3">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{transactionStats.pending}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center">
              <div className="bg-teal-100 dark:bg-teal-900/30 p-3 rounded-xl mr-3">
                <TrendingUp className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(transactionStats.totalAmount)}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-emerald-200/50 dark:border-emerald-800/30">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl">
                <Filter className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <select
                className="border-2 rounded-xl py-3 px-4 bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-300 font-medium backdrop-blur-sm"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <option value="">All Transactions</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <button 
              onClick={fetchTransactions} 
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-lg font-bold transform hover:scale-105"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        
        {/* Notification */}
        {notification.show && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center shadow-lg backdrop-blur-lg border ${
            notification.type === 'success' 
              ? 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' 
              : 'bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
          } transition-all duration-300`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-6 h-6 mr-3" />
            ) : (
              <AlertCircle className="w-6 h-6 mr-3" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        )}
        
        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-2xl flex items-center transition-all duration-300 backdrop-blur-lg border border-red-300 dark:border-red-700 shadow-lg">
            <AlertCircle className="w-6 h-6 mr-3" />
            <span className="font-medium">{error}</span>
          </div>
        )}
        
        {/* Mobile view - Card layout */}
        <div className="md:hidden">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="relative w-12 h-12">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-100 dark:border-emerald-900"></div>
                <div className="absolute top-0 w-12 h-12 rounded-full border-4 border-transparent border-t-emerald-500 dark:border-t-emerald-400 animate-spin"></div>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/30">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No transactions found</p>
            </div>
          ) : (
            transactions.map(transaction => renderTransactionCard(transaction))
          )}
        </div>
        
        {/* Desktop view - Table layout */}
        <div className="hidden md:block overflow-x-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl transition-all duration-300 border border-emerald-200/50 dark:border-emerald-800/30">
          <table className="min-w-full divide-y divide-emerald-200 dark:divide-emerald-800">
            <thead className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/80 dark:bg-gray-800/80 divide-y divide-emerald-200/50 dark:divide-emerald-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="flex justify-center">
                      <div className="relative w-12 h-12">
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-100 dark:border-emerald-900"></div>
                        <div className="absolute top-0 w-12 h-12 rounded-full border-4 border-transparent border-t-emerald-500 dark:border-t-emerald-400 animate-spin"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No transactions found</p>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => {
                  const status = getStatusDisplay(transaction.status);
                  const expired = transaction.status === 'pending' && isTransactionExpired(transaction.createdAt);
                  
                  return (
                    <tr key={transaction._id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all duration-300">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 capitalize font-bold">
                        {transaction.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-black">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                        <div className="max-w-[150px] overflow-hidden text-ellipsis">
                          {transaction.reference}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm ${status.color}`}>
                          {status.icon}
                          <span className="ml-2">{status.text}</span>
                          {expired && (
                            <span className="ml-2 text-red-500 dark:text-red-400">(Expired)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transaction.status === 'pending' && (
                          <button
                            className={`inline-flex items-center px-4 py-2 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 font-bold transform hover:scale-105 ${
                              expired 
                                ? 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-500' 
                                : 'border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:ring-emerald-500 disabled:opacity-50 shadow-sm'
                            }`}
                            disabled={verifyingId === transaction._id || expired}
                            onClick={() => expired 
                              ? showNotification('Cannot verify this transaction. It has been pending for more than 5 hours. Please contact admin.', 'error')
                              : verifyTransaction(transaction._id, transaction.createdAt)
                            }
                          >
                            {verifyingId === transaction._id ? (
                              <div className="flex items-center">
                                <div className="w-4 h-4 border-t-2 border-emerald-500 dark:border-emerald-400 border-solid rounded-full animate-spin mr-2"></div>
                                Verifying...
                              </div>
                            ) : expired ? (
                              <>
                                <AlertCircle className="w-4 h-4 mr-2 text-red-500 dark:text-red-400" />
                                Contact Admin
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                Verify
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center mt-8 space-x-4">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-3 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg transform hover:scale-105"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="text-lg font-bold text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg px-6 py-3 rounded-xl shadow-lg border border-emerald-200/50 dark:border-emerald-800/30">
              <span className="text-emerald-600 dark:text-emerald-400">{pagination.page}</span> of <span className="text-emerald-600 dark:text-emerald-400">{pagination.pages}</span>
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="p-3 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg transform hover:scale-105"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;