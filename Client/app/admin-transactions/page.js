'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
// Using native SVG icons instead of react-icons
const IconRefresh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
    <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
  </svg>
);

const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const IconFilter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const IconEye = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// Define API base URL - replace with your actual API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://datamartbackened.onrender.com/api';

export default function AdminTransactions() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTransactions: 0
  });
  const [amountByType, setAmountByType] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    gateway: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [verifyingReference, setVerifyingReference] = useState(null);
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState({
    id: null,
    status: '',
    adminNotes: ''
  });
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Fetch transactions on component mount and when filters/pagination change
  useEffect(() => {
    fetchTransactions();
  }, [pagination.currentPage, filters]);

  const fetchTransactions = async () => {
    setLoading(true);
    
    try {
      // Get token from localStorage
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        // Redirect to login if no token
        router.push('/admin/login');
        return;
      }

      // Build query params
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: 10,
        ...filters
      });

      const response = await axios.get(`${API_BASE_URL}/transactions?${params}`, {
        headers: {
          'x-auth-token': authToken
        }
      });

      setTransactions(response.data.transactions);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        totalTransactions: response.data.totalTransactions
      });
      setAmountByType(response.data.amountByType || {});
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const verifyPaystackTransaction = async (reference) => {
    setVerifyingReference(reference);
    
    try {
      // Get token from localStorage
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        router.push('/admin/login');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/verify-paystack/${reference}`, {
        headers: {
          'x-auth-token': authToken
        }
      });

      // Show verification details
      setDetailTransaction({
        ...response.data.transaction,
        paystackVerification: response.data.paystackVerification,
        verificationMessage: response.data.message,
        verified: response.data.verified
      });
      setShowDetailModal(true);

      // Refresh the transaction list to reflect any status changes
      fetchTransactions();
    } catch (error) {
      handleApiError(error);
    } finally {
      setVerifyingReference(null);
    }
  };

  const getTransactionDetails = async (id) => {
    setLoading(true);
    
    try {
      // Get token from localStorage
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        router.push('/admin/login');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/transactions/${id}`, {
        headers: {
          'x-auth-token': authToken
        }
      });

      setDetailTransaction(response.data);
      setShowDetailModal(true);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateTransactionStatus = async () => {
    if (!statusUpdateData.id || !statusUpdateData.status) {
      return;
    }

    setLoading(true);

    try {
      // Get token from localStorage
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        router.push('/admin/login');
        return;
      }

      await axios.put(
        `${API_BASE_URL}/transactions/${statusUpdateData.id}/update-status`,
        {
          status: statusUpdateData.status,
          adminNotes: statusUpdateData.adminNotes
        },
        {
          headers: {
            'x-auth-token': authToken,
            'Content-Type': 'application/json'
          }
        }
      );

      // Close modal and refresh data
      setShowStatusModal(false);
      fetchTransactions();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApiError = (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('authToken');
      router.push('/admin/login');
    } else {
      // Show error message
      alert(error.response?.data?.msg || 'An error occurred. Please try again.');
    }
  };

  const openStatusUpdateModal = (transaction) => {
    setStatusUpdateData({
      id: transaction._id,
      status: transaction.status,
      adminNotes: ''
    });
    setShowStatusModal(true);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    // Reset to first page when applying new filters
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      type: '',
      gateway: '',
      startDate: '',
      endDate: '',
      search: ''
    });
  };

  const exportToCSV = async () => {
    try {
      // Get all transactions with current filters (no pagination limit)
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        router.push('/admin/login');
        return;
      }

      // Build query params without pagination
      const params = new URLSearchParams({
        limit: 1000, // Higher limit for export
        ...filters
      });

      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/transactions?${params}`, {
        headers: {
          'x-auth-token': authToken
        }
      });

      // Convert transactions to CSV
      const transactions = response.data.transactions;
      const headers = [
        'ID', 'Type', 'Amount', 'Status', 'Reference', 
        'Gateway', 'User', 'Email', 'Created At'
      ];

      const csvRows = [
        headers.join(','),
        ...transactions.map(tx => [
          tx._id,
          tx.type,
          tx.amount,
          tx.status,
          tx.reference,
          tx.gateway,
          tx.userId?.name || 'Unknown',
          tx.userId?.email || 'Unknown',
          new Date(tx.createdAt).toLocaleString()
        ].join(','))
      ];

      const csvString = csvRows.join('\n');
      
      // Create download link
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `transactions-export-${new Date().toISOString().slice(0, 10)}.csv`);
      a.click();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Transaction Management</h1>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">All Transactions</h3>
          <p className="text-2xl font-semibold">{pagination.totalTransactions}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Total Deposits</h3>
          <p className="text-2xl font-semibold">₵{amountByType.deposit?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Total Payments</h3>
          <p className="text-2xl font-semibold">₵{amountByType.payment?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Total Refunds</h3>
          <p className="text-2xl font-semibold">₵{amountByType.refund?.toFixed(2) || '0.00'}</p>
        </div>
      </div>
      
      {/* Actions row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => fetchTransactions()}
            className="px-4 py-2 bg-blue-600 text-white rounded flex items-center"
          >
            <IconRefresh /> <span className="ml-2">Refresh</span>
          </button>
          <button 
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded flex items-center"
          >
            <IconDownload /> <span className="ml-2">Export</span>
          </button>
        </div>
        
        <div className="flex items-center">
          <div className="mr-2">
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search reference..."
              className="px-3 py-2 border rounded w-48"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded flex items-center"
          >
            <IconFilter /> <span className="ml-2">Filters</span>
          </button>
        </div>
      </div>
      
      {/* Filters panel */}
      {showFilters && (
        <div className="bg-gray-100 p-4 rounded mb-6">
          <form onSubmit={applyFilters}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="payment">Payment</option>
                  <option value="refund">Refund</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gateway</label>
                <select
                  name="gateway"
                  value={filters.gateway}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">All Gateways</option>
                  <option value="paystack">Paystack</option>
                  <option value="wallet">Wallet</option>
                  <option value="admin-deposit">Admin Deposit</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <input
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded"
              >
                Reset
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Transactions table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gateway</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && pagination.currentPage === 1 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center">Loading...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center">No transactions found</td>
              </tr>
            ) : (
              transactions.map(transaction => (
                <tr key={transaction._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.reference}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {transaction.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₵{transaction.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      transaction.status === 'failed' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.gateway}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.userId?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => getTransactionDetails(transaction._id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <IconEye />
                      </button>
                      
                      {transaction.gateway === 'paystack' && (
                        <button
                          onClick={() => verifyPaystackTransaction(transaction.reference)}
                          className="text-green-600 hover:text-green-900"
                          disabled={verifyingReference === transaction.reference}
                        >
                          {verifyingReference === transaction.reference ? (
                            <span className="animate-spin">⟳</span>
                          ) : (
                            <IconCheck />
                          )}
                        </button>
                      )}
                      
                      <button
                        onClick={() => openStatusUpdateModal(transaction)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <span className="text-xs border border-gray-300 rounded px-2 py-1">Update</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-700">
          Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalTransactions} total transactions)
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
            disabled={pagination.currentPage === 1}
            className={`px-3 py-1 rounded ${pagination.currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Previous
          </button>
          <button
            onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.totalPages, prev.currentPage + 1) }))}
            disabled={pagination.currentPage === pagination.totalPages}
            className={`px-3 py-1 rounded ${pagination.currentPage === pagination.totalPages ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Next
          </button>
        </div>
      </div>
      
      {/* Transaction Detail Modal */}
      {showDetailModal && detailTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Transaction Details</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                  <IconX />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Reference</p>
                  <p className="font-semibold">{detailTransaction.reference}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-semibold">₵{detailTransaction.amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-semibold capitalize">{detailTransaction.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`font-semibold ${
                    detailTransaction.status === 'completed' ? 'text-green-600' : 
                    detailTransaction.status === 'failed' ? 'text-red-600' : 
                    'text-yellow-600'
                  }`}>
                    {detailTransaction.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gateway</p>
                  <p className="font-semibold">{detailTransaction.gateway}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-semibold">{new Date(detailTransaction.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500">User Information</p>
                <p className="font-semibold">{detailTransaction.userId?.name || 'Unknown'}</p>
                <p>{detailTransaction.userId?.email || 'No email'}</p>
                <p>{detailTransaction.userId?.phoneNumber || 'No phone number'}</p>
              </div>
              
              {/* Paystack verification results */}
              {detailTransaction.paystackVerification && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="font-bold text-lg mb-2">Paystack Verification</h3>
                  <div className={`p-3 mb-3 rounded ${detailTransaction.verified ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {detailTransaction.verificationMessage}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded overflow-x-auto">
                    <pre className="text-xs">
                      {JSON.stringify(detailTransaction.paystackVerification, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* Additional metadata */}
              {detailTransaction.metadata && Object.keys(detailTransaction.metadata).length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="font-bold text-lg mb-2">Additional Information</h3>
                  <div className="bg-gray-50 p-4 rounded overflow-x-auto">
                    <pre className="text-xs">
                      {JSON.stringify(detailTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openStatusUpdateModal(detailTransaction);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Update Transaction Status</h2>
                <button onClick={() => setShowStatusModal(false)} className="text-gray-500 hover:text-gray-700">
                  <IconX />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusUpdateData.status}
                  onChange={(e) => setStatusUpdateData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                <textarea
                  value={statusUpdateData.adminNotes}
                  onChange={(e) => setStatusUpdateData(prev => ({ ...prev, adminNotes: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                  rows="3"
                  placeholder="Reason for status change..."
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={updateTransactionStatus}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}