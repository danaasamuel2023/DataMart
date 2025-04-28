'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight, ChevronDown, Calendar, Phone, Database, CreditCard, Clock, Tag, Search, Filter, X } from 'lucide-react';

// API constants
const GEONETTECH_BASE_URL = 'https://testhub.geonettech.site/api/v1/checkOrderStatus/:ref';
const API_KEY = '42|tjhxBxaWWe4mPUpxXN1uIk0KTxypvlSqOIOQWz6K162aa0d6';
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
  const [checkingStatus, setCheckingStatus] = useState({});
  // Track which orders have had status checked
  const [checkedStatuses, setCheckedStatuses] = useState({});

  const router = useRouter();
  
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
            limit: 20
          }
        });
        
        if (response.data.status === 'success') {
          const purchasesData = response.data.data.purchases;
          setAllPurchases(purchasesData);
          setPurchases(purchasesData);
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

  /// Function to check status of a specific order
// Function to check status of a specific order
// Function to check status of a specific order
const checkOrderStatus = async (purchaseId, geonetReference, network) => {
  // Skip if there's no geonetReference or it's an AirtelTigo purchase
  if (!geonetReference || network === 'at') {
    return;
  }
  
  setCheckingStatus(prev => ({ ...prev, [purchaseId]: true }));
  
  try {
    // Replace :ref in the URL with the actual reference
    const url = GEONETTECH_BASE_URL.replace(':ref', geonetReference);
    
    console.log('Checking status with URL:', url);
    console.log('Using geonetReference:', geonetReference);
    
    // Make request to Geonettech API to get current status
    const statusResponse = await axios.get(
      url,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`
        }
      }
    );
    
    console.log('API Response:', statusResponse.data);
    
    // Extract status from response
    const geonetStatus = statusResponse.data.data.status;
    
    console.log('Extracted status:', geonetStatus);
    
    // Only update if we got a valid status back
    if (geonetStatus) {
      // Update status in state
      const updatedPurchases = allPurchases.map(purchase => {
        if (purchase._id === purchaseId) {
          return { ...purchase, status: geonetStatus };
        }
        return purchase;
      });
      
      setAllPurchases(updatedPurchases);
      
      // Also update the filtered purchases list
      const updatedFilteredPurchases = purchases.map(purchase => {
        if (purchase._id === purchaseId) {
          return { ...purchase, status: geonetStatus };
        }
        return purchase;
      });
      
      setPurchases(updatedFilteredPurchases);

      // Mark this status as checked
      setCheckedStatuses(prev => ({
        ...prev,
        [purchaseId]: true
      }));
      
      // If status is "completed", we would update our backend, but no endpoint exists
      // Just log the status change for now
      if (geonetStatus === 'completed') {
        console.log(`Status for order ${purchaseId} is now completed`);
        // When a real endpoint is available, uncomment the code below
        /* 
        try {
          await axios.post(`${API_BASE_URL}/data/update-status/${purchaseId}`, {
            status: 'completed'
          });
        } catch (updateError) {
          console.error('Failed to update status in backend:', updateError);
        }
        */
      }
    } else {
      // If no status returned, keep the original database status
      // Mark this status as checked (but don't change the actual status)
      setCheckedStatuses(prev => ({
        ...prev,
        [purchaseId]: true
      }));
    }
    
  } catch (error) {
    console.error(`Failed to fetch status for purchase ${purchaseId}:`, error);
    console.error('Error details:', error.response?.data || 'No response data');
    
    // MODIFIED: Don't update the status on error - keep the original DB status
    // Instead, just mark it as checked so the status badge shows the original status
    setCheckedStatuses(prev => ({
      ...prev,
      [purchaseId]: true
    }));
    
    // Automatically open the dropdown to show status when not already open
    if (expandedId !== purchaseId) {
      setExpandedId(purchaseId);
    }
    
  } finally {
    setCheckingStatus(prev => ({ ...prev, [purchaseId]: false }));
  }
};

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        currentPage: newPage
      }));
      // Reset expanded card when changing page
      setExpandedId(null);
      // Reset checked statuses when changing page
      setCheckedStatuses({});
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
      ? `${capacity / 1000}MB` 
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full overflow-hidden border border-gray-200 dark:border-gray-600">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 md:p-6 bg-gradient-to-r from-blue-500 to-indigo-600">
          <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">Data Purchase History</h2>
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
          {/* Loading state */}
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
                        {purchase.geonetReference && purchase.network !== 'at' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              checkOrderStatus(purchase._id, purchase.geonetReference, purchase.network);
                            }}
                            disabled={checkingStatus[purchase._id]}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex items-center"
                          >
                            {checkingStatus[purchase._id] ? (
                              <>
                                <Loader2 className="animate-spin h-3 w-3 mr-1" />
                                Checking
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Check Status
                              </>
                            )}
                          </button>
                        ) : checkedStatuses[purchase._id] ? (
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[purchase.status] || 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                            {purchase.status || "Unknown"}
                          </span>
                        ) : null}
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
                          
                          {checkedStatuses[purchase._id] && purchase.status && (
                            <>
                              <div className="flex items-center text-gray-600 dark:text-gray-200 font-medium">
                                <Clock className="h-4 w-4 mr-2 text-indigo-500" />
                                Status
                              </div>
                              <div className="text-gray-900 dark:text-white font-medium">
                                {purchase.status}
                              </div>
                            </>
                          )}
                        </div>
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
                          Action
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
                          <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                            {purchase.geonetReference && purchase.network !== 'at' ? (
                              <button
                                onClick={() => checkOrderStatus(purchase._id, purchase.geonetReference, purchase.network)}
                                disabled={checkingStatus[purchase._id]}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-700 transition ease-in-out duration-150"
                              >
                                {checkingStatus[purchase._id] ? (
                                  <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    Checking...
                                  </>
                                ) : (
                                  <>
                                    <Clock className="-ml-1 mr-2 h-4 w-4" />
                                    Check Status
                                  </>
                                )}
                              </button>
                            ) : (
                              // For AirtelTigo or purchases without reference
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                No check available
                              </span>
                            )}
                            
                            {/* Only show status badge after checking */}
                            {checkedStatuses[purchase._id] && (
                              <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[purchase.status] || 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                                {purchase.status || "Unknown"}
                              </span>
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
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className={`flex items-center px-4 py-2 text-sm rounded-md ${
                      pagination.currentPage === 1
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                    }`}
                  >
                    <ChevronRight className="h-5 w-5 mr-1" rotate={180} />
                    Previous
                  </button>
                  
                  <div className="flex gap-1 items-center">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${
                          page === pagination.currentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className={`flex items-center px-4 py-2 text-sm rounded-md ${
                      pagination.currentPage === pagination.totalPages
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                    }`}
                  >
                    Next
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer - optional */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Having issues with your data purchase? Contact support at support@datamart.com
        </div>
      </div>
    </div>
  );
}