'use client'
import React, { useState, useEffect } from 'react';
import { Search, Calendar, Download, Filter, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// External API configuration
const PROVIDER_BASE_URL = 'https://posapi.geonettech.com/api/v1';
const API_KEY = '21|rkrw7bcoGYjK8irAOTMaZ8sc1LRHYcwjuZnZmMNw4a6196f1';

const TransactionsPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [networkFilter, setNetworkFilter] = useState('All');
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  const itemsPerPage = 10;
  // MTN Brand color
  const mtnYellow = "#ffcc00";

  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      router.push('/SignIn');
      return;
    }

    // Fetch user data from localStorage
    const userDataString = localStorage.getItem('userData');
    if (!userDataString) {
      router.push('/SignIn');
      return;
    }

    const userData = JSON.parse(userDataString);
    fetchTransactions(userData.id);
    
    // Set up interval to refresh transaction statuses
    const intervalId = setInterval(() => fetchTransactions(userData.id), 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [router, currentPage, dateFilter, networkFilter]);

  // Fetch transactions from API
  const fetchTransactions = async (userId) => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');
      
      // Build query parameters
      let queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage
      });

      if (dateFilter.startDate) {
        queryParams.append('startDate', dateFilter.startDate);
      }
      
      if (dateFilter.endDate) {
        queryParams.append('endDate', dateFilter.endDate);
      }
      
      if (networkFilter !== 'All') {
        queryParams.append('network', networkFilter);
      }

      const response = await fetch(`http://localhost:5000/api/v1/data/user-transactions/${userId}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const responseData = await response.json();
      
      if (responseData.status === 'success') {
        // First map the transactions
        const mappedTransactions = responseData.data.transactions.map(order => ({
          id: order._id,
          orderId: order.orderId,
          customer: order.phoneNumber,
          amount: order.price,
          gb: formatDataCapacity(order.capacity),
          date: new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          time: new Date(order.createdAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          network: order.network,
          status: order.status
        }));
        
        // Then check for external status updates
        const transactionsWithUpdatedStatus = await Promise.all(
          mappedTransactions.map(async (transaction) => {
            // Skip certain networks or transactions if needed
            if (transaction.network === 'SomeNetworkToSkip') return transaction;
            
            try {
              const statusResponse = await axios.get(
                `${PROVIDER_BASE_URL}/order/${transaction.reference}/status`,
                {
                  headers: {
                    Authorization: `Bearer ${API_KEY}`
                  }
                }
              );
              
              const externalStatus = statusResponse.data.status;
              
              // Check if status has changed to completed
              if (externalStatus === 'Completed' && transaction.status !== 'Completed') {
                try {
                  // Notify your backend about the status change
                  await axios.post(`http://localhost:5000/api/v1/data/update-status/${transaction.id}`, {
                    status: externalStatus
                  }, {
                    headers: {
                      'Authorization': `Bearer ${authToken}`
                    }
                  });
                } catch (updateError) {
                  console.error('Failed to update transaction status:', updateError);
                }
              }
              
              return {
                ...transaction,
                status: externalStatus || transaction.status
              };
            } catch (error) {
              console.error(`Failed to fetch status for transaction ${transaction.id}:`, error);
              return transaction;
            }
          })
        );
        
        setTransactions(transactionsWithUpdatedStatus);
        setTotalPages(Math.ceil(responseData.data.totalCount / itemsPerPage));
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // You might want to show an error message to the user
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format data capacity (convert to GB if needed)
  const formatDataCapacity = (capacity) => {
    if (capacity >= 1000) {
      return (capacity / 1000).toFixed(1);
    }
    return capacity;
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
    // This would normally filter the transactions or make an API call with search params
  };

  // Handle filter change
  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page when filters change
    setIsFiltersVisible(false); // Hide filters panel after applying
  };

  // Handle export to CSV
  const exportToCSV = () => {
    // Create CSV content
    const csvHeader = 'Date,Time,Phone Number,Network,Data Package,Amount,Status\n';
    const csvContent = transactions.map(t => 
      `${t.date},${t.time},${t.customer},${t.network},${t.gb} GB,${t.amount},${t.status}`
    ).join('\n');
    
    // Create and download file
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get today's date
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/dashboard')}
                className="mr-3 p-2 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">MTN</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
            </div>
            <div className="flex items-center text-gray-600">
              <Calendar className="h-5 w-5 mr-2" />
              <span>{today}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-6 bg-white rounded-lg shadow overflow-hidden">
          <div className="h-2" style={{ backgroundColor: mtnYellow }}></div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex mb-4 md:mb-0">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder="Search by phone number..."
                    className="w-full px-4 py-2 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-gray-700"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </form>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                  className="px-4 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </button>
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 rounded-lg text-white flex items-center"
                  style={{ backgroundColor: mtnYellow }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {isFiltersVisible && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-md font-medium text-gray-700 mb-3">Filter Transactions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      value={networkFilter}
                      onChange={(e) => setNetworkFilter(e.target.value)}
                    >
                      <option value="All">All Networks</option>
                      <option value="MTN">MTN</option>
                      <option value="Vodafone">Vodafone</option>
                      <option value="AirtelTigo">AirtelTigo</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setDateFilter({ startDate: '', endDate: '' });
                      setNetworkFilter('All');
                    }}
                    className="px-4 py-2 mr-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Reset
                  </button>
                  <button
                    onClick={applyFilters}
                    className="px-4 py-2 text-white rounded-md"
                    style={{ backgroundColor: mtnYellow }}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-2" style={{ backgroundColor: mtnYellow }}></div>
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">All Transactions</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Network
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Package
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{transaction.date}</div>
                          <div className="text-sm text-gray-500">{transaction.time}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{transaction.customer}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{transaction.network}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{transaction.gb} GB</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(transaction.amount)}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${transaction.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                             transaction.status === 'Failed' ? 'bg-red-100 text-red-800' : 
                             'bg-yellow-100 text-yellow-800'}`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium 
                      ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium 
                      ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{currentPage}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center rounded-l-md px-2 py-2
                          ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      {/* Page numbers - show up to 5 pages */}
                      {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = idx + 1;
                        } else if (currentPage <= 3) {
                          pageNum = idx + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + idx;
                        } else {
                          pageNum = currentPage - 2 + idx;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium
                              ${currentPage === pageNum ? 
                                'z-10 bg-yellow-50 text-yellow-600 border border-yellow-500' : 
                                'bg-white text-gray-500 hover:bg-gray-50'}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center rounded-r-md px-2 py-2
                          ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;