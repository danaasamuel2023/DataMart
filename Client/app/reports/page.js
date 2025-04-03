// pages/reports.js
'use client'
import { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';
import { useTheme } from 'next-themes';

export default function UserReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const { theme, setTheme } = useTheme();
  
  // Get userId from localStorage
  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsedUserData = JSON.parse(userData);
      setUserId(parsedUserData.id);
    }
  }, []);

  // Fetch reports when userId is available
  useEffect(() => {
    const fetchReports = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const response = await axios.get(`https://datamartbackened.onrender.com/api/reports/my-reports/${userId}`);
        
        if (response.data.status === 'success') {
          setReports(response.data.data.reports);
        } else {
          throw new Error(response.data.message || 'Failed to fetch reports');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching reports');
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchReports();
    }
  }, [userId]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Status Badge Component
  const ReportStatusBadge = ({ status }) => {
    // Define styles for different statuses
    const getStatusStyles = () => {
      switch (status) {
        case 'pending':
          return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
        case 'investigating':
          return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
        case 'resolved':
          return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
        case 'rejected':
          return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
        default:
          return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      }
    };

    // Define human-readable status labels
    const getStatusLabel = () => {
      switch (status) {
        case 'pending':
          return 'Pending';
        case 'investigating':
          return 'Investigating';
        case 'resolved':
          return 'Resolved';
        case 'rejected':
          return 'Rejected';
        default:
          return 'Unknown';
      }
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()}`}>
        {getStatusLabel()}
      </span>
    );
  };

  const getNetworkColor = (network) => {
    const networkColors = {
      'MTN': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      'Airtel': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      'Glo': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      '9mobile': 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200',
    };
    
    return networkColors[network] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getPurchaseStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format date and time helper
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Head>
        <title>My Reports | Data Service</title>
      </Head>
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Reports</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Track the status of your reported issues with data purchases
            </p>
          </div>
          <button 
            onClick={toggleTheme}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-indigo-600 dark:border-indigo-400 rounded-full animate-spin absolute top-0 left-0 border-t-transparent border-b-transparent"></div>
            </div>
            <p className="mt-6 text-base font-medium text-gray-700 dark:text-gray-300">Loading your reports...</p>
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 my-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 shadow sm:rounded-lg mt-6">
            <svg 
              className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No reports found</h3>
            <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
              You haven't submitted any reports yet.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            {/* Report List */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg transition-colors duration-200">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {reports.map((report) => (
                  <li key={report._id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-150">
                    <div className="px-6 py-5 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {report.purchaseId ? report.purchaseId.phoneNumber : 'Unknown Number'}
                          </p>
                          {report.purchaseId && report.purchaseId.network && (
                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getNetworkColor(report.purchaseId.network)}`}>
                              {report.purchaseId.network}
                            </span>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <ReportStatusBadge status={report.status} />
                        </div>
                      </div>
                      <div className="mt-3 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                            {report.reason.slice(0, 50)}{report.reason.length > 50 ? '...' : ''}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <p>
                            <time dateTime={report.createdAt}>
                              {formatDate(report.createdAt)}
                            </time>
                            {report.daysSinceOrder && (
                              <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                                (Order: {report.daysSinceOrder} days ago)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* Report Details - expanded right in the list */}
                      <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {report.purchaseId && (
                            <div className="bg-gray-50 dark:bg-gray-850 p-4 rounded-lg">
                              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purchase Details</h4>
                              <div className="mt-3 space-y-2 text-sm text-gray-800 dark:text-gray-200">
                                <p><span className="font-medium">Data Plan:</span> {report.purchaseId.capacity}</p>
                                <p><span className="font-medium">Price:</span> ₦{report.purchaseId.price.toLocaleString()}</p>
                                <p><span className="font-medium">Purchase Date:</span> {formatDateTime(report.purchaseId.createdAt)}</p>
                                <p className="flex items-center">
                                  <span className="font-medium">Purchase Status:</span> 
                                  <span className={`ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getPurchaseStatusColor(report.purchaseId.status)}`}>
                                    {report.purchaseId.status.charAt(0).toUpperCase() + report.purchaseId.status.slice(1)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="bg-gray-50 dark:bg-gray-850 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Report Status</h4>
                            <div className="mt-3 space-y-2 text-sm text-gray-800 dark:text-gray-200">
                              <p><span className="font-medium">Status:</span> {report.status.charAt(0).toUpperCase() + report.status.slice(1)}</p>
                              {report.adminNotes && (
                                <p><span className="font-medium">Admin Notes:</span> {report.adminNotes}</p>
                              )}
                              {report.resolution && (
                                <p><span className="font-medium">Resolution:</span> {report.resolution.charAt(0).toUpperCase() + report.resolution.slice(1)}</p>
                              )}
                              <p><span className="font-medium">Last Updated:</span> {formatDateTime(report.updatedAt)}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Full Report Reason */}
                        <div className="mt-5 bg-gray-50 dark:bg-gray-850 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason for Report</h4>
                          <p className="mt-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{report.reason}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}