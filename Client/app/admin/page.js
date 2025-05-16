'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminUsers = () => {
  // Router
  const router = useRouter();
  
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showDeductMoneyModal, setShowDeductMoneyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [amountToAdd, setAmountToAdd] = useState('');
  const [amountToDeduct, setAmountToDeduct] = useState('');
  const [deductionReason, setDeductionReason] = useState('');
  const [disableReason, setDisableReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('walletBalance');
  const [sortOrder, setSortOrder] = useState('desc');
  const [darkMode, setDarkMode] = useState(false);

  // Check for dark mode preference
  useEffect(() => {
    // Check system preference first
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
    
    // Then check localStorage
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    }
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Fetch users on component mount
  useEffect(() => {
    checkAuth();
    fetchUsers(1);
  }, []);

  // Check if user is authenticated and is admin
  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      router.push('/login?redirect=/admin/users');
      return;
    }
  };

  // API call to fetch users
  const fetchUsers = async (page, search = searchTerm) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.get(
        `https://datamartbackened.onrender.com/api/users?page=${page}&search=${search}`,
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      
      const sortedUsers = sortUsers(response.data.users, sortBy, sortOrder);
      setUsers(sortedUsers);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        totalUsers: response.data.totalUsers
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      
      if (err.response && err.response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('authToken');
        router.push('/login?redirect=/admin/users');
        return;
      }
      
      if (err.response && err.response.status === 403) {
        // User is not admin
        toast.error('You do not have permission to view this page');
        router.push('/');
        return;
      }
      
      setError('Failed to load users. Please try again.');
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  // Sort users
  const sortUsers = (usersList, sortField, order) => {
    return [...usersList].sort((a, b) => {
      if (sortField === 'name' || sortField === 'email' || sortField === 'phoneNumber') {
        return order === 'asc' 
          ? a[sortField].localeCompare(b[sortField])
          : b[sortField].localeCompare(a[sortField]);
      } else {
        return order === 'asc' 
          ? a[sortField] - b[sortField]
          : b[sortField] - a[sortField];
      }
    });
  };

  // Handle sort change
  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to descending for balance, ascending for others
      setSortBy(field);
      setSortOrder(field === 'walletBalance' ? 'desc' : 'asc');
    }
    
    setUsers(sortUsers(users, field, sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc'));
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchUsers(page);
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, searchTerm);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Fetch user transactions
  const fetchUserTransactions = async (userId) => {
    try {
      setTransactionsLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(
        `https://datamartbackened.onrender.com/api/transactions?userId=${userId}`,
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      toast.error('Error loading transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Handle view transactions
  const handleViewTransactions = (user) => {
    setSelectedUser(user);
    fetchUserTransactions(user._id);
    setShowTransactionsModal(true);
  };

  // Handle add money to user's wallet
  const handleAddMoney = async () => {
    if (!amountToAdd || isNaN(amountToAdd) || parseFloat(amountToAdd) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.put(
        `https://datamartbackened.onrender.com/api/users/${selectedUser._id}/add-money`,
        { amount: parseFloat(amountToAdd) },
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      
      // Update user in the list
      setUsers(users.map(user => 
        user._id === selectedUser._id 
          ? { ...user, walletBalance: response.data.currentBalance } 
          : user
      ));
      
      toast.success(`Successfully added ${amountToAdd} to ${selectedUser.name}'s wallet`);
      setShowAddMoneyModal(false);
      setAmountToAdd('');
      setSelectedUser(null);
    } catch (err) {
      console.error('Error adding money:', err);
      toast.error(err.response?.data?.msg || 'Failed to add money');
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle deduct money from user's wallet
  const handleDeductMoney = async () => {
    if (!amountToDeduct || isNaN(amountToDeduct) || parseFloat(amountToDeduct) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.put(
        `https://datamartbackened.onrender.com/api/users/${selectedUser._id}/deduct-money`,
        { 
          amount: parseFloat(amountToDeduct),
          reason: deductionReason 
        },
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      
      // Update user in the list
      setUsers(users.map(user => 
        user._id === selectedUser._id 
          ? { ...user, walletBalance: response.data.currentBalance } 
          : user
      ));
      
      toast.success(`Successfully deducted ${amountToDeduct} from ${selectedUser.name}'s wallet`);
      setShowDeductMoneyModal(false);
      setAmountToDeduct('');
      setDeductionReason('');
      setSelectedUser(null);
    } catch (err) {
      console.error('Error deducting money:', err);
      if (err.response?.data?.msg === 'Insufficient balance') {
        toast.error(`Insufficient balance. Current balance: ${err.response.data.currentBalance}`);
      } else {
        toast.error(err.response?.data?.msg || 'Failed to deduct money');
      }
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle toggle user account status (disable/enable)
  const handleToggleUserStatus = async () => {
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.put(
        `https://datamartbackened.onrender.com/api/users/${selectedUser._id}/toggle-status`,
        { disableReason },
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      
      // Update user in the list
      setUsers(users.map(user => 
        user._id === selectedUser._id 
          ? { ...user, isDisabled: !user.isDisabled } 
          : user
      ));
      
      const actionText = selectedUser.isDisabled ? 'enabled' : 'disabled';
      toast.success(`User account has been ${actionText}`);
      setShowDisableModal(false);
      setDisableReason('');
      setSelectedUser(null);
    } catch (err) {
      console.error('Error toggling user status:', err);
      toast.error(err.response?.data?.msg || 'Failed to update user status');
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      await axios.delete(`https://datamartbackened.onrender.com/api/users/${selectedUser._id}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      // Remove user from the list
      setUsers(users.filter(user => user._id !== selectedUser._id));
      
      toast.success(`User ${selectedUser.name} has been deleted`);
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error(err.response?.data?.msg || 'Failed to delete user');
    } finally {
      setProcessingAction(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format transaction type with color
  const getTransactionTypeLabel = (type) => {
    const types = {
      'deposit': { text: 'Deposit', class: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' },
      'withdrawal': { text: 'Withdrawal', class: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' },
      'payment': { text: 'Payment', class: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' },
      'refund': { text: 'Refund', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' },
      'transfer': { text: 'Transfer', class: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' }
    };
    
    return types[type] || { text: type, class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100' };
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8">
        <Head>
          <title>Admin - User Management</title>
        </Head>
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">User Management</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${darkMode ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-white'}`}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            <button 
              onClick={() => router.push('/admin/dashboard')}
              className={`px-4 py-2 rounded-md ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Search bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, phone..."
                className={`flex-1 p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'border-gray-300'
                }`}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Search
              </button>
            </div>
          </form>

          {/* Error message */}
          {error && (
            <div className={`border px-4 py-3 rounded mb-4 ${
              darkMode 
                ? 'bg-red-900 border-red-700 text-red-100' 
                : 'bg-red-100 border-red-400 text-red-700'
            }`}>
              {error}
            </div>
          )}

          {/* Users table */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className={`min-w-full ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white'}`}>
                  <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th 
                        className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider cursor-pointer`}
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Name
                          {sortBy === 'name' && (
                            <span className="ml-1">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider cursor-pointer`}
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center">
                          Email
                          {sortBy === 'email' && (
                            <span className="ml-1">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider cursor-pointer`}
                        onClick={() => handleSort('phoneNumber')}
                      >
                        <div className="flex items-center">
                          Phone
                          {sortBy === 'phoneNumber' && (
                            <span className="ml-1">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}
                      >
                        Role
                      </th>
                      <th 
                        className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider cursor-pointer`}
                        onClick={() => handleSort('walletBalance')}
                      >
                        <div className="flex items-center">
                          Wallet Balance
                          {sortBy === 'walletBalance' && (
                            <span className="ml-1">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}
                      >
                        Status
                      </th>
                      <th 
                        className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={darkMode ? 'bg-gray-800' : ''}>
                    {users.length > 0 ? (
                      users.map((user) => (
                        <tr key={user._id} className={user.isDisabled ? (darkMode ? 'bg-gray-900' : 'bg-gray-100') : ''}>
                          <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            {user.name}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            {user.email}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            {user.phoneNumber}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === 'admin' 
                                ? darkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
                                : user.role === 'seller' 
                                ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                                : darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${
                            user.walletBalance > 100 
                              ? darkMode ? 'text-green-300' : 'text-green-600' 
                              : user.walletBalance < 10
                              ? darkMode ? 'text-red-300' : 'text-red-600'
                              : ''
                          }`}>
                            {user.walletBalance.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.isDisabled
                                ? darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
                                : darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                            }`}>
                              {user.isDisabled ? 'Disabled' : 'Active'}
                            </span>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowAddMoneyModal(true);
                                }}
                                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm transition-colors duration-200"
                                title="Add funds to user's wallet"
                              >
                                Add Money
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeductMoneyModal(true);
                                }}
                                className="px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm transition-colors duration-200"
                                title="Deduct funds from user's wallet"
                              >
                                Deduct
                              </button>
                              <button
                                onClick={() => handleViewTransactions(user)}
                                className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                                  darkMode 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                                title="View user's transaction history"
                              >
                                Transactions
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDisableModal(true);
                                }}
                                className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                                  user.isDisabled
                                    ? darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
                                    : darkMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'
                                } text-white`}
                                title={user.isDisabled ? "Enable user's account" : "Disable user's account"}
                              >
                                {user.isDisabled ? 'Enable' : 'Disable'}
                              </button>
                              <button
                                onClick={() => router.push(`/admin/users/${user._id}`)}
                                className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                                  darkMode 
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                                }`}
                                title="Edit user details"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteModal(true);
                                }}
                                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm transition-colors duration-200"
                                title="Delete user account"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className={`px-6 py-4 text-center border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.currentPage === 1}
                      className={`px-3 py-1 rounded-md ${
                        pagination.currentPage === 1
                          ? `${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'} cursor-not-allowed`
                          : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className={`px-3 py-1 rounded-md ${
                        pagination.currentPage === 1
                          ? `${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'} cursor-not-allowed`
                          : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      Prev
                    </button>
                    <span className="px-3 py-1 bg-blue-500 text-white rounded-md">
                      {pagination.currentPage}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className={`px-3 py-1 rounded-md ${
                        pagination.currentPage === pagination.totalPages
                          ? `${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'} cursor-not-allowed`
                          : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      Next
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className={`px-3 py-1 rounded-md ${
                        pagination.currentPage === pagination.totalPages
                          ? `${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'} cursor-not-allowed`
                          : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Transactions Modal */}
      {showTransactionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className={`rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Transactions for {selectedUser.name}
              </h2>
              <button
                onClick={() => {
                  setShowTransactionsModal(false);
                  setSelectedUser(null);
                  setTransactions([]);
                }}
                className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <p className="text-sm font-semibold mb-1">User Details</p>
                <p>Email: {selectedUser.email}</p>
                <p>Phone: {selectedUser.phoneNumber}</p>
                <p>Role: {selectedUser.role}</p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
                <p className="text-sm font-semibold mb-1">Wallet Information</p>
                <p className="text-lg font-bold">
                  Balance: {selectedUser.walletBalance.toFixed(2)}
                </p>
                <p>Account Status: {selectedUser.isDisabled ? 'Disabled' : 'Active'}</p>
              </div>
            </div>

            {transactionsLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className={`min-w-full ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white'}`}>
                  <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-4 py-2 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Date
                      </th>
                      <th className={`px-4 py-2 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Type
                      </th>
                      <th className={`px-4 py-2 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Amount
                      </th>
                      <th className={`px-4 py-2 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Status
                      </th>
                      <th className={`px-4 py-2 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Reference
                      </th>
                      <th className={`px-4 py-2 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Gateway
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => {
                      const typeLabel = getTransactionTypeLabel(transaction.type);
                      return (
                        <tr key={transaction._id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                          <td className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            {formatDate(transaction.createdAt)}
                          </td>
                          <td className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${typeLabel.class}`}>
                              {typeLabel.text}
                            </span>
                          </td>
                          <td className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} font-medium ${
                            transaction.type === 'deposit' || transaction.type === 'refund'
                              ? darkMode ? 'text-green-400' : 'text-green-600'
                              : darkMode ? 'text-red-400' : 'text-red-600'
                          }`}>
                            {transaction.type === 'deposit' || transaction.type === 'refund' ? '+' : '-'}
                            {transaction.amount.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                              transaction.status === 'completed'
                                ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                                : transaction.status === 'failed'
                                ? darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
                                : darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} text-sm`}>
                            {transaction.reference}
                          </td>
                          <td className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} text-sm`}>
                            {transaction.gateway}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`p-4 text-center rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                No transactions found for this user.
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowTransactionsModal(false);
                  setSelectedUser(null);
                  setTransactions([]);
                }}
                className={`px-4 py-2 rounded-md ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Money Modal */}
      {showAddMoneyModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">Add Money to Wallet</h2>
            <p className="mb-4">
              Add funds to <span className="font-semibold">{selectedUser.name}</span>'s wallet
            </p>
            <div className="mb-4">
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Amount</label>
              <input
                type="number"
                value={amountToAdd}
                onChange={(e) => setAmountToAdd(e.target.value)}
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'border-gray-300'
                }`}
                placeholder="Enter amount"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAddMoneyModal(false);
                  setSelectedUser(null);
                  setAmountToAdd('');
                }}
                className={`px-4 py-2 rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMoney}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
                disabled={processingAction}
              >
                {processingAction ? 'Processing...' : 'Add Funds'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deduct Money Modal */}
      {showDeductMoneyModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">Deduct Money from Wallet</h2>
            <p className="mb-4">
              Deduct funds from <span className="font-semibold">{selectedUser.name}</span>'s wallet
              <br />
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Current balance: {selectedUser.walletBalance.toFixed(2)}
              </span>
            </p>
            <div className="mb-4">
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Amount</label>
              <input
                type="number"
                value={amountToDeduct}
                onChange={(e) => setAmountToDeduct(e.target.value)}
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'border-gray-300'
                }`}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                max={selectedUser.walletBalance}
              />
            </div>
            <div className="mb-4">
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Reason (optional)</label>
              <input
                type="text"
                value={deductionReason}
                onChange={(e) => setDeductionReason(e.target.value)}
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'border-gray-300'
                }`}
                placeholder="Enter reason for deduction"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeductMoneyModal(false);
                  setSelectedUser(null);
                  setAmountToDeduct('');
                  setDeductionReason('');
                }}
                className={`px-4 py-2 rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={handleDeductMoney}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors duration-200"
                disabled={processingAction}
              >
                {processingAction ? 'Processing...' : 'Deduct Funds'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable/Enable User Modal */}
      {showDisableModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">
              {selectedUser.isDisabled ? 'Enable User Account' : 'Disable User Account'}
            </h2>
            <p className="mb-4">
              {selectedUser.isDisabled 
                ? `Are you sure you want to enable ${selectedUser.name}'s account?` 
                : `Are you sure you want to disable ${selectedUser.name}'s account?`}
            </p>
            
            {!selectedUser.isDisabled && (
              <div className="mb-4">
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Reason for disabling (required)
                </label>
                <textarea
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Enter reason for disabling the account"
                  rows="3"
                  required={!selectedUser.isDisabled}
                />
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDisableModal(false);
                  setSelectedUser(null);
                  setDisableReason('');
                }}
                className={`px-4 py-2 rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={handleToggleUserStatus}
                className={`px-4 py-2 text-white rounded-md transition-colors duration-200 ${
                  selectedUser.isDisabled
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
                disabled={processingAction || (!selectedUser.isDisabled && !disableReason)}
              >
                {processingAction 
                  ? 'Processing...' 
                  : selectedUser.isDisabled 
                  ? 'Enable Account' 
                  : 'Disable Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">Delete User</h2>
            <p className="mb-4">
              Are you sure you want to delete <span className="font-semibold">{selectedUser.name}</span>?
              This action cannot be undone.
            </p>
            <div className={`p-4 mb-4 rounded-lg ${darkMode ? 'bg-red-900 text-red-100' : 'bg-red-50 text-red-700'}`}>
              <p className="text-sm">
                <strong>Warning:</strong> Deleting this user will also remove all their transactions,
                data purchases, and referral records. Their wallet balance of <strong>{selectedUser.walletBalance.toFixed(2)}</strong> will be lost.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className={`px-4 py-2 rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
                disabled={processingAction}
              >
                {processingAction ? 'Processing...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add dark mode styles */}
      <style jsx global>{`
        .dark-mode {
          background-color: #1a202c;
          color: #f7fafc;
        }
        
        /* Custom scrollbar for dark mode */
        .dark-mode ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .dark-mode ::-webkit-scrollbar-track {
          background: #2d3748;
        }
        
        .dark-mode ::-webkit-scrollbar-thumb {
          background: #4a5568;
          border-radius: 4px;
        }
        
        .dark-mode ::-webkit-scrollbar-thumb:hover {
          background: #718096;
        }
      `}</style>
    </div>
  );
};

export default AdminUsers;