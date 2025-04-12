'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminUsers = () => {
  const router = useRouter();
  
  // General state
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // All users state
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pending users state
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedPendingUsers, setSelectedPendingUsers] = useState([]);
  
  // Only keep modal state we need for disable/approve
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableReason, setDisableReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    checkAuth();
    fetchUsers(1);
    fetchPendingUsers();
  }, []);

  // Check if user is authenticated and is admin
  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      router.push('/login?redirect=/admin/users');
      return;
    }
  };

  // API call to fetch all users
  const fetchUsers = async (page, search = searchTerm) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://datamartbackened.onrender.com'}/api/users?page=${page}&search=${search}`,
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

  // API call to fetch pending users
  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://datamartbackened.onrender.com'}/api/admin/users/pending`,
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      
      setPendingUsers(response.data.data);
      setSelectedPendingUsers([]); // Reset selections when fetching new data
      setError(null);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      
      if (err.response && err.response.status === 401) {
       
        return;
      }
      
      if (err.response && err.response.status === 403) {
        toast.error('You do not have permission to view this page');
        router.push('/');
        return;
      }
      
      setError('Failed to load pending users. Please try again.');
      toast.error('Error loading pending users');
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

  // Handle toggle user disabled status
  const handleToggleUserStatus = async () => {
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://datamartbackened.onrender.com'}/api/users/${selectedUser._id}/toggle-status`,
        { disableReason: disableReason || 'Administrative action' },
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      
      // Update user in the list
      setUsers(users.map(user => 
        user._id === selectedUser._id 
          ? { ...user, isDisabled: response.data.user.isDisabled } 
          : user
      ));
      
      const actionMessage = response.data.user.isDisabled 
        ? `User ${selectedUser.name} has been disabled` 
        : `User ${selectedUser.name} has been enabled`;
      
      toast.success(actionMessage);
      setShowDisableModal(false);
      setDisableReason('');
      setSelectedUser(null);
      
      // Refresh the user list to get updated statuses
      fetchUsers(pagination.currentPage);
    } catch (err) {
      console.error('Error toggling user status:', err);
      toast.error(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle selection of pending users
  const handleSelectPendingUser = (userId) => {
    setSelectedPendingUsers(prevSelected => {
      if (prevSelected.includes(userId)) {
        return prevSelected.filter(id => id !== userId);
      } else {
        return [...prevSelected, userId];
      }
    });
  };

  // Handle select all pending users
  const handleSelectAllPendingUsers = () => {
    if (selectedPendingUsers.length === pendingUsers.length) {
      // If all are selected, unselect all
      setSelectedPendingUsers([]);
    } else {
      // Otherwise, select all
      setSelectedPendingUsers(pendingUsers.map(user => user._id));
    }
  };

  // Handle approve single pending user
  const handleApproveUser = async (userId) => {
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://datamartbackened.onrender.com'}/api/admin/users/${userId}/approve`,
        {},
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      
      // Remove from pending users list
      setPendingUsers(pendingUsers.filter(user => user._id !== userId));
      
      toast.success('User approved successfully');
      // Refresh all users list to include the newly approved user
      fetchUsers(pagination.currentPage);
      
      // Also refresh the pending users list
      fetchPendingUsers();
    } catch (err) {
      console.error('Error approving user:', err);
      toast.error(err.response?.data?.message || 'Failed to approve user');
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle approve multiple pending users
  const handleApproveMultipleUsers = async () => {
    if (selectedPendingUsers.length === 0) {
      toast.warning('No users selected for approval');
      return;
    }

    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      // Process approvals sequentially to avoid overwhelming the server
      let successCount = 0;
      let errorCount = 0;
      
      for (const userId of selectedPendingUsers) {
        try {
          await axios.put(
            `${process.env.NEXT_PUBLIC_API_URL || 'https://datamartbackened.onrender.com'}/api/admin/users/${userId}/approve`,
            {},
            {
              headers: {
                'x-auth-token': token
              }
            }
          );
          successCount++;
        } catch (err) {
          console.error(`Error approving user ${userId}:`, err);
          errorCount++;
        }
      }
      
      // Display appropriate message based on results
      if (successCount > 0 && errorCount > 0) {
        toast.success(`${successCount} users approved successfully. ${errorCount} failed.`);
      } else if (successCount > 0) {
        toast.success(`${successCount} users approved successfully.`);
      } else {
        toast.error('Failed to approve selected users. Please try again.');
      }
      
      // Refresh both user lists
      fetchUsers(pagination.currentPage);
      fetchPendingUsers();
      
      // Clear selections
      setSelectedPendingUsers([]);
    } catch (err) {
      console.error('Error in multiple approval process:', err);
      toast.error('An error occurred during the approval process. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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

      {/* Tab navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('all')}
              className={`${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm mr-8`}
            >
              All Users
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
            >
              Pending Users
              {pendingUsers.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* All Users Tab */}
      {activeTab === 'all' && (
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
                        Status
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
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.isDisabled 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {user.isDisabled ? 'Disabled' : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDisableModal(true);
                                  setDisableReason(user.disableReason || '');
                                }}
                                className={`px-3 py-1 ${
                                  user.isDisabled
                                    ? 'bg-blue-500 hover:bg-blue-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                } text-white rounded-md text-sm`}
                              >
                                {user.isDisabled ? 'Enable' : 'Disable'}
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
      )}

      {/* Pending Users Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Users Awaiting Approval</h2>
            
            {/* Bulk approval button */}
            {pendingUsers.length > 0 && (
              <button
                onClick={handleApproveMultipleUsers}
                disabled={selectedPendingUsers.length === 0 || processingAction}
                className={`px-4 py-2 ${
                  selectedPendingUsers.length === 0 || processingAction
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                } text-white rounded-md`}
              >
                {processingAction ? 'Processing...' : `Approve Selected (${selectedPendingUsers.length})`}
              </button>
            )}
          </div>
          
          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Pending users table */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="px-4 py-3 border-b-2 border-gray-200">
                      <input
                        type="checkbox"
                        checked={pendingUsers.length > 0 && selectedPendingUsers.length === pendingUsers.length}
                        onChange={handleSelectAllPendingUsers}
                        disabled={pendingUsers.length === 0}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                    </th>
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
                      Referred By
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date Registered
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.length > 0 ? (
                    pendingUsers.map((user) => (
                      <tr key={user._id}>
                        <td className="px-4 py-4 whitespace-nowrap border-b border-gray-200 text-center">
                          <input
                            type="checkbox"
                            checked={selectedPendingUsers.includes(user._id)}
                            onChange={() => handleSelectPendingUser(user._id)}
                            className="form-checkbox h-5 w-5 text-blue-600"
                          />
                        </td>
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
                          {user.referredBy || 'None'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                          <button
                            onClick={() => handleApproveUser(user._id)}
                            disabled={processingAction}
                            className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center border-b border-gray-200">
                        No pending users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Disable/Enable User Modal */}
      {showDisableModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                <label className="block text-gray-700 mb-2">Reason for disabling</label>
                <input
                  type="text"
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter reason for disabling account"
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
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={handleToggleUserStatus}
                className={`px-4 py-2 ${
                  selectedUser.isDisabled
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-red-500 hover:bg-red-600'
                } text-white rounded-md`}
                disabled={processingAction}
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
    </div>
  );
};

export default AdminUsers;