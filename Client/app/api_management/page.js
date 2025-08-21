'use client'
import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Edit, Trash2, Key, Settings, AlertCircle, 
  ChevronLeft, ChevronRight, Shield, Activity, Clock, 
  CheckCircle, XCircle, RefreshCw, Download, Eye, Copy,
  Zap, HandMetal, Cpu, UserCheck
} from 'lucide-react';
import UserEditModal from './userEditModal';
import { toast } from 'react-hot-toast';

const UserList = () => {
  const [apiUsers, setApiUsers] = useState([]);
  const [processingPrefs, setProcessingPrefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, configured, not-configured
  const [processingFilter, setProcessingFilter] = useState('all'); // all, manual, api
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [expandedUser, setExpandedUser] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchApiUsers();
  }, []);

  const fetchApiUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Fetch all users with API keys
      const usersResponse = await fetch('http://localhost:5000/api/developer/admin/users-with-api-keys', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const usersData = await usersResponse.json();
      
      // Fetch processing preferences
      const prefsResponse = await fetch('http://localhost:5000/api/developer/admin/api-user-processing', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const prefsData = await prefsResponse.json();
      
      if (usersData.status === 'success') {
        setApiUsers(usersData.data);
        
        // Create a map of userId to processing preferences
        const prefsMap = {};
        if (prefsData.status === 'success') {
          prefsData.data.forEach(pref => {
            prefsMap[pref.userId._id || pref.userId] = pref;
          });
        }
        setProcessingPrefs(prefsMap);
      }
    } catch (error) {
      console.error('Error fetching API users:', error);
      toast.error('Failed to load API users');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureUser = (user) => {
    setSelectedUser({
      ...user,
      processingPrefs: processingPrefs[user._id] || null
    });
    setShowEditModal(true);
  };

  const handleDeleteApiKey = async (userId, keyId) => {
    if (!window.confirm('Are you sure you want to revoke this API key?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/developer/admin/revoke-api-key/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('API key revoked successfully');
        fetchApiUsers();
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast.error('Failed to revoke API key');
    }
  };

  const copyApiKey = (key) => {
    // Only show first and last 4 characters for security
    const maskedKey = `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
    navigator.clipboard.writeText(key);
    toast.success(`API key copied: ${maskedKey}`);
  };

  const filteredUsers = apiUsers.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phoneNumber?.includes(searchTerm) ||
      user.apiKeys?.some(key => key.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const hasPrefs = !!processingPrefs[user._id];
    const matchesFilter = 
      filterType === 'all' || 
      (filterType === 'configured' && hasPrefs) ||
      (filterType === 'not-configured' && !hasPrefs);
    
    const prefs = processingPrefs[user._id];
    const matchesProcessing = 
      processingFilter === 'all' ||
      (processingFilter === 'manual' && prefs?.globalSkipGeonettech) ||
      (processingFilter === 'api' && prefs && !prefs.globalSkipGeonettech);
    
    return matchesSearch && matchesFilter && matchesProcessing;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const getProcessingStatus = (userId) => {
    const prefs = processingPrefs[userId];
    if (!prefs) {
      return {
        configured: false,
        method: 'Not Configured',
        badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: AlertCircle
      };
    }

    if (prefs.processingPriority === 'always_manual' || prefs.globalSkipGeonettech) {
      return {
        configured: true,
        method: 'Manual',
        badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: HandMetal
      };
    } else if (prefs.processingPriority === 'always_api' || !prefs.globalSkipGeonettech) {
      return {
        configured: true,
        method: 'API',
        badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: Zap
      };
    } else {
      return {
        configured: true,
        method: 'Dynamic',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: Cpu
      };
    }
  };

  const getApiKeyStatus = (apiKey) => {
    if (!apiKey.isActive) {
      return {
        text: 'Revoked',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      };
    }
    
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return {
        text: 'Expired',
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      };
    }
    
    const lastUsed = apiKey.lastUsed ? new Date(apiKey.lastUsed) : null;
    const daysSinceUse = lastUsed ? Math.floor((new Date() - lastUsed) / (1000 * 60 * 60 * 24)) : null;
    
    if (daysSinceUse && daysSinceUse > 30) {
      return {
        text: 'Inactive',
        badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      };
    }
    
    return {
      text: 'Active',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    };
  };

  const exportUsers = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'API Keys', 'Processing Method', 'Status', 'Daily Limit', 'Last Activity'],
      ...filteredUsers.map(user => {
        const prefs = processingPrefs[user._id];
        const processingStatus = getProcessingStatus(user._id);
        return [
          user.name || '',
          user.email || '',
          user.phoneNumber || '',
          user.apiKeys?.length || 0,
          processingStatus.method,
          prefs?.status || 'N/A',
          prefs?.orderLimits?.dailyOrderLimit || 'Unlimited',
          user.apiKeys?.[0]?.lastUsed ? new Date(user.apiKeys[0].lastUsed).toLocaleDateString() : 'Never'
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Export completed');
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total API Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{apiUsers.length}</p>
            </div>
            <Key className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Configured</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Object.keys(processingPrefs).length}
              </p>
            </div>
            <Settings className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manual Processing</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Object.values(processingPrefs).filter(p => p.globalSkipGeonettech).length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Keys</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {apiUsers.reduce((sum, user) => sum + (user.apiKeys?.filter(k => k.isActive)?.length || 0), 0)}
              </p>
            </div>
            <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users, API keys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Users</option>
            <option value="configured">Configured</option>
            <option value="not-configured">Not Configured</option>
          </select>

          <select
            value={processingFilter}
            onChange={(e) => setProcessingFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Processing</option>
            <option value="manual">Manual Only</option>
            <option value="api">API Only</option>
          </select>

          <button
            onClick={exportUsers}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          <button
            onClick={fetchApiUsers}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  API Keys
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Processing Config
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Limits & Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No API users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const processingStatus = getProcessingStatus(user._id);
                  const prefs = processingPrefs[user._id];
                  const ProcessingIcon = processingStatus.icon;
                  
                  return (
                    <React.Fragment key={user._id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name}
                              {prefs?.settings?.isVIP && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {user.phoneNumber}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            {user.apiKeys?.slice(0, 2).map((apiKey, idx) => {
                              const status = getApiKeyStatus(apiKey);
                              return (
                                <div key={apiKey._id} className="flex items-center gap-2">
                                  <Key className="h-4 w-4 text-gray-400" />
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {apiKey.name}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`px-2 py-0.5 text-xs rounded-full ${status.badge}`}>
                                        {status.text}
                                      </span>
                                      {apiKey.lastUsed && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          Last: {new Date(apiKey.lastUsed).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {user.apiKeys?.length > 2 && (
                              <button
                                onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                +{user.apiKeys.length - 2} more
                              </button>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ProcessingIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <span className={`px-3 py-1 text-sm rounded-full ${processingStatus.badge}`}>
                                {processingStatus.method}
                              </span>
                              {prefs && (
                                <div className="mt-2 space-y-1">
                                  {prefs.status !== 'active' && (
                                    <span className="block text-xs text-red-600 dark:text-red-400">
                                      Status: {prefs.status}
                                    </span>
                                  )}
                                  {prefs.processingPriority && prefs.processingPriority !== 'user_override' && (
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                                      Priority: {prefs.processingPriority}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          {prefs ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <div className="text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Daily: </span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {prefs.currentUsage?.dailyOrders?.count || 0}
                                    {prefs.orderLimits?.dailyOrderLimit && 
                                      ` / ${prefs.orderLimits.dailyOrderLimit}`}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Total: </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {prefs.currentUsage?.totalOrders || 0}
                                </span>
                              </div>
                              
                              {prefs.currentUsage?.lastOrderAt && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Last order: {new Date(prefs.currentUsage.lastOrderAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">
                              Not configured
                            </span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleConfigureUser(user)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Configure Processing"
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
                              className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Row */}
                      {expandedUser === user._id && (
                        <tr className="bg-gray-50 dark:bg-gray-750">
                          <td colSpan="5" className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* All API Keys */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                  All API Keys ({user.apiKeys?.length || 0})
                                </h4>
                                <div className="space-y-2">
                                  {user.apiKeys?.map((apiKey) => {
                                    const status = getApiKeyStatus(apiKey);
                                    return (
                                      <div key={apiKey._id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Key className="h-4 w-4 text-gray-400" />
                                            <div>
                                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {apiKey.name}
                                              </div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                                                {apiKey.expiresAt && ` • Expires: ${new Date(apiKey.expiresAt).toLocaleDateString()}`}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${status.badge}`}>
                                              {status.text}
                                            </span>
                                            <button
                                              onClick={() => handleDeleteApiKey(user._id, apiKey._id)}
                                              className="p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              
                              {/* Processing Configuration Details */}
                              {prefs && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                    Processing Configuration
                                  </h4>
                                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                                    <div>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">Networks:</span>
                                      <div className="mt-1 flex flex-wrap gap-2">
                                        {Object.entries(prefs.networkSettings || {}).map(([network, settings]) => (
                                          <span
                                            key={network}
                                            className={`px-2 py-1 text-xs rounded-full ${
                                              !settings.enabled 
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                : settings.skipGeonettech
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            }`}
                                          >
                                            {network}: {!settings.enabled ? 'Disabled' : settings.skipGeonettech ? 'Manual' : 'API'}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    {prefs.notes && (
                                      <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Notes:</span>
                                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{prefs.notes}</p>
                                      </div>
                                    )}
                                    
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Last updated: {new Date(prefs.updatedAt).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 rounded-lg ${
                      currentPage === i + 1
                        ? 'bg-indigo-600 text-white'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <UserEditModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            fetchApiUsers();
          }}
        />
      )}
    </div>
  );
};

export default UserList;