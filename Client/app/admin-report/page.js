// pages/admin/reports.js
'use client'
import { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [processingMap, setProcessingMap] = useState({});
  const [successMessageMap, setSuccessMessageMap] = useState({});
  
  // Keep track of reports being edited with form values
  const [editingReport, setEditingReport] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolution, setResolution] = useState('');
  
  // Get admin data from localStorage
  useEffect(() => {
    const storedData = localStorage.getItem('userData');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.role !== 'admin') {
        // Redirect if not admin
        window.location.href = '/dashboard';
        return;
      }
      setUserData(parsedData);
    } else {
      // Redirect to login if not authenticated
      window.location.href = '/login';
    }
  }, []);

  // Fetch reports based on filters
  useEffect(() => {
    const fetchReports = async () => {
      if (!userData || userData.role !== 'admin') return;
      
      try {
        setLoading(true);
        
        // Construct query params
        const params = new URLSearchParams();
        params.append('adminId', userData.id);
        params.append('page', page);
        params.append('limit', 10);
        
        if (filter !== 'all') {
          params.append('status', filter);
        }
        
        if (dateRange.startDate) {
          params.append('startDate', dateRange.startDate);
        }
        
        if (dateRange.endDate) {
          params.append('endDate', dateRange.endDate);
        }
        
        const response = await axios.get(`https://datamartbackened.onrender.com/api/reports/admin/all?${params.toString()}`);
        
        if (response.data.status === 'success') {
          setReports(response.data.data.reports);
          setTotalPages(response.data.data.pagination.totalPages);
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

    fetchReports();
  }, [userData, filter, page, dateRange]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!userData || userData.role !== 'admin') return;
      
      try {
        const response = await axios.get(`https://datamartbackened.onrender.com/api/reports/admin/stats?adminId=${userData.id}`);
        
        if (response.data.status === 'success') {
          setStats(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, [userData]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
  };

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  const applyDateFilter = () => {
    setPage(1); // Reset to first page when date filter is applied
  };

  const clearFilters = () => {
    setFilter('all');
    setDateRange({ startDate: '', endDate: '' });
    setPage(1);
  };

  // Start editing a report
  const handleStartEdit = (report) => {
    setEditingReport(report._id);
    setUpdateStatus(report.status);
    setAdminNotes(report.adminNotes || '');
    setResolution(report.resolution || '');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingReport(null);
    setUpdateStatus('');
    setAdminNotes('');
    setResolution('');
  };

  // Update report
  const handleUpdateReport = async (reportId) => {
    if (!userData || userData.role !== 'admin') return;
    
    try {
      // Set this report as processing
      setProcessingMap(prev => ({ ...prev, [reportId]: true }));
      
      const response = await axios.put(`https://datamartbackened.onrender.com/api/reports/admin/update/${reportId}`, {
        adminId: userData.id,
        status: updateStatus,
        adminNotes: adminNotes,
        resolution: resolution !== '' ? resolution : null
      });
      
      if (response.data.status === 'success') {
        // Update the report in the list
        setReports(prevReports => 
          prevReports.map(report => 
            report._id === reportId ? response.data.data.report : report
          )
        );
        
        // Show success message
        setSuccessMessageMap(prev => ({ ...prev, [reportId]: 'Report updated successfully' }));
        
        // Reset editing state
        setEditingReport(null);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessageMap(prev => {
            const newMap = { ...prev };
            delete newMap[reportId];
            return newMap;
          });
        }, 3000);
      } else {
        throw new Error(response.data.message || 'Failed to update report');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while updating report');
      console.error('Error updating report:', err);
    } finally {
      // Remove processing state
      setProcessingMap(prev => {
        const newMap = { ...prev };
        delete newMap[reportId];
        return newMap;
      });
    }
  };

  // Process refund
  const handleProcessRefund = async (reportId) => {
    if (!userData || userData.role !== 'admin') return;
    
    try {
      // Set this report as processing
      setProcessingMap(prev => ({ ...prev, [reportId]: true }));
      
      const response = await axios.post(`https://datamartbackened.onrender.com/api/reports/admin/process-refund/${reportId}`, {
        adminId: userData.id
      });
      
      if (response.data.status === 'success') {
        // Reload report data
        const reportResponse = await axios.get(`https://datamartbackened.onrender.com/api/reports/details/${reportId}?adminId=${userData.id}`);
        
        if (reportResponse.data.status === 'success') {
          // Update the report in the list
          setReports(prevReports => 
            prevReports.map(report => 
              report._id === reportId ? reportResponse.data.data.report : report
            )
          );
          
          // Show success message
          setSuccessMessageMap(prev => ({ ...prev, [reportId]: 'Refund processed successfully' }));
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSuccessMessageMap(prev => {
              const newMap = { ...prev };
              delete newMap[reportId];
              return newMap;
            });
          }, 3000);
        }
      } else {
        throw new Error(response.data.message || 'Failed to process refund');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while processing refund');
      console.error('Error processing refund:', err);
    } finally {
      // Remove processing state
      setProcessingMap(prev => {
        const newMap = { ...prev };
        delete newMap[reportId];
        return newMap;
      });
    }
  };

  // Check if refund can be processed
  const canProcessRefund = (report) => {
    return report && 
           report.status === 'resolved' && 
           report.resolution === 'refund' &&
           report.purchaseId && 
           report.purchaseId.status !== 'refunded';
  };

  // Status Badge Component inline
  const ReportStatusBadge = ({ status }) => {
    // Define styles for different statuses
    const getStatusStyles = () => {
      switch (status) {
        case 'pending':
          return 'bg-yellow-100 text-yellow-800';
        case 'investigating':
          return 'bg-blue-100 text-blue-800';
        case 'resolved':
          return 'bg-green-100 text-green-800';
        case 'rejected':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
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
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()}`}>
        {getStatusLabel()}
      </span>
    );
  };

  const getNetworkColor = (network) => {
    const networkColors = {
      'MTN': 'bg-yellow-100 text-yellow-800',
      'Airtel': 'bg-red-100 text-red-800',
      'Glo': 'bg-green-100 text-green-800',
      '9mobile': 'bg-teal-100 text-teal-800',
      // Add more networks as needed
    };
    
    return networkColors[network] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Admin Reports | Data Service</title>
      </Head>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Dashboard Header */}
        <div className="px-4 sm:px-0 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Admin Reports Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and respond to customer reports
          </p>
        </div>
        
        {/* Stats Overview */}
        {stats && (
          <div className="mb-6">
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Reports</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalReports}</dd>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Reports</dt>
                  <dd className="mt-1 text-3xl font-semibold text-yellow-600">{stats.statusStats.pending || 0}</dd>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Last 24 Hours</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.recentActivity.last24Hours}</dd>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Resolved Reports</dt>
                  <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.statusStats.resolved || 0}</dd>
                </div>
              </div>
            </dl>
          </div>
        )}
        
        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div className="flex space-x-4">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Reports
              </button>
              <button
                onClick={() => handleFilterChange('pending')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => handleFilterChange('investigating')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'investigating' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Investigating
              </button>
              <button
                onClick={() => handleFilterChange('resolved')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'resolved' ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Resolved
              </button>
              <button
                onClick={() => handleFilterChange('rejected')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'rejected' ? 'bg-red-100 text-red-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                name="startDate"
                id="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                name="endDate"
                id="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={applyDateFilter}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Apply Filter
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="mt-4 text-sm text-gray-700">Loading reports...</p>
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 my-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No reports match your current filter criteria
            </p>
          </div>
        ) : (
          <div className="mt-6">
            {/* Reports List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <li key={report._id}>
                    <div className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        {/* Report Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              Report #{report._id ? report._id.substring(report._id.length - 6).toUpperCase() : 'Unknown'}
                            </p>
                            {report.purchaseId?.phoneNumber && (
                              <p className="ml-2 text-sm text-gray-500">{report.purchaseId.phoneNumber}</p>
                            )}
                            {report.purchaseId?.network && (
                              <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getNetworkColor(report.purchaseId.network)}`}>
                                {report.purchaseId.network}
                              </span>
                            )}
                          </div>
                          <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                            <ReportStatusBadge status={report.status} />
                            {editingReport !== report._id && (
                              <button
                                onClick={() => handleStartEdit(report)}
                                className="ml-2 px-3 py-1 text-xs font-medium rounded border border-indigo-500 text-indigo-500 hover:bg-indigo-50"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Report Metadata */}
                                                  <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              <span className="truncate">{report.reason ? `${report.reason.slice(0, 50)}${report.reason.length > 50 ? '...' : ''}` : 'No reason provided'}</span>
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            <p>
                              <time dateTime={report.createdAt}>
                                {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Unknown date'}
                              </time>
                              {report.daysSinceOrder && (
                                <span className="ml-1 text-xs text-gray-400">
                                  (Order: {report.daysSinceOrder} days ago)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        {/* Success Message */}
                        {successMessageMap[report._id] && (
                          <div className="mt-4 rounded-md bg-green-50 p-2">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-green-800">{successMessageMap[report._id]}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Report Details - expanded right in the list */}
                        <div className={`mt-4 border-t border-gray-200 pt-4 ${editingReport === report._id ? 'pb-4' : ''}`}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Customer Information */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">Customer Information</h4>
                              {report.userId ? (
                                <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                                  <p className="text-sm"><span className="font-medium">Name:</span> {report.userId.name}</p>
                                  <p className="text-sm"><span className="font-medium">Email:</span> {report.userId.email}</p>
                                  {report.userId.phoneNumber && (
                                    <p className="text-sm"><span className="font-medium">Phone:</span> {report.userId.phoneNumber}</p>
                                  )}
                                </div>
                              ) : (
                                <p className="mt-2 text-sm text-gray-500 italic">Customer information unavailable</p>
                              )}
                            </div>
                            
                            {/* Purchase Information */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">Purchase Information</h4>
                              {report.purchaseId ? (
                                <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                                  <p className="text-sm"><span className="font-medium">Data Plan:</span> {report.purchaseId.capacity || 'N/A'}</p>
                                  <p className="text-sm"><span className="font-medium">Price:</span> {report.purchaseId.price ? `₦${report.purchaseId.price.toLocaleString()}` : 'N/A'}</p>
                                  <p className="text-sm"><span className="font-medium">Purchase Date:</span> {report.purchaseId.createdAt ? new Date(report.purchaseId.createdAt).toLocaleString() : 'N/A'}</p>
                                  <p className="text-sm">
                                    <span className="font-medium">Status:</span> 
                                    <span className={`ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      report.purchaseId.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                      report.purchaseId.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                      report.purchaseId.status === 'failed' ? 'bg-red-100 text-red-800' : 
                                      report.purchaseId.status === 'refunded' ? 'bg-purple-100 text-purple-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {report.purchaseId.status ? report.purchaseId.status.charAt(0).toUpperCase() + report.purchaseId.status.slice(1) : 'Unknown'}
                                    </span>
                                  </p>
                                  {report.purchaseId.geonetReference && (
                                    <p className="text-sm"><span className="font-medium">Reference:</span> {report.purchaseId.geonetReference}</p>
                                  )}
                                </div>
                              ) : (
                                <p className="mt-2 text-sm text-gray-500 italic">Purchase information unavailable</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Full Report Reason */}
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-500">Reason for Report</h4>
                            <p className="mt-2 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{report.reason || 'No reason provided'}</p>
                          </div>
                          
                          {/* Admin Notes (if any) */}
                          {report.adminNotes && editingReport !== report._id && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-500">Admin Notes</h4>
                              <p className="mt-2 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{report.adminNotes}</p>
                            </div>
                          )}
                          
                          {/* Edit Form */}
                          {editingReport === report._id && (
                            <div className="mt-4 border-t border-gray-200 pt-4">
                              <h4 className="text-sm font-medium text-gray-500 mb-3">Update Report</h4>
                              
                              <div className="space-y-4">
                                <div>
                                  <label htmlFor={`status-${report._id}`} className="block text-sm font-medium text-gray-700">Status</label>
                                  <select
                                    id={`status-${report._id}`}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    value={updateStatus}
                                    onChange={(e) => setUpdateStatus(e.target.value)}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="investigating">Investigating</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                </div>
                                
                                {updateStatus === 'resolved' && (
                                  <div>
                                    <label htmlFor={`resolution-${report._id}`} className="block text-sm font-medium text-gray-700">Resolution</label>
                                    <select
                                      id={`resolution-${report._id}`}
                                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                      value={resolution}
                                      onChange={(e) => setResolution(e.target.value)}
                                    >
                                      <option value="">-- Select Resolution --</option>
                                      <option value="refund">Refund</option>
                                      <option value="resend">Resend Data</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>
                                )}
                                
                                <div>
                                  <label htmlFor={`adminNotes-${report._id}`} className="block text-sm font-medium text-gray-700">Admin Notes</label>
                                  <textarea
                                    id={`adminNotes-${report._id}`}
                                    rows={3}
                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                    placeholder="Add internal notes about this report"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                  ></textarea>
                                </div>
                                
                                <div className="flex justify-end space-x-3">
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                  >
                                    Cancel
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReport(report._id)}
                                    disabled={processingMap[report._id]}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                  >
                                    {processingMap[report._id] ? 'Updating...' : 'Update Report'}
                                  </button>
                                  
                                  {canProcessRefund(report) && (
                                    <button
                                      type="button"
                                      onClick={() => handleProcessRefund(report._id)}
                                      disabled={processingMap[report._id]}
                                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                      {processingMap[report._id] ? 'Processing...' : 'Process Refund'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 ${
                    page === 1 ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 ${
                    page === totalPages ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{reports.length > 0 ? (page - 1) * 10 + 1 : 0}</span> to{' '}
                    <span className="font-medium">{Math.min(page * 10, (page - 1) * 10 + reports.length)}</span> of{' '}
                    <span className="font-medium">{totalPages * 10}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${
                        page === 1 ? 'cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show up to 5 page numbers centered around current page
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pageNum
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${
                        page === totalPages ? 'cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}