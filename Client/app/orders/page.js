'use client'
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight, ChevronDown, Calendar, Phone, Database, CreditCard, Clock, Tag, AlertTriangle, Search, Filter, X, AlertCircle, FileText } from 'lucide-react';

// API constants
const GEONETTECH_BASE_URL = 'https://connect.geonettech.com/api/v1';
const API_KEY = '21|rkrw7bcoGYjK8irAOTMaZ8sc1LRHYcwjuZnZmMNw4a6196f1';
const API_BASE_URL = 'https://datamartbackened.onrender.com/api/v1';

// Format currency as GHS
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2
  }).format(amount);
};

// Network display names mapping
const networkNames = {
  'YELLO': 'MTN',
  'TELECEL': 'Telecel',
  'AT_PREMIUM': 'AirtelTigo Premium',
  'airteltigo': 'AirtelTigo',
  'at': 'AirtelTigo Standard'
};

// Network logo colors
const networkColors = {
  'YELLO': 'bg-yellow-500',
  'TELECEL': 'bg-red-500',
  'AT_PREMIUM': 'bg-blue-500',
  'airteltigo': 'bg-blue-500',
  'at': 'bg-blue-500'
};

// Status badge color mapping - enhanced for dark mode visibility
const statusColors = {
  'pending': 'bg-yellow-200 text-yellow-900 dark:bg-yellow-500 dark:text-black font-semibold',
  'completed': 'bg-green-200 text-green-900 dark:bg-green-500 dark:text-black font-semibold',
  'failed': 'bg-red-200 text-red-900 dark:bg-red-500 dark:text-black font-semibold',
  'processing': 'bg-blue-200 text-blue-900 dark:bg-blue-500 dark:text-black font-semibold',
  'refunded': 'bg-purple-200 text-purple-900 dark:bg-purple-500 dark:text-black font-semibold',
  'waiting': 'bg-gray-200 text-gray-900 dark:bg-gray-500 dark:text-black font-semibold'
};

export default function DataPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [allPurchases, setAllPurchases] = useState([]); // Store all purchases for filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterNetwork, setFilterNetwork] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const router = useRouter();
  const modalRef = useRef(null);
  
  // Get userId from localStorage userData object
  const getUserId = () => {
    if (typeof window === 'undefined') return null;
    
    const userDataString = localStorage.getItem('userData');
    if (!userDataString) return null;
    
    try {
      const userData = JSON.parse(userDataString);
      return userData.id;
    } catch (err) {
      console.error('Error parsing user data:', err);
      return null;
    }
  };

  // Handle click outside modal to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        // Only close if not in confirmation mode
        if (!showConfirmation) {
          setShowReportModal(false);
        }
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showConfirmation]);

  useEffect(() => {
    const userId = getUserId();
    
    if (!userId) {
      router.push('/SignIn');
      return;
    }
    
    const fetchPurchases = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/data/purchase-history/${userId}`, {
          params: {
            page: pagination.currentPage,
            limit: 20 // Increased limit for better filtering options
          }
        });
        
        if (response.data.status === 'success') {
          // Get the purchases from the response
          const purchasesData = response.data.data.purchases;
          
          // For each purchase with a geonetReference, fetch the current status
          const purchasesWithUpdatedStatus = await Promise.all(
            purchasesData.map(async (purchase) => {
              // If there's no geonetReference or it's an AirtelTigo purchase, skip status update
              if (!purchase.geonetReference || purchase.network === 'at') {
                return purchase;
              }
              
              try {
                // Make request to Geonettech API to get current status
                const statusResponse = await axios.get(
                  `${GEONETTECH_BASE_URL}/order/${purchase.geonetReference}/status`,
                  {
                    headers: {
                      Authorization: `Bearer ${API_KEY}`
                    }
                  }
                );
                
                // Extract status from response
                const geonetStatus = statusResponse.data.data.order.status;
                
                // If status is "completed" and our local status is different
                if (geonetStatus === 'completed' && purchase.status !== 'completed') {
                  try {
                    // Update status in our backend (optional)
                    await axios.post(`${API_BASE_URL}/data/update-status/${purchase._id}`, {
                      status: 'completed'
                    });
                  } catch (updateError) {
                    console.error('Failed to update status in backend:', updateError);
                  }
                }
                
                // Return purchase with updated status
                return {
                  ...purchase,
                  status: geonetStatus || purchase.status
                };
              } catch (statusError) {
                console.error(`Failed to fetch status for purchase ${purchase._id}:`, statusError);
                return purchase;
              }
            })
          );
          
          setAllPurchases(purchasesWithUpdatedStatus);
          setPurchases(purchasesWithUpdatedStatus);
          setPagination({
            currentPage: response.data.data.pagination.currentPage,
            totalPages: response.data.data.pagination.totalPages
          });
        } else {
          throw new Error('Failed to fetch purchases');
        }
      } catch (err) {
        console.error('Error fetching purchases:', err);
        setError('Failed to load purchase history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
    
    // Set up polling to check status periodically (every 60 seconds)
    const intervalId = setInterval(fetchPurchases, 60000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
    
  }, [pagination.currentPage, router]);

  // Apply filters and search
  useEffect(() => {
    if (allPurchases.length > 0) {
      let filteredPurchases = [...allPurchases];
      
      // Apply status filter
      if (filterStatus !== 'all') {
        filteredPurchases = filteredPurchases.filter(purchase => purchase.status === filterStatus);
      }
      
      // Apply network filter
      if (filterNetwork !== 'all') {
        filteredPurchases = filteredPurchases.filter(purchase => purchase.network === filterNetwork);
      }
      
      // Apply search
      if (searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        filteredPurchases = filteredPurchases.filter(purchase => 
          purchase.phoneNumber.toLowerCase().includes(searchLower) ||
          purchase.geonetReference?.toLowerCase().includes(searchLower) ||
          networkNames[purchase.network]?.toLowerCase().includes(searchLower) ||
          purchase.network.toLowerCase().includes(searchLower)
        );
      }
      
      setPurchases(filteredPurchases);
    }
  }, [searchTerm, filterStatus, filterNetwork, allPurchases]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        currentPage: newPage
      }));
      // Reset expanded card when changing page
      setExpandedId(null);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterNetwork('all');
    setShowFilters(false);
  };

  // Format date string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Toggle expanded card
  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Open report modal for an order
  const openReportModal = (order) => {
    setSelectedOrder(order);
    setReportReason('');
    setReportSuccess(false);
    setReportError(null);
    setShowConfirmation(false);
    setShowReportModal(true);
  };

  // View all reports
  const viewAllReports = () => {
    router.push('/reports');
  };

  // Submit report confirmation
  const confirmReportSubmission = () => {
    if (reportReason.trim().length < 10) {
      setReportError("Please provide a detailed reason (at least 10 characters)");
      return;
    }
    setShowConfirmation(true);
  };

  // Cancel report submission
  const cancelReportSubmission = () => {
    setShowConfirmation(false);
  };

  // Submit report to backend
  const submitReport = async () => {
    if (!selectedOrder || !reportReason.trim()) {
      return;
    }
    
    const userId = getUserId();
    if (!userId) {
      setReportError("Authentication required. Please login again.");
      return;
    }
    
    setSubmittingReport(true);
    setReportError(null);
    
    try {
      const response = await axios.post(`https://datamartbackened.onrender.com/api/reports/creat`, {
        userId: userId,
        purchaseId: selectedOrder._id,
        reason: reportReason
      });
      
      if (response.data.status === 'success') {
        setReportSuccess(true);
        setShowConfirmation(false);
        
        // Clear form after successful submission
        setTimeout(() => {
          setShowReportModal(false);
          setReportSuccess(false);
        }, 3000);
      } else {
        throw new Error(response.data.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      setReportError(error.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Check if user is authenticated
  const userId = getUserId();
  if (!userId && typeof window !== 'undefined') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md w-full">
          <div className="py-12 px-6">
            <div className="text-center">
              <p className="mb-4 dark:text-gray-200">You need to be logged in to view your purchases.</p>
              <button 
                onClick={() => router.push('/SignIn')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to get network initials for logo
  const getNetworkInitials = (networkCode) => {
    const name = networkNames[networkCode] || networkCode;
    return name.substring(0, 2).toUpperCase();
  };

  // Format data size
  const formatDataSize = (capacity) => {
    return capacity >= 1000 
      ? `${capacity / 1000}GB` 
      : `${capacity}GB`;
  };

  // Get unique networks for filter dropdown
  const getUniqueNetworks = () => {
    if (!allPurchases.length) return [];
    const networks = [...new Set(allPurchases.map(purchase => purchase.network))];
    return networks.sort();
  };

  // Get unique statuses for filter dropdown
  const getUniqueStatuses = () => {
    if (!allPurchases.length) return [];
    const statuses = [...new Set(allPurchases.map(purchase => purchase.status))];
    return statuses.sort();
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div 
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-600"
          >
            {/* Modal Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-r from-red-500 to-red-600">
              <h3 className="text-xl font-bold text-white drop-shadow-md flex items-center">
                <AlertCircle className="mr-2 h-5 w-5" /> Report Order Not Received
              </h3>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              {reportSuccess ? (
                <div className="text-center py-6">
                  <div className="bg-green-100 dark:bg-green-800 p-4 rounded-md text-green-800 dark:text-green-200 mb-4">
                    Your report has been submitted successfully. Our team will investigate and get back to you.
                  </div>
                </div>
              ) : showConfirmation ? (
                <div>
                  <div className="bg-yellow-100 dark:bg-yellow-800/30 p-4 rounded-md text-yellow-800 dark:text-yellow-200 mb-6 flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Warning:</strong> Submitting false reports may result in account penalties or suspension. Please confirm that you have not received the data bundle you purchased.
                    </p>
                  </div>
                  
                  <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Order Details:</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md mb-6">
                    <p><span className="font-semibold">Network:</span> {networkNames[selectedOrder.network] || selectedOrder.network}</p>
                    <p><span className="font-semibold">Phone Number:</span> {selectedOrder.phoneNumber}</p>
                    <p><span className="font-semibold">Data Size:</span> {formatDataSize(selectedOrder.capacity)}</p>
                    <p><span className="font-semibold">Order Date:</span> {formatDate(selectedOrder.createdAt)}</p>
                  </div>
                  
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={cancelReportSubmission}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2 px-4 rounded-md font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitReport}
                      disabled={submittingReport}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium flex justify-center items-center"
                    >
                      {submittingReport ? (
                        <>
                          <Loader2 className="animate-spin mr-2 h-4 w-4" />
                          Submitting...
                        </>
                      ) : (
                        "Confirm Report"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-yellow-100 dark:bg-yellow-800/30 p-4 rounded-md text-yellow-800 dark:text-yellow-200 mb-4 flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <p>
                      Only report if your order status shows "completed" but you have not received the data on your phone.
                    </p>
                  </div>
                  
                  <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Order Details:</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md mb-4">
                    <p><span className="font-semibold">Network:</span> {networkNames[selectedOrder.network] || selectedOrder.network}</p>
                    <p><span className="font-semibold">Phone Number:</span> {selectedOrder.phoneNumber}</p>
                    <p><span className="font-semibold">Data Size:</span> {formatDataSize(selectedOrder.capacity)}</p>
                    <p><span className="font-semibold">Order Date:</span> {formatDate(selectedOrder.createdAt)}</p>
                    <p><span className="font-semibold">Status:</span> {selectedOrder.status}</p>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="reason" className="block text-gray-700 dark:text-gray-200 font-medium mb-2">
                      Please explain why you believe you did not receive this data bundle:
                    </label>
                    <textarea
                      id="reason"
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="4"
                      placeholder="Provide details about the issue (e.g., 'The data bundle never appeared in my account although it shows completed')"
                    ></textarea>
                  </div>
                  
                  {reportError && (
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-md text-red-800 dark:text-red-200 text-sm mb-4">
                      {reportError}
                    </div>
                  )}
                  
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2 px-4 rounded-md font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmReportSubmission}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium"
                    >
                      Submit Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full overflow-hidden border border-gray-200 dark:border-gray-600">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 md:p-6 bg-gradient-to-r from-blue-500 to-indigo-600">
          <div className="flex justify-between items-center">
            <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">Data Purchase History</h2>
            {/* View All Reports Button */}
            <button 
              onClick={viewAllReports}
              className="bg-white text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md text-sm font-medium flex items-center"
            >
              <FileText className="h-4 w-4 mr-1" />
              View All Reports
            </button>
          </div>
        </div>
        
        {/* Search and filter bar */}
        {!loading && !error && purchases.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by phone number or reference..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                  </button>
                )}
              </div>
              
              {/* Filter button */}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters {showFilters ? '▲' : '▼'}
              </button>
              
              {/* Reset button */}
              {(searchTerm || filterStatus !== 'all' || filterNetwork !== 'all') && (
                <button 
                  onClick={resetFilters}
                  className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <X className="h-5 w-5 mr-2" />
                  Reset
                </button>
              )}
            </div>
            
            {/* Expanded filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status:
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    {getUniqueStatuses().map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Network:
                  </label>
                  <select
                    value={filterNetwork}
                    onChange={(e) => setFilterNetwork(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Networks</option>
                    {getUniqueNetworks().map(network => (
                      <option key={network} value={network}>
                        {networkNames[network] || network}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Content area */}
        <div className="p-4 md:p-6">
          {/* Custom ZigZag Loading state */}
          {loading ? (
            <div className="flex flex-col justify-center items-center py-12">
              <div className="relative w-64 h-12 mb-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div 
                    key={index}
                    className="absolute h-4 w-4 bg-blue-500 rounded-full animate-pulse"
                    style={{
                      left: `${index * 30}px`,
                      top: `${index % 2 ? 0 : 24}px`,
                      animationDelay: `${index * 0.1}s`,
                      opacity: 0.8,
                    }}
                  />
                ))}
              </div>
              <span className="text-gray-900 dark:text-gray-100 font-medium">Loading purchases...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md text-red-800 dark:text-red-200 text-sm md:text-base">
              {error}
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No data purchases found.</p>
              {searchTerm || filterStatus !== 'all' || filterNetwork !== 'all' ? (
                <button 
                  onClick={resetFilters}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Clear Filters
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {/* Mobile-friendly card list */}
              <div className="block lg:hidden space-y-4">
                {purchases.map((purchase) => (
                  <div 
                    key={purchase._id} 
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-600"
                  >
                    {/* Card header - always visible */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => toggleExpand(purchase._id)}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Network logo */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${networkColors[purchase.network] || 'bg-gray-500'}`}>
                          {getNetworkInitials(purchase.network)}
                        </div>
                        
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            {formatDataSize(purchase.capacity)}
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-200">
                            {purchase.phoneNumber}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[purchase.status] || 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                          {purchase.status}
                        </span>
                        {expandedId === purchase._id ? 
                          <ChevronDown className="h-5 w-5 text-gray-400" /> : 
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        }
                      </div>
                    </div>
                    
                    {/* Expanded details */}
                    {expandedId === purchase._id && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-200 dark:border-gray-600 text-sm">
                        <div className="grid grid-cols-2 gap-y-4 mt-2">
                          <div className="flex items-center text-gray-600 dark:text-gray-200 font-medium">
                            <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                            Date
                          </div>
                          <div className="text-gray-900 dark:text-white font-medium">
                            {formatDate(purchase.createdAt)}
                          </div>
                          
                          <div className="flex items-center text-gray-600 dark:text-gray-200 font-medium">
                            <CreditCard className="h-4 w-4 mr-2 text-green-500" />
                            Price
                          </div>
                          <div className="text-gray-900 dark:text-white font-medium">
                            {formatCurrency(purchase.price)}
                          </div>
                          
                          <div className="flex items-center text-gray-600 dark:text-gray-200 font-medium">
                            <Clock className="h-4 w-4 mr-2 text-purple-500" />
                            Method
                          </div>
                          <div className="text-gray-900 dark:text-white font-medium capitalize">
                            {purchase.method}
                          </div>
                          
                          <div className="flex items-center text-gray-600 dark:text-gray-200 font-medium">
                            <Tag className="h-4 w-4 mr-2 text-orange-500" />
                            Reference
                          </div>
                          <div className="text-gray-900 dark:text-white font-medium truncate">
                            {purchase.geonetReference || '-'}
                          </div>
                        </div>
                        
                        {/* Report button - only for completed orders */}
                        {purchase.status === 'completed' && (
                          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openReportModal(purchase);
                              }}
                              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded flex items-center justify-center"
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Report Not Received
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Desktop table view */}
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Network
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Data
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Phone
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Price
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {purchases.map((purchase) => (
                        <tr key={purchase._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 ${networkColors[purchase.network] || 'bg-gray-500'}`}>
                                {getNetworkInitials(purchase.network)}
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {networkNames[purchase.network] || purchase.network}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatDataSize(purchase.capacity)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {purchase.phoneNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {formatDate(purchase.createdAt)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {formatCurrency(purchase.price)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[purchase.status] || 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                              {purchase.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {purchase.status === 'completed' && (
                              <button
                                onClick={() => openReportModal(purchase)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Report Issue
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Pagination controls */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className={`px-4 py-2 border rounded-md text-sm font-medium ${
                      pagination.currentPage === 1
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className={`px-4 py-2 border rounded-md text-sm font-medium ${
                      pagination.currentPage === pagination.totalPages
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}