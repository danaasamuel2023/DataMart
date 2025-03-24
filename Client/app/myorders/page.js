// pages/transactions.js
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
  AlertCircle
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
      let url = `http://localhost:5000/api/v1/user-transactions/${userId}?page=${pagination.page}&limit=${pagination.limit}`;
      
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
          color: 'text-green-500 bg-green-100',
          text: 'Completed'
        };
      case 'pending':
        return { 
          icon: <Clock className="w-5 h-5" />, 
          color: 'text-yellow-500 bg-yellow-100',
          text: 'Pending'
        };
      case 'failed':
        return { 
          icon: <XCircle className="w-5 h-5" />, 
          color: 'text-red-500 bg-red-100',
          text: 'Failed'
        };
      default:
        return { 
          icon: <AlertCircle className="w-5 h-5" />, 
          color: 'text-gray-500 bg-gray-100',
          text: status
        };
    }
  };

  // Render a transaction card for mobile view
  const renderTransactionCard = (transaction) => {
    const status = getStatusDisplay(transaction.status);
    const expired = transaction.status === 'pending' && isTransactionExpired(transaction.createdAt);
    
    return (
      <div key={transaction._id} className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-100">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-medium text-gray-900 capitalize">{transaction.type}</div>
            <div className="text-gray-500 text-sm">{formatDate(transaction.createdAt)}</div>
          </div>
          <div className={`flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${status.color}`}>
            {status.icon}
            <span className="ml-1">{status.text}</span>
            {expired && <span className="ml-1 text-red-500">(Expired)</span>}
          </div>
        </div>
        
        <div className="mb-3">
          <div className="text-lg font-bold text-gray-900 mb-1">{formatCurrency(transaction.amount)}</div>
          <div className="text-sm text-gray-500 break-all">
            <span className="font-medium text-gray-700">Ref:</span> {transaction.reference}
          </div>
        </div>
        
        {transaction.status === 'pending' && (
          <div className="mt-4">
            <button
              className={`w-full flex justify-center items-center py-3 px-4 rounded-lg text-white font-medium ${
                expired 
                  ? 'bg-gray-300' 
                  : verifyingId === transaction._id 
                    ? 'bg-blue-400'
                    : 'bg-blue-600 active:bg-blue-700'
              }`}
              disabled={verifyingId === transaction._id || expired}
              onClick={() => expired 
                ? showNotification('Cannot verify this transaction. It has been pending for more than 5 hours. Please contact admin.', 'error')
                : verifyTransaction(transaction._id, transaction.createdAt)
              }
            >
              {verifyingId === transaction._id ? (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                  Verifying...
                </div>
              ) : expired ? (
                <>
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Contact Admin
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
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
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Your Transactions</h1>
      
      {/* Filters */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            className="border rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="flex items-center space-x-1 bg-blue-50 text-blue-500 px-3 py-2 rounded hover:bg-blue-100"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>
      
      {/* Notification */}
      {notification.show && (
        <div className={`mb-6 p-4 rounded flex items-center ${
          notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          <span>{notification.message}</span>
        </div>
      )}
      
      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Mobile view - Card layout */}
      <div className="md:hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No transactions found
          </div>
        ) : (
          transactions.map(transaction => renderTransactionCard(transaction))
        )}
      </div>
      
      {/* Desktop view - Table layout */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => {
                const status = getStatusDisplay(transaction.status);
                const expired = transaction.status === 'pending' && isTransactionExpired(transaction.createdAt);
                
                return (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                      {transaction.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="max-w-[150px] overflow-hidden text-ellipsis">
                        {transaction.reference}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.icon}
                        <span className="ml-1">{status.text}</span>
                        {expired && (
                          <span className="ml-1 text-red-500">(Expired)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.status === 'pending' && (
                        <button
                          className={`inline-flex items-center px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            expired 
                              ? 'border-gray-300 text-gray-500 hover:bg-gray-50 focus:ring-gray-500' 
                              : 'border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:opacity-50'
                          }`}
                          disabled={verifyingId === transaction._id || expired}
                          onClick={() => expired 
                            ? showNotification('Cannot verify this transaction. It has been pending for more than 5 hours. Please contact admin.', 'error')
                            : verifyTransaction(transaction._id, transaction.createdAt)
                          }
                        >
                          {verifyingId === transaction._id ? (
                            <div className="flex items-center">
                              <div className="w-4 h-4 border-t-2 border-blue-500 border-solid rounded-full animate-spin mr-1"></div>
                              Verifying...
                            </div>
                          ) : expired ? (
                            <>
                              <AlertCircle className="w-4 h-4 mr-1 text-red-500" />
                              Contact Admin
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-1" />
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
        <div className="flex items-center justify-center mt-6 space-x-4">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-sm">
            <span className="font-medium">{pagination.page}</span> of <span>{pagination.pages}</span>
          </div>
          
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;