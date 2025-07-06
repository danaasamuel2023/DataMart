'use client'
import React, { useState, useEffect } from 'react';
import { Send, Users, User, Filter, MessageSquare, AlertCircle, CheckCircle, Clock, X, History, TrendingUp, RefreshCw, Search, ChevronDown } from 'lucide-react';

const SMSDashboard = () => {
  // State management
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [senderId, setSenderId] = useState('DataMartGH');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [sendMethod, setSendMethod] = useState('group'); // Default to group
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [filters, setFilters] = useState({
    role: 'all',
    approvalStatus: 'all',
    search: ''
  });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    todayCampaigns: 0,
    totalSmsSent: 0,
    todaySmsSent: 0,
    creditBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [smsHistory, setSmsHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('authToken') || '';
  };

  // API base URL - adjust this to match your backend
  const API_BASE_URL = 'http://localhost:5000/api';

  // API call helper with x-auth-token
  const apiCall = async (endpoint, options = {}) => {
    const token = getAuthToken();
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }
    
    return response.json();
  };

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch users when filters change
  useEffect(() => {
    if (sendMethod === 'quick') {
      fetchUsers();
    }
  }, [filters, currentPage, sendMethod]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchUserGroups(),
        fetchSmsHistory()
      ]);
      
      if (sendMethod === 'quick') {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setSendResult({
        status: 'error',
        message: 'Failed to load data. Please check your authentication.'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 50,
        role: filters.role,
        approvalStatus: filters.approvalStatus,
        search: filters.search
      });

      const data = await apiCall(`/sms/users?${queryParams}`);
      setUsers(data.data.users);
      setTotalPages(data.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiCall('/sms/stats');
      const balanceData = await apiCall('/sms/balance');
      
      setStats({
        ...data.data,
        creditBalance: balanceData.data.balance
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUserGroups = async () => {
    try {
      const data = await apiCall('/sms/groups');
      setUserGroups(data.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchSmsHistory = async () => {
    try {
      const data = await apiCall('/sms/history?limit=10');
      setSmsHistory(data.data.history);
    } catch (error) {
      console.error('Error fetching SMS history:', error);
    }
  };

  const fetchCampaignDetails = async (campaignId) => {
    try {
      const data = await apiCall(`/sms/campaign/${campaignId}`);
      setSelectedCampaign(data.data);
      setShowCampaignDetails(true);
    } catch (error) {
      console.error('Error fetching campaign details:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u._id));
    }
  };

  const handleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSelectGroup = (groupId) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter(id => id !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }
  };

  const calculateTotalRecipients = () => {
    if (sendMethod === 'quick') {
      return selectedUsers.length;
    } else {
      return selectedGroups.reduce((total, groupId) => {
        const group = userGroups.find(g => g.id === groupId);
        return total + (group?.count || 0);
      }, 0);
    }
  };

  const handleSendSMS = async () => {
    // Validation
    if (sendMethod === 'quick' && selectedUsers.length === 0) {
      setSendResult({
        status: 'error',
        message: 'Please select at least one user to send SMS'
      });
      return;
    }
    
    if (sendMethod === 'group' && selectedGroups.length === 0) {
      setSendResult({
        status: 'error',
        message: 'Please select at least one group to send SMS'
      });
      return;
    }
    
    if (!message.trim()) {
      setSendResult({
        status: 'error',
        message: 'Please enter a message'
      });
      return;
    }
    
    if (!senderId.trim() || senderId.length > 11) {
      setSendResult({
        status: 'error',
        message: 'Sender ID must be provided and at most 11 characters'
      });
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const payload = {
        method: sendMethod,
        userIds: sendMethod === 'quick' ? selectedUsers : undefined,
        groupIds: sendMethod === 'group' ? selectedGroups : undefined,
        message: message,
        senderId: senderId,
        isScheduled: isScheduled,
        scheduleDate: isScheduled ? scheduleDate : undefined
      };

      const data = await apiCall('/sms/send', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSendResult({
        status: 'success',
        message: data.message,
        data: data.data
      });

      // Reset form
      setMessage('');
      setSelectedUsers([]);
      setSelectedGroups([]);
      setIsScheduled(false);
      setScheduleDate('');
      
      // Refresh stats and history
      fetchStats();
      fetchSmsHistory();
      
    } catch (error) {
      setSendResult({
        status: 'error',
        message: error.message || 'Failed to send SMS. Please try again.'
      });
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'processing':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'completed_with_errors':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading SMS Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-700 dark:to-indigo-700 rounded-lg p-6 sm:p-8 mb-6 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">SMS Dashboard</h1>
              <p className="text-purple-100 dark:text-purple-200">Send bulk SMS messages to your DataMartGH users</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchInitialData}
                className="bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <History className="h-4 w-4" />
                {showHistory ? 'Hide' : 'Show'} History
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Total Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCampaigns}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Today's Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todayCampaigns}</p>
              </div>
              <Clock className="h-10 w-10 text-green-500 dark:text-green-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Total SMS Sent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSmsSent.toLocaleString()}</p>
              </div>
              <Send className="h-10 w-10 text-purple-500 dark:text-purple-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Today's SMS</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todaySmsSent}</p>
              </div>
              <MessageSquare className="h-10 w-10 text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">SMS Credits</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.creditBalance.toLocaleString()}</p>
              </div>
              <MessageSquare className="h-10 w-10 text-yellow-500 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Recent History */}
        {showHistory && smsHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recent SMS Campaigns</h2>
            <div className="space-y-3">
              {smsHistory.map((campaign) => (
                <div 
                  key={campaign._id} 
                  className="border dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => fetchCampaignDetails(campaign.campaignId)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 dark:text-white">Campaign ID: {campaign.campaignId}</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {campaign.message.substring(0, 100)}
                        {campaign.message.length > 100 && '...'}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>Sent by: {campaign.sentBy?.name || 'Admin'}</span>
                        <span>Recipients: {campaign.totalRecipients}</span>
                        <span>Sent: {campaign.totalSent || 0}</span>
                        <span>Credits: {campaign.creditsUsed || 0}</span>
                        <span>{formatDate(campaign.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recipients Selection */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select Recipients</h2>
            
            {/* Send Method Tabs */}
            <div className="flex mb-4 border-b dark:border-gray-700">
              <button
                onClick={() => setSendMethod('quick')}
                className={`px-4 py-2 font-medium transition-colors ${
                  sendMethod === 'quick'
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Quick SMS (Individual)
              </button>
              <button
                onClick={() => setSendMethod('group')}
                className={`px-4 py-2 font-medium ml-4 transition-colors ${
                  sendMethod === 'group'
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Group SMS
              </button>
            </div>

            {sendMethod === 'quick' ? (
              <>
                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <select
                    value={filters.role}
                    onChange={(e) => setFilters({...filters, role: e.target.value})}
                    className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="buyer">Buyers</option>
                    <option value="seller">Sellers</option>
                    <option value="reporter">Reporters</option>
                    <option value="Dealer">Dealers</option>
                    <option value="admin">Admins</option>
                  </select>
                  
                  <select
                    value={filters.approvalStatus}
                    onChange={(e) => setFilters({...filters, approvalStatus: e.target.value})}
                    className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  
                  <div className="flex-1 min-w-[200px] relative">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="w-full px-3 py-2 pl-10 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>

                {/* Users Table */}
                <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedUsers.length === users.length && users.length > 0}
                              onChange={handleSelectAll}
                              className="rounded dark:bg-gray-600 dark:border-gray-500"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Phone</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Role</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {users.map((user) => (
                          <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user._id)}
                                onChange={() => handleSelectUser(user._id)}
                                className="rounded dark:bg-gray-600 dark:border-gray-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{user.phoneNumber}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.approvalStatus === 'approved' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : user.approvalStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {user.approvalStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedUsers.length} user(s) selected
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Group Selection */}
                <div className="space-y-3">
                  {userGroups.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => handleSelectGroup(group.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedGroups.includes(group.id)
                          ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedGroups.includes(group.id)}
                            onChange={() => handleSelectGroup(group.id)}
                            className="rounded mr-3 dark:bg-gray-600 dark:border-gray-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{group.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{group.count} members</p>
                            {group.description && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{group.description}</p>
                            )}
                          </div>
                        </div>
                        <Users className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-300">
                    {selectedGroups.length} group(s) selected
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                    Total recipients: {calculateTotalRecipients().toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Message Composition */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Compose Message</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sender ID
                </label>
                <input
                  type="text"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  placeholder="e.g. DataMartGH"
                  maxLength={11}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max 11 characters</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={6}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>{message.length} characters</span>
                  <span>{Math.ceil(message.length / 160)} SMS</span>
                </div>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="rounded mr-2 dark:bg-gray-600 dark:border-gray-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Schedule SMS</span>
                </label>
              </div>
              
              {isScheduled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Schedule Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}
              
              <div className="pt-4">
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Summary</p>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                    <p>Recipients: {calculateTotalRecipients().toLocaleString()}</p>
                    <p>Estimated Credits: {calculateTotalRecipients()}</p>
                    <p>Sender: {senderId || 'Not set'}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleSendSMS}
                  disabled={sending || calculateTotalRecipients() === 0}
                  className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send SMS
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Result Alert */}
        {sendResult && (
          <div className={`mt-6 p-4 rounded-lg flex items-start ${
            sendResult.status === 'success' 
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            <div className="flex-shrink-0">
              {sendResult.status === 'success' ? (
                <CheckCircle className="h-5 w-5 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 mt-0.5" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="font-medium">{sendResult.message}</p>
              {sendResult.data && (
                <div className="mt-2 text-sm">
                  <p>Campaign ID: {sendResult.data.campaignId}</p>
                  <p>Recipients: {sendResult.data.totalRecipients}</p>
                  {sendResult.data.totalSent !== undefined && (
                    <p>Messages sent: {sendResult.data.totalSent}</p>
                  )}
                  {sendResult.data.creditsUsed !== undefined && (
                    <p>Credits used: {sendResult.data.creditsUsed}</p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setSendResult(null)}
              className="flex-shrink-0 ml-4 hover:opacity-70 transition-opacity"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Campaign Details Modal */}
        {showCampaignDetails && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Campaign Details</h3>
                  <button
                    onClick={() => {
                      setShowCampaignDetails(false);
                      setSelectedCampaign(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Campaign ID</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCampaign.campaignId}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(selectedCampaign.status)}`}>
                      {selectedCampaign.status}
                    </span>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Message</p>
                    <p className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-gray-900 dark:text-white">{selectedCampaign.message}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sender ID</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCampaign.senderId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sent By</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCampaign.sentBy?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Recipients</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCampaign.totalRecipients}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sent</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCampaign.totalSent || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCampaign.totalFailed || 0}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Created At</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedCampaign.createdAt)}</p>
                  </div>
                  
                  {selectedCampaign.completedAt && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Completed At</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedCampaign.completedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SMSDashboard;