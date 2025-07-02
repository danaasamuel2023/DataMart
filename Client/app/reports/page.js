'use client'
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  BarChart3, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Save,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Network,
  Shield,
  LogOut,
  Moon,
  Sun,
  Download,
  Trash2
} from 'lucide-react';

const AdminReportDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [authToken, setAuthToken] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  // Dashboard state
  const [analytics, setAnalytics] = useState(null);
  const [hourlyAnalytics, setHourlyAnalytics] = useState(null);

  // Reports state
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  });

  // Settings state
  const [settings, setSettings] = useState({
    isReportingEnabled: true,
    reportTimeLimit: 'same_day',
    reportTimeLimitHours: 24,
    allowedReportDays: 1,
    maxReportsPerUser: 5,
    maxReportsPerUserPerDay: 3,
    allowedReportReasons: [
      'Data not received',
      'Wrong amount credited',
      'Network error',
      'Slow delivery',
      'Double charging',
      'Other'
    ],
    autoResolveAfterDays: 7
  });

  // Report update state
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportUpdate, setReportUpdate] = useState({
    status: '',
    priority: '',
    adminNote: '',
    resolutionType: '',
    amount: '',
    description: ''
  });

  const API_BASE = 'https://datamartbackened.onrender.com/api/v1/reports';

  // Initialize dark mode and authentication
  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    } else {
      // Default to system preference
      setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    
    checkAuthentication();
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Load data when user and tab changes
  useEffect(() => {
    if (userData && authToken) {
      if (activeTab === 'dashboard') {
        loadAnalytics();
        loadHourlyAnalytics();
      } else if (activeTab === 'reports') {
        loadReports();
      } else if (activeTab === 'settings') {
        loadSettings();
      }
    }
  }, [userData, authToken, activeTab, currentPage, filters]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const checkAuthentication = async () => {
    setAuthLoading(true);
    try {
      // Get token and user data from localStorage
      const token = localStorage.getItem('authToken');
      const storedUserData = localStorage.getItem('userData');
      
      if (!token || !storedUserData) {
        handleUnauthorized('Please log in to access this dashboard');
        return;
      }

      // Parse stored user data
      const user = JSON.parse(storedUserData);
      
      // Check if user has required permissions
      if (!user || (user.role !== 'admin' && user.role !== 'reporter')) {
        handleUnauthorized('Insufficient permissions - Admin or Reporter role required');
        return;
      }

      setAuthToken(token);
      setUserData(user);
      
    } catch (error) {
      console.error('Authentication check failed:', error);
      handleUnauthorized('Invalid user data - Please log in again');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUnauthorized = (reason) => {
    console.warn('Unauthorized access:', reason);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setAuthToken(null);
    setUserData(null);
    showMessage('Please log in with proper credentials', 'error');
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setAuthToken(null);
    setUserData(null);
    showMessage('Logged out successfully', 'info');
    window.location.href = '/login';
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await fetch(url, { ...options, headers: defaultOptions.headers });
    
    // Handle authentication errors
    if (response.status === 401) {
      handleUnauthorized('Session expired');
      throw new Error('Session expired');
    }
    
    if (response.status === 403) {
      handleUnauthorized('Access forbidden');
      throw new Error('Access forbidden');
    }

    return response;
  };

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // Debug function to check report structure
  const debugReportStructure = (report) => {
    console.log('Report structure debug:', {
      _id: report._id,
      reportId: report.reportId,
      hasReportId: !!report.reportId,
      reportIdType: typeof report.reportId,
      allKeys: Object.keys(report)
    });
  };

  // Enhanced report management button click handler
  const handleManageReport = (report) => {
    console.log('Managing report:', report);
    debugReportStructure(report);
    
    setSelectedReport(report);
    setReportUpdate({
      status: report.status || '',
      priority: report.priority || 'medium',
      adminNote: '',
      resolutionType: '',
      amount: '',
      description: ''
    });
  };

  const exportAllReports = async () => {
    try {
      setLoading(true);
      
      // Use the new bulk export endpoint
      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/reports/bulk/export`, {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          includeUserDetails: true,
          includePurchaseDetails: true,
          includeAdminNotes: false
        })
      });

      if (response.ok) {
        // Get filename from response headers or create default
        const disposition = response.headers.get('Content-Disposition');
        const filename = disposition 
          ? disposition.split('filename=')[1]?.replace(/"/g, '') 
          : `all_reports_export_${new Date().toISOString().split('T')[0]}.csv`;
        
        // Download the file
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showMessage('Reports exported successfully', 'success');
      } else {
        const errorData = await response.json();
        showMessage(errorData.message || 'Error exporting reports', 'error');
      }
    } catch (error) {
      if (error.message !== 'Session expired' && error.message !== 'Access forbidden') {
        showMessage('Error exporting reports', 'error');
        console.error('Export error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!authToken) return;
    
    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/analytics?days=30`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      } else {
        showMessage(data.message || 'Failed to load analytics', 'error');
      }
    } catch (error) {
      if (error.message !== 'Session expired' && error.message !== 'Access forbidden') {
        showMessage('Error loading analytics', 'error');
        console.error('Analytics error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHourlyAnalytics = async () => {
    if (!authToken) return;
    
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/analytics/hourly?days=7`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setHourlyAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error loading hourly analytics:', error);
    }
  };

  const loadReports = async () => {
    if (!authToken) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/reports?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        console.log('Reports loaded:', data.data.reports);
        // Debug: Log the first report structure
        if (data.data.reports.length > 0) {
          console.log('First report structure:', data.data.reports[0]);
          console.log('First report status:', data.data.reports[0].status);
          console.log('First report priority:', data.data.reports[0].priority);
          // Check if status field exists in the data
          data.data.reports.forEach((report, index) => {
            if (!report.status) {
              console.warn(`Report at index ${index} has no status field!`, report);
            }
          });
        }
        setReports(data.data.reports);
        setPagination(data.data.pagination);
      } else {
        showMessage(data.message || 'Failed to load reports', 'error');
      }
    } catch (error) {
      if (error.message !== 'Session expired' && error.message !== 'Access forbidden') {
        showMessage('Error loading reports', 'error');
        console.error('Reports error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    if (!authToken || userData?.role !== 'admin') return;
    
    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/settings`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      } else {
        showMessage(data.message || 'Failed to load settings', 'error');
      }
    } catch (error) {
      if (error.message !== 'Session expired' && error.message !== 'Access forbidden') {
        showMessage('Error loading settings', 'error');
        console.error('Settings error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    if (!authToken || userData?.role !== 'admin') {
      showMessage('Admin access required to update settings', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      if (data.success) {
        showMessage('Settings updated successfully', 'success');
        setSettings(data.data);
      } else {
        showMessage(data.message || 'Error updating settings', 'error');
      }
    } catch (error) {
      if (error.message !== 'Session expired' && error.message !== 'Access forbidden') {
        showMessage('Error updating settings', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fixed updateReportStatus function
  const updateReportStatus = async () => {
    if (!selectedReport || !authToken) {
      showMessage('No report selected', 'error');
      return;
    }

    // Validate that we have required fields
    if (!reportUpdate.status && !reportUpdate.priority && !reportUpdate.adminNote) {
      showMessage('Please provide at least one update (status, priority, or note)', 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('Updating report:', {
        reportId: selectedReport.reportId,
        reportMongoId: selectedReport._id,
        updates: reportUpdate
      });

      // Use the human-readable reportId (like RPT000001) not the MongoDB _id
      const reportIdToUse = selectedReport.reportId;
      
      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/reports/${reportIdToUse}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: reportUpdate.status || selectedReport.status,
          priority: reportUpdate.priority || selectedReport.priority,
          adminNote: reportUpdate.adminNote || ''
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        showMessage('Report updated successfully', 'success');
        setSelectedReport(null);
        setReportUpdate({ status: '', priority: '', adminNote: '', resolutionType: '', amount: '', description: '' });
        loadReports(); // Reload the reports list
        
        // Refresh analytics if we're on dashboard
        if (activeTab === 'dashboard') {
          loadAnalytics();
        }
      } else {
        console.error('Update failed:', {
          status: response.status,
          data: data
        });
        showMessage(data.message || 'Error updating report', 'error');
      }
    } catch (error) {
      console.error('Error updating report:', error);
      if (error.message !== 'Session expired' && error.message !== 'Access forbidden') {
        showMessage('Network error updating report', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fixed resolveReport function
  const resolveReport = async () => {
    if (!selectedReport || !authToken) {
      showMessage('No report selected', 'error');
      return;
    }

    if (!reportUpdate.resolutionType) {
      showMessage('Please select a resolution type', 'error');
      return;
    }

    // Validate amount for refund/compensation
    if ((reportUpdate.resolutionType === 'refund' || reportUpdate.resolutionType === 'compensation') && 
        (!reportUpdate.amount || isNaN(parseFloat(reportUpdate.amount)) || parseFloat(reportUpdate.amount) <= 0)) {
      showMessage('Please enter a valid amount for refund/compensation', 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('Resolving report:', {
        reportId: selectedReport.reportId,
        resolutionType: reportUpdate.resolutionType,
        amount: reportUpdate.amount,
        description: reportUpdate.description
      });

      // Use the human-readable reportId (like RPT000001) not the MongoDB _id
      const reportIdToUse = selectedReport.reportId;
      
      const response = await makeAuthenticatedRequest(`${API_BASE}/admin/reports/${reportIdToUse}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({
          resolutionType: reportUpdate.resolutionType,
          amount: reportUpdate.amount ? parseFloat(reportUpdate.amount) : null,
          description: reportUpdate.description || `Report resolved with ${reportUpdate.resolutionType}`,
          adminNote: reportUpdate.adminNote || `Resolved: ${reportUpdate.resolutionType}`
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        let successMessage = 'Report resolved successfully';
        if (reportUpdate.resolutionType === 'refund' && reportUpdate.amount) {
          successMessage += ` with GHS ${reportUpdate.amount} refund`;
        }
        showMessage(successMessage, 'success');
        
        setSelectedReport(null);
        setReportUpdate({ status: '', priority: '', adminNote: '', resolutionType: '', amount: '', description: '' });
        loadReports(); // Reload the reports list
        
        // Refresh analytics
        if (activeTab === 'dashboard') {
          loadAnalytics();
        }
      } else {
        console.error('Resolution failed:', {
          status: response.status,
          data: data
        });
        showMessage(data.message || 'Error resolving report', 'error');
      }
    } catch (error) {
      console.error('Error resolving report:', error);
      if (error.message !== 'Session expired' && error.message !== 'Access forbidden') {
        showMessage('Network error resolving report', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      investigating: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      auto_resolved: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getPriorityColor = (priority) => {
    if (!priority) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    
    const colors = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Show loading screen during authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Verifying Access</h2>
          <p className="text-gray-600 dark:text-gray-400">Please wait while we verify your credentials...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not authenticated or authorized
  if (!userData || !authToken || (userData.role !== 'admin' && userData.role !== 'reporter')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center max-w-md">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2 text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            You need admin or reporter privileges to access this dashboard.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Login
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Report Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                Welcome, {userData.name} ({userData.role})
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Reports
              </button>
              {userData.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Settings className="w-4 h-4 inline mr-2" />
                  Settings
                </button>
              )}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 flex items-center transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`p-4 rounded-lg transition-colors ${
            messageType === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
            messageType === 'error' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
            'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
          }`}>
            {message}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Reports</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.summary.totalReports}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-yellow-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.summary.pendingReports}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.summary.resolvedReports}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolution Rate</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.summary.resolutionRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hourly Analytics */}
            {hourlyAnalytics && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                  <Calendar className="w-5 h-5 mr-2" />
                  "Data Not Received" Reports - Hourly Analysis
                </h3>
                
                {/* Peak Hours */}
                {hourlyAnalytics.peakHours && hourlyAnalytics.peakHours.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Peak Problem Hours</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {hourlyAnalytics.peakHours.slice(0, 3).map((peak, index) => (
                        <div key={peak.hour} className={`p-4 rounded-lg border ${
                          index === 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                          index === 1 ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                          'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        }`}>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{peak.timeRange}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{peak.totalReports} reports</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">Severity: {peak.severity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Network Issues */}
                {hourlyAnalytics.networkStats && Object.keys(hourlyAnalytics.networkStats).length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Network Performance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(hourlyAnalytics.networkStats).map(([network, stats]) => (
                        <div key={network} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Network className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                              <span className="font-medium text-gray-900 dark:text-white">{network}</span>
                            </div>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">{stats.total} issues</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insights */}
                {hourlyAnalytics.insights && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Key Insights</h4>
                    <div className="space-y-2">
                      {hourlyAnalytics.insights.mostProblematicHour && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            <strong>Most Problematic Hour:</strong> {hourlyAnalytics.insights.mostProblematicHour.timeRange} 
                            ({hourlyAnalytics.insights.mostProblematicHour.totalReports} reports)
                          </p>
                        </div>
                      )}
                      {hourlyAnalytics.insights.networkMostAffected && (
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <p className="text-sm text-orange-800 dark:text-orange-200">
                            <strong>Most Affected Network:</strong> {hourlyAnalytics.insights.networkMostAffected[0]} 
                            ({hourlyAnalytics.insights.networkMostAffected[1].total} total issues)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Smart Recommendations */}
            {analytics && analytics.insights && analytics.insights.recommendations && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Smart Recommendations
                </h3>
                <div className="space-y-3">
                  {analytics.insights.recommendations.map((rec, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      rec.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                      rec.severity === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}>
                      <div className="flex items-start">
                        <AlertTriangle className={`w-5 h-5 mt-0.5 mr-3 ${
                          rec.severity === 'high' ? 'text-red-500' :
                          rec.severity === 'medium' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{rec.message}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rec.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Filters and Export Controls */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-wrap gap-4 items-center flex-1">
                  <div>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="under_review">Under Review</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={filters.priority}
                      onChange={(e) => setFilters({...filters, priority: e.target.value})}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">All Priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-64">
                    <input
                      type="text"
                      placeholder="Search reports..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                  <button
                    onClick={loadReports}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </button>
                </div>
                
                {/* Export Controls */}
                <div className="flex gap-2 items-center">
                  <button
                    onClick={exportAllReports}
                    disabled={loading}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center text-sm transition-colors"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export All
                  </button>
                </div>
              </div>
            </div>

            {/* Reports List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading reports...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No reports found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Report
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Order Ref
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {reports.map((report) => (
                        <tr key={report._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">#{report.reportId}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{report.phoneNumber}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{report.userId?.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{report.userId?.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {report.purchaseId?.geonetReference || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{report.reportReason}</div>
                            {report.customReason && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{report.customReason}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.status)}`}>
                              {report.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(report.priority)}`}>
                              {report.priority.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(report.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleManageReport(report)}
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
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reports
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 bg-blue-600 text-white rounded">
                      {currentPage}
                    </span>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= pagination.pages}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab - Only for Admins */}
        {activeTab === 'settings' && userData.role === 'admin' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-6 flex items-center text-gray-900 dark:text-white">
              <Settings className="w-5 h-5 mr-2" />
              Report System Settings
            </h2>

            <div className="space-y-6">
              {/* Basic Settings */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.isReportingEnabled}
                    onChange={(e) => setSettings({...settings, isReportingEnabled: e.target.checked})}
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
                  onChange={(e) => setSettings({...settings, reportTimeLimit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    onChange={(e) => setSettings({...settings, reportTimeLimitHours: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    onChange={(e) => setSettings({...settings, allowedReportDays: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* User Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Reports Per User
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.maxReportsPerUser}
                    onChange={(e) => setSettings({...settings, maxReportsPerUser: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    onChange={(e) => setSettings({...settings, maxReportsPerUserPerDay: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  onChange={(e) => setSettings({...settings, autoResolveAfterDays: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                          setSettings({...settings, allowedReportReasons: newReasons});
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => {
                          const newReasons = settings.allowedReportReasons.filter((_, i) => i !== index);
                          setSettings({...settings, allowedReportReasons: newReasons});
                        }}
                        className="px-3 py-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setSettings({
                        ...settings, 
                        allowedReportReasons: [...settings.allowedReportReasons, 'New Reason']
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
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors"
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
        {activeTab === 'settings' && userData.role !== 'admin' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Admin Access Required</h3>
            <p className="text-gray-600 dark:text-gray-400">Only administrators can access system settings.</p>
          </div>
        )}
      </div>

      {/* Report Management Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Report #{selectedReport.reportId}</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Report Details */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6 border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Report Details</h4>
                  <button
                    onClick={() => {
                      const orderRef = selectedReport.purchaseId?.geonetReference || 'N/A';
                      const phoneNumber = selectedReport.phoneNumber || 'N/A';
                      const dataAmount = selectedReport.purchaseId?.capacity ? `${selectedReport.purchaseId.capacity}GB` : 'N/A';
                      const orderDate = selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleDateString() : 'N/A';
                      
                      const textToCopy = `Order: ${orderRef}\nPhone: ${phoneNumber}\nData: ${dataAmount}\nDate: ${orderDate}`;
                      
                      navigator.clipboard.writeText(textToCopy).then(() => {
                        showMessage('Order details copied to clipboard', 'success');
                      }).catch(() => {
                        showMessage('Failed to copy order details', 'error');
                      });
                    }}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center text-sm transition-colors"
                    title="Copy order details"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Order Info
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong className="text-gray-900 dark:text-white">User:</strong> <span className="text-gray-600 dark:text-gray-300">{selectedReport.userId?.name}</span></div>
                  <div><strong className="text-gray-900 dark:text-white">Email:</strong> <span className="text-gray-600 dark:text-gray-300">{selectedReport.userId?.email}</span></div>
                  <div><strong className="text-gray-900 dark:text-white">Phone:</strong> <span className="text-gray-600 dark:text-gray-300">{selectedReport.phoneNumber}</span></div>
                  <div><strong className="text-gray-900 dark:text-white">Order Reference:</strong> <span className="text-gray-600 dark:text-gray-300">{selectedReport.purchaseId?.geonetReference || 'N/A'}</span></div>
                  <div><strong className="text-gray-900 dark:text-white">Network:</strong> <span className="text-gray-600 dark:text-gray-300">{selectedReport.purchaseId?.network}</span></div>
                  <div><strong className="text-gray-900 dark:text-white">Capacity:</strong> <span className="text-gray-600 dark:text-gray-300">{selectedReport.purchaseId?.capacity}GB</span></div>
                  <div><strong className="text-gray-900 dark:text-white">Price:</strong> <span className="text-gray-600 dark:text-gray-300">GHS {selectedReport.purchaseId?.price}</span></div>
                  <div><strong className="text-gray-900 dark:text-white">Reason:</strong> <span className="text-gray-600 dark:text-gray-300">{selectedReport.reportReason}</span></div>
                  <div><strong className="text-gray-900 dark:text-white">Created:</strong> <span className="text-gray-600 dark:text-gray-300">{formatDate(selectedReport.createdAt)}</span></div>
                </div>
                {selectedReport.description && (
                  <div className="mt-3">
                    <strong className="text-gray-900 dark:text-white">Description:</strong>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">{selectedReport.description}</p>
                  </div>
                )}
                {selectedReport.customReason && (
                  <div className="mt-3">
                    <strong className="text-gray-900 dark:text-white">Custom Reason:</strong>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">{selectedReport.customReason}</p>
                  </div>
                )}
              </div>

              {/* Admin Notes History */}
              {selectedReport.adminNotes && selectedReport.adminNotes.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Admin Notes History</h4>
                  <div className="space-y-2">
                    {selectedReport.adminNotes.map((note, index) => (
                      <div key={index} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-gray-800 dark:text-gray-200">{note.note}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          By {note.addedBy?.name} on {formatDate(note.addedAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Update Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={reportUpdate.status}
                      onChange={(e) => setReportUpdate({...reportUpdate, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Keep current</option>
                      <option value="pending">Pending</option>
                      <option value="under_review">Under Review</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={reportUpdate.priority}
                      onChange={(e) => setReportUpdate({...reportUpdate, priority: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Keep current</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Admin Note
                  </label>
                  <textarea
                    value={reportUpdate.adminNote}
                    onChange={(e) => setReportUpdate({...reportUpdate, adminNote: e.target.value})}
                    placeholder="Add a note about this report..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                {/* Resolution Section */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Resolution (Optional)</h4>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Resolution Type
                      </label>
                      <select
                        value={reportUpdate.resolutionType}
                        onChange={(e) => setReportUpdate({...reportUpdate, resolutionType: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select type</option>
                        <option value="refund">Refund</option>
                        <option value="resend">Resend Data</option>
                        <option value="compensation">Compensation</option>
                        <option value="no_action">No Action</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount (GHS)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={reportUpdate.amount}
                        onChange={(e) => setReportUpdate({...reportUpdate, amount: e.target.value})}
                        placeholder="0.00"
                        disabled={reportUpdate.resolutionType !== 'refund' && reportUpdate.resolutionType !== 'compensation'}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Resolution Description
                    </label>
                    <textarea
                      value={reportUpdate.description}
                      onChange={(e) => setReportUpdate({...reportUpdate, description: e.target.value})}
                      placeholder="Describe the resolution..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={updateReportStatus}
                    disabled={loading || (!reportUpdate.status && !reportUpdate.priority && !reportUpdate.adminNote)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Update Report
                  </button>
                  
                  {reportUpdate.resolutionType && (
                    <button
                      onClick={resolveReport}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center transition-colors"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Resolve Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportDashboard;