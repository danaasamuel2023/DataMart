'use client'
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Phone, FileText, RefreshCw, Search, Eye, Moon, Sun, Settings, User, Bell } from 'lucide-react';

const UserReportSystem = () => {
  const [activeTab, setActiveTab] = useState('report');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  
  // Report form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [description, setDescription] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);
  const [canReport, setCanReport] = useState(false);
  
  // Reports list state
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  
  // Settings state
  const [reportSettings, setReportSettings] = useState(null);

  const API_BASE = 'https://datamartbackened.onrender.com/api/v1/reports';

  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    
    // Get user data from localStorage
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
    
    // Load report settings
    loadReportSettings();
  }, []);

  useEffect(() => {
    if (userData && activeTab === 'my-reports') {
      loadUserReports();
    }
  }, [userData, activeTab, currentPage, statusFilter]);

  useEffect(() => {
    // Apply dark mode to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Debug function to check userData structure
  useEffect(() => {
    if (userData) {
      console.log('Current userData structure:', {
        id: userData.id,
        _id: userData._id,
        userId: userData.userId,
        name: userData.name,
        allKeys: Object.keys(userData)
      });
    }
  }, [userData]);

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const loadReportSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/public`);
      const data = await response.json();
      
      if (data.success) {
        setReportSettings(data.data);
      } else {
        console.error('Failed to load settings:', data.message);
        // Fallback settings
        setReportSettings({
          isReportingEnabled: true,
          reportTimeLimit: 'same_day',
          reportTimeLimitHours: 24,
          allowedReportDays: 7,
          maxReportsPerUserPerDay: 5,
          allowedReportReasons: ['Data not received', 'Wrong amount credited', 'Network error', 'Slow delivery', 'Double charging', 'Other']
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Fallback settings in case of network error
      setReportSettings({
        isReportingEnabled: true,
        reportTimeLimit: 'same_day',
        reportTimeLimitHours: 24,
        allowedReportDays: 7,
        maxReportsPerUserPerDay: 5,
        allowedReportReasons: ['Data not received', 'Wrong amount credited', 'Network error', 'Slow delivery', 'Double charging', 'Other']
      });
    }
  };

  const checkOrderEligibility = async () => {
    if (!phoneNumber || !userData) {
      showMessage('Please enter a phone number', 'error');
      return;
    }

    if (!phoneNumber.match(/^[0-9]{10}$/)) {
      showMessage('Please enter a valid 10-digit phone number', 'error');
      return;
    }

    // Enhanced user ID validation for check order as well
    const userId = userData.id || userData._id || userData.userId;
    if (!userId) {
      console.error('User data structure:', userData);
      showMessage('User authentication error. Please log in again.', 'error');
      return;
    }

    setLoading(true);
    setOrderDetails(null);
    setCanReport(false);

    try {
      console.log('Checking order eligibility with userId:', userId);
      
      const response = await fetch(`${API_BASE}/check`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          userId: userId
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.canReport && data.purchase) {
          setCanReport(true);
          setOrderDetails(data.purchase);
          showMessage('Order found and eligible for reporting!', 'success');
        } else {
          setCanReport(false);
          setOrderDetails(null);
          if (data.existingReport) {
            showMessage(`This order has already been reported. Report ID: ${data.existingReport.reportId}`, 'error');
          } else {
            showMessage(data.message || 'This order cannot be reported at this time', 'error');
          }
        }
      } else {
        setCanReport(false);
        setOrderDetails(null);
        
        console.error('Order check failed:', {
          status: response.status,
          data: data,
          userId: userId
        });
        
        if (response.status === 404) {
          showMessage('No order found for this phone number. Please check the number and try again.', 'error');
        } else if (response.status === 403) {
          showMessage(data.message || 'Reporting is not allowed for this order', 'error');
        } else if (response.status === 429) {
          showMessage(data.message || 'You have reached your daily reporting limit', 'error');
        } else if (response.status === 400) {
          showMessage(data.message || 'Invalid request. Please check your input.', 'error');
        } else {
          showMessage(data.message || 'Unable to check order eligibility. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Error checking order:', error);
      setCanReport(false);
      setOrderDetails(null);
      showMessage('Network error. Please check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async () => {
    if (!reportReason || !userData || !phoneNumber) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    // Enhanced user ID validation - check multiple possible field names
    const userId = userData.id || userData._id || userData.userId;
    if (!userId) {
      console.error('User data structure:', userData);
      showMessage('User authentication error. Please log in again.', 'error');
      return;
    }

    if (reportReason === 'Other' && !customReason) {
      showMessage('Please specify the custom reason', 'error');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Submitting report with userId:', userId);
      
      const response = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Add Authorization header if you're using JWT tokens
          // 'Authorization': `Bearer ${userData.token || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          reportReason: reportReason,
          customReason: reportReason === 'Other' ? customReason : null,
          description: description,
          userId: userId
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        showMessage(`Report submitted successfully! Report ID: ${data.data.reportId}`, 'success');
        
        // Reset form
        setPhoneNumber('');
        setReportReason('');
        setCustomReason('');
        setDescription('');
        setOrderDetails(null);
        setCanReport(false);
        
        // Switch to reports tab to show the new report
        setActiveTab('my-reports');
      } else {
        console.error('Report submission failed:', {
          status: response.status,
          data: data,
          userId: userId
        });
        
        if (response.status === 409) {
          showMessage('This order has already been reported', 'error');
        } else if (response.status === 403) {
          showMessage(data.message || 'Reporting is not allowed for this order', 'error');
        } else if (response.status === 429) {
          showMessage(data.message || 'You have reached your reporting limit', 'error');
        } else if (response.status === 500) {
          console.error('Server error details:', data);
          showMessage('Server error occurred. Please try again later or contact support.', 'error');
        } else if (response.status === 400) {
          showMessage(data.message || 'Invalid request. Please check your input.', 'error');
        } else {
          showMessage(data.message || 'Failed to submit report. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      showMessage('Network error. Please check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserReports = async () => {
    if (!userData) return;

    // Enhanced user ID validation for loading reports
    const userId = userData.id || userData._id || userData.userId;
    if (!userId) {
      console.error('User data structure:', userData);
      showMessage('User authentication error. Please log in again.', 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('Loading reports for userId:', userId);
      
      const response = await fetch(`${API_BASE}/my-reports`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          page: currentPage,
          limit: 10,
          status: statusFilter || undefined
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setReports(data.data.reports);
        setPagination(data.data.pagination);
      } else {
        console.error('Failed to load reports:', {
          status: response.status,
          data: data,
          userId: userId
        });
        showMessage(data.message || 'Failed to load reports', 'error');
        setReports([]);
        setPagination({});
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      showMessage('Network error. Please check your connection and try again.', 'error');
      setReports([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
      under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      investigating: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      auto_resolved: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Required</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Please log in to access the report system.</p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200">
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report Center</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manage your service reports</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Navigation Tabs */}
              <div className="hidden sm:flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('report')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                    activeTab === 'report'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Submit Report
                </button>
                <button
                  onClick={() => setActiveTab('my-reports')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                    activeTab === 'my-reports'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  My Reports
                </button>
              </div>

              {/* Dark Mode Toggle */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                  title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Welcome, {userData.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="sm:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors duration-200 ${
              activeTab === 'report'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Submit Report
          </button>
          <button
            onClick={() => setActiveTab('my-reports')}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors duration-200 ${
              activeTab === 'my-reports'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            My Reports
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 ${
            messageType === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' :
            messageType === 'error' 
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' :
              'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          }`}>
            <div className="flex items-center">
              {messageType === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
              {messageType === 'error' && <AlertCircle className="w-5 h-5 mr-2" />}
              {messageType === 'info' && <Bell className="w-5 h-5 mr-2" />}
              {message}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'report' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                Submit New Report
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Report issues with your mobile data purchases</p>
            </div>

            <div className="p-6">
              {/* Report Settings Info */}
              {reportSettings && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 p-6 rounded-xl mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Reporting Guidelines
                  </h3>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${reportSettings.isReportingEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>Reporting is {reportSettings.isReportingEnabled ? 'enabled' : 'disabled'}</span>
                    </div>
                    {reportSettings.reportTimeLimit === 'same_day' && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-3" />
                        <span>Report within {reportSettings.reportTimeLimitHours} hours of purchase</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-3" />
                      <span>Daily limit: {reportSettings.maxReportsPerUserPerDay} reports per day</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Phone Number Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Phone Number
                  </label>
                  <div className="flex space-x-3">
                    <div className="flex-1 relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                          if (value.length <= 10) {
                            setPhoneNumber(value);
                          }
                        }}
                        placeholder="Enter phone number (e.g., 0241234567)"
                        maxLength="10"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                    <button
                      onClick={checkOrderEligibility}
                      disabled={loading || !phoneNumber}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg disabled:shadow-none"
                    >
                      {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Search className="w-5 h-5" />
                      )}
                      <span className="hidden sm:inline">Check Order</span>
                    </button>
                  </div>
                </div>

                {/* Order Details - Compact Dialog */}
                {orderDetails && (
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Order Found & Eligible
                      </h3>
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded-full">
                        {orderDetails.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">Network:</span>
                        <p className="text-gray-900 dark:text-white">{orderDetails.network}</p>
                      </div>
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">Data:</span>
                        <p className="text-gray-900 dark:text-white">{orderDetails.capacity}GB</p>
                      </div>
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">Amount:</span>
                        <p className="text-gray-900 dark:text-white">GHS {orderDetails.price}</p>
                      </div>
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">Phone:</span>
                        <p className="text-gray-900 dark:text-white">{phoneNumber}</p>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
                      <span className="font-medium">Purchase Date:</span> {formatDate(orderDetails.createdAt)}
                    </div>

                    {orderDetails.geonetReference && (
                      <div className="mt-2 text-xs">
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">Reference:</span>
                        <span className="text-emerald-900 dark:text-emerald-100 font-mono ml-1">{orderDetails.geonetReference}</span>
                      </div>
                    )}

                    <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-orange-800 dark:text-orange-200">
                        ⚠️ Only report if you genuinely didn't receive the data. False reports may result in account restrictions.
                      </p>
                    </div>
                  </div>
                )}

                {/* Report Form */}
                {canReport && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Report Reason *
                      </label>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="">Select a reason</option>
                        {reportSettings && reportSettings.allowedReportReasons && reportSettings.allowedReportReasons.map((reason) => (
                          <option key={reason} value={reason}>{reason}</option>
                        ))}
                      </select>
                    </div>

                    {reportReason === 'Other' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Custom Reason *
                        </label>
                        <input
                          type="text"
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          placeholder="Please specify the issue"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Description (Optional)
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Provide additional details about the issue..."
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      />
                    </div>

                    <button
                      onClick={submitReport}
                      disabled={loading || !reportReason}
                      className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg disabled:shadow-none"
                    >
                      {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                      <span>Submit Report</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'my-reports' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                      <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    My Reports
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Track your submitted reports</p>
                </div>
                <div className="flex space-x-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    onClick={loadUserReports}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading reports...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reports found</h3>
                  <p className="text-gray-600 dark:text-gray-400">You haven't submitted any reports yet.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report._id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200 bg-gray-50 dark:bg-gray-700/30">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Report #{report.reportId}</h3>
                            <p className="text-gray-600 dark:text-gray-400 flex items-center mt-1">
                              <Phone className="w-4 h-4 mr-2" />
                              {report.phoneNumber}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
                            {report.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                          {[
                            { label: 'Reason', value: report.reportReason },
                            { label: 'Network', value: report.purchaseId?.network },
                            { label: 'Capacity', value: `${report.purchaseId?.capacity}GB` },
                            { label: 'Submitted', value: formatDate(report.createdAt) }
                          ].map((item, index) => (
                            <div key={index}>
                              <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}:</span>
                              <span className="text-gray-600 dark:text-gray-400 ml-2">{item.value}</span>
                            </div>
                          ))}
                        </div>
                        
                        {report.description && (
                          <div className="text-sm mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{report.description}</p>
                          </div>
                        )}
                        
                        {report.resolution && (
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-lg">
                            <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2 flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Resolution
                            </h4>
                            <div className="space-y-1 text-sm">
                              <p className="text-emerald-800 dark:text-emerald-200">
                                <span className="font-medium">Type:</span> {report.resolution.type}
                              </p>
                              {report.resolution.amount && (
                                <p className="text-emerald-800 dark:text-emerald-200">
                                  <span className="font-medium">Amount:</span> GHS {report.resolution.amount}
                                </p>
                              )}
                              {report.resolution.description && (
                                <p className="text-emerald-800 dark:text-emerald-200 mt-2">{report.resolution.description}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reports
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage <= 1}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                        >
                          Previous
                        </button>
                        <span className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
                          {currentPage}
                        </span>
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage >= pagination.pages}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserReportSystem;