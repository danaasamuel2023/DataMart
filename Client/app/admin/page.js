// pages/admin/users.js
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import axios from 'axios';

// Components

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
  const [amountToAdd, setAmountToAdd] = useState('');
  const [amountToDeduct, setAmountToDeduct] = useState('');
  const [deductionReason, setDeductionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

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
      
      setUsers(response.data.users);
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

  // Handle page change
  const handlePageChange = (page) => {
    fetchUsers(page);
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, searchTerm);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>Admin - User Management</title>
      </Head>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.push('/admin/dashboard')}
            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="flex-1 p-2 border border-gray-300 rounded-md"
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
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
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
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="px-6 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Wallet Balance
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user._id}>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                          {user.phoneNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : user.role === 'seller' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                          {user.walletBalance.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowAddMoneyModal(true);
                              }}
                              className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                            >
                              Add Money
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeductMoneyModal(true);
                              }}
                              className="px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm"
                            >
                              Deduct Money
                            </button>
                            <button
                              onClick={() => router.push(`/admin/users/${user._id}`)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteModal(true);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center border-b border-gray-200">
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
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className={`px-3 py-1 rounded-md ${
                      pagination.currentPage === 1
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 hover:bg-gray-300'
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
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className={`px-3 py-1 rounded-md ${
                      pagination.currentPage === pagination.totalPages
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 hover:bg-gray-300'
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

      {/* Add Money Modal */}
      {showAddMoneyModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Money to Wallet</h2>
            <p className="mb-4">
              Add funds to <span className="font-semibold">{selectedUser.name}</span>'s wallet
            </p>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Amount</label>
              <input
                type="number"
                value={amountToAdd}
                onChange={(e) => setAmountToAdd(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
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
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMoney}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Deduct Money from Wallet</h2>
            <p className="mb-4">
              Deduct funds from <span className="font-semibold">{selectedUser.name}</span>'s wallet
              <br />
              <span className="text-sm text-gray-600">Current balance: {selectedUser.walletBalance.toFixed(2)}</span>
            </p>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Amount</label>
              <input
                type="number"
                value={amountToDeduct}
                onChange={(e) => setAmountToDeduct(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter amount"
                min="0"
                step="0.01"
                max={selectedUser.walletBalance}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Reason (optional)</label>
              <input
                type="text"
                value={deductionReason}
                onChange={(e) => setDeductionReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
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
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={handleDeductMoney}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                disabled={processingAction}
              >
                {processingAction ? 'Processing...' : 'Deduct Funds'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Delete User</h2>
            <p className="mb-4">
              Are you sure you want to delete <span className="font-semibold">{selectedUser.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                disabled={processingAction}
              >
                {processingAction ? 'Processing...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;