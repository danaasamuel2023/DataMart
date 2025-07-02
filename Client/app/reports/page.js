'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, BarChart3, FileText, Users, Clock, CheckCircle, XCircle, AlertTriangle,
  TrendingUp, Save, RefreshCw, Search, Filter, Calendar, Network, Shield, LogOut,
  Moon, Sun, Download, Trash2, Copy, CheckSquare, Square, Menu, X
} from 'lucide-react';

// Constants
const API_BASE = 'https://datamartbackened.onrender.com/api/v1/reports';
const STATUS_OPTIONS = ['pending', 'under_review', 'investigating', 'resolved', 'rejected'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];
const RESOLUTION_TYPES = ['refund', 'resend', 'compensation', 'no_action'];

// Utility functions
const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    investigating: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
};

const getPriorityColor = (priority) => {
  const colors = {
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };
  return colors[priority] || colors.low;
};

const formatDate = (dateString) => new Date(dateString).toLocaleString();

// Components
const LoadingSpinner = () => (
  <div className="text-center py-8">
    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
  </div>
);

const MessageAlert = ({ message, type }) => {
  if (!message) return null;
  
  const colors = {
    success: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    error: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    info: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className={`p-4 rounded-lg transition-colors ${colors[type] || colors.info}`}>
        {message}
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children, size = "max-w-4xl" }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white dark:bg-gray-800 rounded-lg ${size} w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700`}>
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

const AdminReportDashboard = () => {
  // State Management
  const [state, setState] = useState({
    activeTab: 'dashboard',
    userData: null,
    loading: false,
    authLoading: true,
    message: '',
    messageType: '',
    authToken: null,
    darkMode: false,
    mobileMenuOpen: false,
    analytics: null,
    hourlyAnalytics: null,
    reports: [],
    pagination: {},
    currentPage: 1,
    filters: { status: '', priority: '', search: '', referenceType: '' },
    selectedReports: new Set(),
    settings: {
      isReportingEnabled: true,
      reportTimeLimit: 'same_day',
      reportTimeLimitHours: 24,
      allowedReportDays: 1,
      maxReportsPerUser: 5,
      maxReportsPerUserPerDay: 3,
      allowedReportReasons: ['Data not received', 'Wrong amount credited', 'Network error', 'Slow delivery', 'Double charging', 'Other'],
      autoResolveAfterDays: 7
    },
    selectedReport: null,
    reportUpdate: { status: '', priority: '', adminNote: '', resolutionType: '', amount: '', description: '' },
    bulkStatus: '',
    bulkPriority: '',
    bulkAdminNote: '',
    showBulkStatusModal: false
  });

  // Destructure commonly used state
  const { activeTab, userData, loading, authLoading, message, messageType, authToken, darkMode, 
          analytics, reports, filters, selectedReports, selectedReport, reportUpdate, settings,
          showBulkStatusModal, bulkStatus, bulkPriority, bulkAdminNote, mobileMenuOpen } = state;

  // Helper to update state
  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

  // Authentication & API Methods
  const makeAuthenticatedRequest = useCallback(async (url, options = {}) => {
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await fetch(url, { ...options, headers: defaultOptions.headers });
    
    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(response.status === 401 ? 'Session expired' : 'Access forbidden');
      throw new Error(response.status === 401 ? 'Session expired' : 'Access forbidden');
    }

    return response;
  }, [authToken]);

  const showMessage = useCallback((msg, type = 'info') => {
    updateState({ message: msg, messageType: type });
    setTimeout(() => updateState({ message: '' }), 5000);
  }, []);

  const handleUnauthorized = useCallback((reason) => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    updateState({ authToken: null, userData: null });
    showMessage('Please log in with proper credentials', 'error');
  }, [showMessage]);

  // Data Loading Methods
  const loadAnalytics = useCallback(async () => {
    if (!authToken) return;
    
    updateState({ loading: true });
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/analytics?days=30`);
      const data = await response.json();
      
      if (data.success) {
        updateState({ analytics: data.data });
      } else {
        showMessage(data.message || 'Failed to load analytics', 'error');
      }
    } catch (error) {
      if (!['Session expired', 'Access forbidden'].includes(error.message)) {
        showMessage('Error loading analytics', 'error');
      }
    } finally {
      updateState({ loading: false });
    }
  }, [authToken, makeAuthenticatedRequest, showMessage]);

  const loadReports = useCallback(async () => {
    if (!authToken) return;
    
    updateState({ loading: true });
    try {
      const params = new URLSearchParams({
        page: state.currentPage.toString(),
        limit: '20',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/reports?${params}`);
      const data = await response.json();
      
      if (data.success) {
        updateState({ 
          reports: data.data.reports,
          pagination: data.data.pagination,
          selectedReports: new Set()
        });
      } else {
        showMessage(data.message || 'Failed to load reports', 'error');
      }
    } catch (error) {
      if (!['Session expired', 'Access forbidden'].includes(error.message)) {
        showMessage('Error loading reports', 'error');
      }
    } finally {
      updateState({ loading: false });
    }
  }, [authToken, state.currentPage, filters, makeAuthenticatedRequest, showMessage]);

  const loadSettings = useCallback(async () => {
    if (!authToken || userData?.role !== 'admin') return;
    
    updateState({ loading: true });
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/settings`);
      const data = await response.json();
      
      if (data.success) {
        updateState({ settings: data.data });
      } else {
        showMessage(data.message || 'Failed to load settings', 'error');
      }
    } catch (error) {
      if (!['Session expired', 'Access forbidden'].includes(error.message)) {
        showMessage('Error loading settings', 'error');
      }
    } finally {
      updateState({ loading: false });
    }
  }, [authToken, userData, makeAuthenticatedRequest, showMessage]);

  const updateSettings = useCallback(async () => {
    if (!authToken || userData?.role !== 'admin') {
      showMessage('Admin access required to update settings', 'error');
      return;
    }
    
    updateState({ loading: true });
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      if (data.success) {
        showMessage('Settings updated successfully', 'success');
        updateState({ settings: data.data });
      } else {
        showMessage(data.message || 'Error updating settings', 'error');
      }
    } catch (error) {
      if (!['Session expired', 'Access forbidden'].includes(error.message)) {
        showMessage('Error updating settings', 'error');
      }
    } finally {
      updateState({ loading: false });
    }
  }, [authToken, userData, settings, makeAuthenticatedRequest, showMessage]);

  // Report Management
  const updateReportStatus = useCallback(async () => {
    if (!selectedReport || !authToken) return;

    updateState({ loading: true });
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE}/admin/reports/${selectedReport.reportId}/status`, 
        {
          method: 'PUT',
          body: JSON.stringify({
            status: reportUpdate.status || selectedReport.status,
            priority: reportUpdate.priority || selectedReport.priority,
            adminNote: reportUpdate.adminNote || ''
          })
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        showMessage('Report updated successfully', 'success');
        updateState({ selectedReport: null });
        loadReports();
        if (activeTab === 'dashboard') loadAnalytics();
      } else {
        showMessage(data.message || 'Error updating report', 'error');
      }
    } catch (error) {
      if (!['Session expired', 'Access forbidden'].includes(error.message)) {
        showMessage('Network error updating report', 'error');
      }
    } finally {
      updateState({ loading: false });
    }
  }, [selectedReport, authToken, reportUpdate, activeTab, makeAuthenticatedRequest, showMessage, loadReports, loadAnalytics]);

  // Bulk update status
  const bulkUpdateStatus = useCallback(async () => {
    if (selectedReports.size === 0) {
      showMessage('Please select reports first', 'error');
      return;
    }

    if (!bulkStatus && !bulkPriority && !bulkAdminNote) {
      showMessage('Please select at least one field to update', 'error');
      return;
    }

    updateState({ loading: true });
    try {
      const reportIds = Array.from(selectedReports).map(reportMongoId => {
        const report = reports.find(r => r._id === reportMongoId);
        return report?.reportId;
      }).filter(Boolean);

      let successCount = 0;
      let failCount = 0;

      for (const reportId of reportIds) {
        try {
          const updateData = {};
          if (bulkStatus) updateData.status = bulkStatus;
          if (bulkPriority) updateData.priority = bulkPriority;
          if (bulkAdminNote) updateData.adminNote = bulkAdminNote;

          const response = await makeAuthenticatedRequest(`${API_BASE}/admin/reports/${reportId}/status`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Failed to update report ${reportId}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        showMessage(`Successfully updated ${successCount} reports${failCount > 0 ? `, ${failCount} failed` : ''}`, 'success');
        updateState({ 
          selectedReports: new Set(),
          showBulkStatusModal: false,
          bulkStatus: '',
          bulkPriority: '',
          bulkAdminNote: ''
        });
        loadReports();
      } else {
        showMessage('Failed to update reports', 'error');
      }
    } catch (error) {
      console.error('Bulk status update error:', error);
      showMessage('Network error updating status', 'error');
    } finally {
      updateState({ loading: false });
    }
  }, [selectedReports, reports, bulkStatus, bulkPriority, bulkAdminNote, makeAuthenticatedRequest, showMessage, loadReports]);

  // Effects
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    updateState({ 
      darkMode: savedDarkMode ? JSON.parse(savedDarkMode) : window.matchMedia('(prefers-color-scheme: dark)').matches 
    });
    
    // Check authentication
    const checkAuth = async () => {
      updateState({ authLoading: true });
      try {
        const token = localStorage.getItem('authToken');
        const storedUserData = localStorage.getItem('userData');
        
        if (!token || !storedUserData) {
          handleUnauthorized('Please log in to access this dashboard');
          return;
        }

        const user = JSON.parse(storedUserData);
        
        if (!user || (user.role !== 'admin' && user.role !== 'reporter')) {
          handleUnauthorized('Insufficient permissions');
          return;
        }

        updateState({ authToken: token, userData: user });
      } catch (error) {
        handleUnauthorized('Invalid user data');
      } finally {
        updateState({ authLoading: false });
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (userData && authToken) {
      if (activeTab === 'dashboard') {
        loadAnalytics();
      } else if (activeTab === 'reports') {
        loadReports();
      } else if (activeTab === 'settings' && userData.role === 'admin') {
        loadSettings();
      }
    }
  }, [userData, authToken, activeTab, state.currentPage, filters, loadAnalytics, loadReports, loadSettings]);

  // Render helpers
  const renderDashboard = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { icon: FileText, color: 'blue', label: 'Total Reports', value: analytics.summary.totalReports },
            { icon: Clock, color: 'yellow', label: 'Pending', value: analytics.summary.pendingReports },
            { icon: CheckCircle, color: 'green', label: 'Resolved', value: analytics.summary.resolvedReports },
            { icon: TrendingUp, color: 'purple', label: 'Resolution Rate', value: `${analytics.summary.resolutionRate}%` }
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Icon className={`w-6 h-6 sm:w-8 sm:h-8 text-${color}-500`} />
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReportsTable = () => (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-3 sm:px-6 py-3 text-left">
              <button
                onClick={() => {
                  const newSelected = selectedReports.size === reports.length ? new Set() : new Set(reports.map(r => r._id));
                  updateState({ selectedReports: newSelected });
                }}
                className="flex items-center space-x-1 sm:space-x-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
              >
                {selectedReports.size === reports.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span className="hidden sm:inline">Select</span>
              </button>
            </th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Report</th>
            <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order Info</th>
            <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {reports.map((report) => (
            <tr key={report._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => {
                    const newSelected = new Set(selectedReports);
                    newSelected.has(report._id) ? newSelected.delete(report._id) : newSelected.add(report._id);
                    updateState({ selectedReports: newSelected });
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {selectedReports.has(report._id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                </button>
              </td>
              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">#{report.reportId}</div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{report.phoneNumber}</div>
              </td>
              <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{report.userId?.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{report.userId?.email}</div>
              </td>
              <td className="px-3 sm:px-6 py-4">
                <div className="text-xs sm:text-sm text-gray-900 dark:text-white">
                  {report.purchaseId?.geonetReference || 'N/A'}
                  {report.purchaseId?.geonetReference && (
                    <span className={`ml-1 sm:ml-2 px-1 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full ${
                      report.purchaseId.geonetReference.startsWith('MN') 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                        : report.purchaseId.geonetReference.startsWith('GN')
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {report.purchaseId.geonetReference.substring(0, 2)}
                    </span>
                  )}
                </div>
                {report.purchaseId?.createdAt && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(report.purchaseId.createdAt).toLocaleDateString()}
                  </div>
                )}
              </td>
              <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">{report.reportReason}</div>
              </td>
              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.status)}`}>
                  {report.status}
                </span>
              </td>
              <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(report.priority)}`}>
                  {report.priority?.toUpperCase()}
                </span>
              </td>
              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => {
                    updateState({ 
                      selectedReport: report,
                      reportUpdate: { status: '', priority: '', adminNote: '', resolutionType: '', amount: '', description: '' }
                    });
                  }}
                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Loading state
  if (authLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );

  // Auth check
  if (!userData || !authToken || (userData.role !== 'admin' && userData.role !== 'reporter')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md text-center max-w-md w-full">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2 text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            You need admin or reporter privileges to access this dashboard.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => updateState({ mobileMenuOpen: !mobileMenuOpen })}
                className="lg:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  {userData.name} ({userData.role})
                </p>
              </div>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              {['dashboard', 'reports', ...(userData.role === 'admin' ? ['settings'] : [])].map(tab => (
                <button
                  key={tab}
                  onClick={() => updateState({ activeTab: tab })}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab === 'dashboard' && <BarChart3 className="w-4 h-4 inline mr-2" />}
                  {tab === 'reports' && <FileText className="w-4 h-4 inline mr-2" />}
                  {tab === 'settings' && <Settings className="w-4 h-4 inline mr-2" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
              <button
                onClick={() => updateState({ darkMode: !darkMode })}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('userData');
                  window.location.href = '/login';
                }}
                className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 flex items-center transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>

            {/* Mobile dark mode toggle */}
            <div className="flex lg:hidden items-center space-x-2">
              <button
                onClick={() => updateState({ darkMode: !darkMode })}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('userData');
                  window.location.href = '/login';
                }}
                className="p-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 border-t border-gray-200 dark:border-gray-700 mt-4">
              <div className="flex flex-col space-y-2 mt-4">
                {['dashboard', 'reports', ...(userData.role === 'admin' ? ['settings'] : [])].map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      updateState({ activeTab: tab, mobileMenuOpen: false });
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors text-left ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {tab === 'dashboard' && <BarChart3 className="w-4 h-4 inline mr-2" />}
                    {tab === 'reports' && <FileText className="w-4 h-4 inline mr-2" />}
                    {tab === 'settings' && <Settings className="w-4 h-4 inline mr-2" />}
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <MessageAlert message={message} type={messageType} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && renderDashboard()}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 lg:gap-4 items-end">
                <select
                  value={filters.status}
                  onChange={(e) => updateState({ filters: {...filters, status: e.target.value} })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Status</option>
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
                
                <select
                  value={filters.priority}
                  onChange={(e) => updateState({ filters: {...filters, priority: e.target.value} })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Priority</option>
                  {PRIORITY_OPTIONS.map(priority => (
                    <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>
                  ))}
                </select>
                
                <select
                  value={filters.referenceType}
                  onChange={(e) => updateState({ filters: {...filters, referenceType: e.target.value} })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All References</option>
                  <option value="MN">MN References</option>
                  <option value="GN">GN References</option>
                </select>
                
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={filters.search}
                  onChange={(e) => updateState({ filters: {...filters, search: e.target.value} })}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                
                <button
                  onClick={loadReports}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedReports.size > 0 && (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                    <span className="text-sm font-bold text-white">
                      {selectedReports.size} report(s) selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                      onClick={() => updateState({ showBulkStatusModal: true })}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium text-sm transition-all duration-200 flex items-center shadow-md hover:shadow-lg"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Update Status
                    </button>
                    
                    <button
                      onClick={() => {
                        const selectedReportsList = Array.from(selectedReports).map(id => 
                          reports.find(r => r._id === id)
                        ).filter(Boolean);
                        
                        const text = selectedReportsList.map(report => {
                          const ref = report.purchaseId?.geonetReference || 'N/A';
                          const phone = report.phoneNumber || 'N/A';
                          const capacity = report.purchaseId?.capacity ? `${report.purchaseId.capacity}GB` : 'N/A';
                          const network = report.purchaseId?.network || 'N/A';
                          const orderDate = report.purchaseId?.createdAt 
                            ? new Date(report.purchaseId.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A';
                          
                          return `Ref: ${ref}\nPhone: ${phone}\nData: ${capacity}\nNetwork: ${network}\nOrder Date: ${orderDate}`;
                        }).join('\n\n');
                        
                        navigator.clipboard.writeText(text).then(() => {
                          showMessage('Orders copied to clipboard', 'success');
                        });
                      }}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition-all duration-200 flex items-center shadow-md hover:shadow-lg"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Orders
                    </button>
                    
                    <button
                      onClick={() => updateState({ selectedReports: new Set() })}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reports Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              {loading ? <LoadingSpinner /> : reports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No reports found</p>
                </div>
              ) : renderReportsTable()}
              
              {/* Pagination */}
              {state.pagination.pages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 gap-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                    Showing {((state.pagination.page - 1) * state.pagination.limit) + 1} to{' '}
                    {Math.min(state.pagination.page * state.pagination.limit, state.pagination.total)} of {state.pagination.total} reports
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateState({ currentPage: state.currentPage - 1 })}
                      disabled={state.currentPage <= 1}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                      {state.currentPage}
                    </span>
                    <button
                      onClick={() => updateState({ currentPage: state.currentPage + 1 })}
                      disabled={state.currentPage >= state.pagination.pages}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && userData?.role === 'admin' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-900 dark:text-white">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Report System Settings
            </h2>

            <div className="space-y-4 sm:space-y-6">
              {/* Basic Settings */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.isReportingEnabled}
                    onChange={(e) => updateState({ settings: {...settings, isReportingEnabled: e.target.checked} })}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Enable Reporting System</span>
                </label>
              </div>

              {/* Time Limit Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report Time Limit
                </label>
                <select
                  value={settings.reportTimeLimit}
                  onChange={(e) => updateState({ settings: {...settings, reportTimeLimit: e.target.value} })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="same_day">Same Day (Hours)</option>
                  <option value="specific_days">Specific Days</option>
                  <option value="all_time">All Time</option>
                  <option value="no_reporting">No Reporting</option>
                </select>
              </div>

              {settings.reportTimeLimit === 'same_day' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Limit (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8760"
                    value={settings.reportTimeLimitHours}
                    onChange={(e) => updateState({ settings: {...settings, reportTimeLimitHours: parseInt(e.target.value)} })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              )}

              {settings.reportTimeLimit === 'specific_days' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Allowed Report Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.allowedReportDays}
                    onChange={(e) => updateState({ settings: {...settings, allowedReportDays: parseInt(e.target.value)} })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              )}

              {/* User Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Reports Per User
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.maxReportsPerUser}
                    onChange={(e) => updateState({ settings: {...settings, maxReportsPerUser: parseInt(e.target.value)} })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Reports Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxReportsPerUserPerDay}
                    onChange={(e) => updateState({ settings: {...settings, maxReportsPerUserPerDay: parseInt(e.target.value)} })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              {/* Auto Resolve Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Auto Resolve After (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.autoResolveAfterDays}
                  onChange={(e) => updateState({ settings: {...settings, autoResolveAfterDays: parseInt(e.target.value)} })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Report Reasons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Allowed Report Reasons
                </label>
                <div className="space-y-2">
                  {settings.allowedReportReasons.map((reason, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => {
                          const newReasons = [...settings.allowedReportReasons];
                          newReasons[index] = e.target.value;
                          updateState({ settings: {...settings, allowedReportReasons: newReasons} });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <button
                        onClick={() => {
                          const newReasons = settings.allowedReportReasons.filter((_, i) => i !== index);
                          updateState({ settings: {...settings, allowedReportReasons: newReasons} });
                        }}
                        className="px-3 py-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      updateState({ 
                        settings: {
                          ...settings, 
                          allowedReportReasons: [...settings.allowedReportReasons, 'New Reason']
                        }
                      });
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
                  >
                    Add Reason
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <button
                  onClick={updateSettings}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors text-sm"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Access Denied for Non-Admins */}
        {activeTab === 'settings' && userData?.role !== 'admin' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8 text-center border border-gray-200 dark:border-gray-700">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Admin Access Required</h3>
            <p className="text-gray-600 dark:text-gray-400">Only administrators can access system settings.</p>
          </div>
        )}
      </div>

      {/* Report Management Modal */}
      <Modal 
        isOpen={!!selectedReport} 
        onClose={() => updateState({ selectedReport: null })}
        title={`Manage Report #${selectedReport?.reportId}`}
        size="max-w-2xl lg:max-w-4xl"
      >
        {selectedReport && (
          <div className="space-y-4">
            {/* Report Details */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Report Details</h4>
                <button
                  onClick={() => {
                    const orderRef = selectedReport.purchaseId?.geonetReference || 'N/A';
                    const phoneNumber = selectedReport.phoneNumber || 'N/A';
                    const dataAmount = selectedReport.purchaseId?.capacity ? `${selectedReport.purchaseId.capacity}GB` : 'N/A';
                    const network = selectedReport.purchaseId?.network || 'N/A';
                    const orderDate = selectedReport.purchaseId?.createdAt 
                      ? new Date(selectedReport.purchaseId.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A';
                    
                    const textToCopy = `Order: ${orderRef}\nPhone: ${phoneNumber}\nData: ${dataAmount}\nNetwork: ${network}\nOrder Date: ${orderDate}`;
                    
                    navigator.clipboard.writeText(textToCopy).then(() => {
                      showMessage('Order details copied to clipboard', 'success');
                    }).catch(() => {
                      showMessage('Failed to copy order details', 'error');
                    });
                  }}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center text-sm transition-colors"
                  title="Copy order details"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Order Info
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><strong>User:</strong> {selectedReport.userId?.name}</div>
                <div><strong>Phone:</strong> {selectedReport.phoneNumber}</div>
                <div><strong>Order:</strong> {selectedReport.purchaseId?.geonetReference || 'N/A'}</div>
                <div><strong>Order Date:</strong> {selectedReport.purchaseId?.createdAt ? new Date(selectedReport.purchaseId.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A'}</div>
                <div><strong>Report Created:</strong> {formatDate(selectedReport.createdAt)}</div>
                <div><strong>Network:</strong> {selectedReport.purchaseId?.network}</div>
                <div><strong>Capacity:</strong> {selectedReport.purchaseId?.capacity}GB</div>
                <div><strong>Price:</strong> GHS {selectedReport.purchaseId?.price}</div>
              </div>
            </div>

            {/* Update Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select
                value={reportUpdate.status}
                onChange={(e) => updateState({ reportUpdate: {...reportUpdate, status: e.target.value} })}
                className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-sm"
              >
                <option value="">Keep current status</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>

              <select
                value={reportUpdate.priority}
                onChange={(e) => updateState({ reportUpdate: {...reportUpdate, priority: e.target.value} })}
                className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-sm"
              >
                <option value="">Keep current priority</option>
                {PRIORITY_OPTIONS.map(priority => (
                  <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>
                ))}
              </select>
            </div>

            <textarea
              value={reportUpdate.adminNote}
              onChange={(e) => updateState({ reportUpdate: {...reportUpdate, adminNote: e.target.value} })}
              placeholder="Add admin note..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-sm"
            />

            <button
              onClick={updateReportStatus}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Update Report'}
            </button>
          </div>
        )}
      </Modal>

     {/* Bulk Status Update Modal */}
      <Modal
        isOpen={showBulkStatusModal}
        onClose={() => updateState({ 
          showBulkStatusModal: false,
          bulkStatus: '',
          bulkPriority: '',
          bulkAdminNote: ''
        })}
        title="Bulk Update Status"
        size="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Update status for {selectedReports.size} selected report(s)
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={bulkStatus}
              onChange={(e) => updateState({ bulkStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Keep current</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={bulkPriority}
              onChange={(e) => updateState({ bulkPriority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Keep current</option>
              {PRIORITY_OPTIONS.map(priority => (
                <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Note
            </label>
            <textarea
              value={bulkAdminNote}
              onChange={(e) => updateState({ bulkAdminNote: e.target.value })}
              placeholder="Add note for all selected reports..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={bulkUpdateStatus}
              disabled={loading || (!bulkStatus && !bulkPriority && !bulkAdminNote)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm transition-colors"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>Update {selectedReports.size} Reports</>
              )}
            </button>
            
            <button
              onClick={() => updateState({ 
                showBulkStatusModal: false,
                bulkStatus: '',
                bulkPriority: '',
                bulkAdminNote: ''
              })}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminReportDashboard;