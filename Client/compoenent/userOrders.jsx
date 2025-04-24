'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight, ChevronDown, Calendar, Phone, Database, CreditCard, Clock, Tag, Search, Filter, X, Info } from 'lucide-react';

// API constants
const GEONETTECH_BASE_URL = 'https://orders.geonettech.com/api/v1';
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
  const [checkingStatus, setCheckingStatus] = useState({});

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

  // Function to check status of a specific order
  const checkOrderStatus = async (purchaseId, geonetReference, network, event) => {
    // Prevent card from expanding when button is clicked
    if (event) {
      event.stopPropagation();
    }
    
    // Skip if there's no geonetReference or it's an AirtelTigo purchase
    if (!geonetReference || network === 'at') {
      return;
    }
    
    setCheckingStatus(prev => ({ ...prev, [purchaseId]: true }));
    
    try {
      // Make request to Geonettech API to get current status
      const statusResponse = await axios.get(
        `${GEONETTECH_BASE_URL}/order/${geonetReference}/status`,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`
          }
        }
      );
      
      // Extract status from response
      const geonetStatus = statusResponse.data.data.order.status;
      
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
        
        // If status is "completed", update our backend too
        if (geonetStatus === 'completed') {
          try {
            await axios.post(`${API_BASE_URL}/data/update-status/${purchaseId}`, {
              status: 'completed'
            });
          } catch (updateError) {
            console.error('Failed to update status in backend:', updateError);
          }
        }
      } else {
        // If no status returned, update with "unknown"
        const updatedPurchases = allPurchases.map(purchase => {
          if (purchase._id === purchaseId) {
            return { ...purchase, status: "unknown" };
          }
          return purchase;
        });
        
        setAllPurchases(updatedPurchases);
        setPurchases(updatedPurchases.filter(p => purchases.some(fp => fp._id === p._id)));
      }
      
    } catch (error) {
      console.error(`Failed to fetch status for purchase ${purchaseId}:`, error);
      
      // Update status to "error checking" on API failure
      const updatedPurchases = allPurchases.map(purchase => {
        if (purchase._id === purchaseId) {
          return { ...purchase, status: "error checking" };
        }
        return purchase;
      });
      
      setAllPurchases(updatedPurchases);
      setPurchases(updatedPurchases.filter(p => purchases.some(fp => fp._id === p._id)));
      
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
  
  // Function to display status message
  const getStatusMessage = (purchase) => {
    // If we have a geonet reference, show the Check Status button
    if (purchase.geonetReference && purchase.network !== 'at') {
      return "Click to check status";
    }
    // For AirtelTigo or purchases without reference
    return purchase.status || "Unknown";
  };

  // Helper function to get network initials for logo
  const getNetworkInitials = (networkCode) => {
    const name = networkNames[networkCode] || networkCode;
    return name.substring(0, 2).toUpperCase();
  };

  // Format data size
  const formatDataSize = (capacity) => {
    return capacity >= 1000 
      ? `${capacity / 1000}GB` 
      : `${capacity}MB`;
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
                    {/* Card header - improved layout */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpand(purchase._id)}
                    >
                      {/* Network badge */}
                      <div className="flex items-center mb-3">
                        {/* Network logo */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3 ${networkColors[purchase.network] || 'bg-gray-500'}`}>
                          {getNetworkInitials(purchase.network)}
                        </div>
                        <div className="flex-grow">
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {networkNames[purchase.network] || purchase.network}
                          </div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            {formatDataSize(purchase.capacity)}
                          </div>
                        </div>
                        {expandedId === purchase._id ? 
                          <ChevronDown className="h-5 w-5 text-gray-400" /> : 
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        }
                      </div>
                      
                      {/* Phone and status row */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center text-gray-900 dark:text-white font-medium">
                          <Phone className="h-4 w-4 mr-2 text-blue-500" />
                          {purchase.phoneNumber}
                        </div>
                        
                        {/* Status badge or button */}
                        {purchase.geonetReference && purchase.network !== 'at' ? (
                          <button
                            onClick={(e) => checkOrderStatus(purchase._id, purchase.geonetReference, purchase.network, e)}
                            disabled={checkingStatus[purchase._id]}
                            className="ml-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex items-center"
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
                        ) : (
                          <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[purchase.status] || 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                            {purchase.status || "Unknown"}
                          </span>
                        )}
                      </div>
                      
                      {/* Date and price preview */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(purchase.createdAt).split(',')[0]}
                        </div>
                        <div className="font-semibold">
                          {formatCurrency(purchase.price)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded details */}
                    {expandedId === purchase._id && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-200 dark:border-gray-600">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-3">
                          <h4 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center mb-1">
                            <Info className="h-4 w-4 mr-1" />
                            Purchase Details
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-y-3 text-sm">
                            <div className="text-gray-600 dark:text-gray-300">Date & Time:</div>
                            <div className="text-gray-900 dark:text-gray-100 font-medium">
                              {formatDate(purchase.createdAt)}
                            </div>
                            
                            <div className="text-gray-600 dark:text-gray-300">Price:</div>
                            <div className="text-gray-900 dark:text-gray-100 font-medium">
                              {formatCurrency(purchase.price)}
                            </div>
                            
                            <div className="text-gray-600 dark:text-gray-300">Payment Method:</div>
                            <div className="text-gray-900 dark:text-gray-100 font-medium capitalize">
                              {purchase.method || "Not specified"}
                            </div>
                            
                            <div className="text-gray-600 dark:text-gray-300">Reference:</div>
                            <div className="text-gray-900 dark:text-gray-100 font-medium break-all">
                              {purchase.geonetReference || "N/A"}
                            </div>
                            
                            <div className="text-gray-600 dark:text-gray-300">Current Status:</div>
                            <div className="text-gray-900 dark:text-gray-100 font-medium">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[purchase.status] || 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                                {purchase.status || "Unknown"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Desktop table view */}
              <div className="hidden lg:block">
                <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
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
                          Status/Action
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
                            {purchase.geonetReference && purchase.network !== 'at' ? (
                              <button
                                onClick={(e) => checkOrderStatus(purchase._id, purchase.geonetReference, purchase.network, e)}
                                disabled={checkingStatus[purchase._id]}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-700 transition ease-in-out duration-150"
                              >
                                {checkingStatus[purchase._id] ? (
                                  <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    Checking Status
                                  </>
                                ) : (
                                  <>
                                    <Clock className="-ml-1 mr-2 h-4 w-4" />
                                    {purchase.status ? `Update Status (${purchase.status})` : 'Check Status'}
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[purchase.status] || 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
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
              
              {/* Pagination controls - improved styling */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className={`flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                      pagination.currentPage === 1
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                    Previous
                  </button>
                  
                  <div className="hidden md:flex space-x-2">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(page => 
                        page === 1 || 
                        page === pagination.totalPages || 
                        Math.abs(page - pagination.currentPage) <= 1
                      )
                      .map((page, index, array) => {
                        // Add ellipsis
                        if (index > 0 && page - array[index - 1] > 1) {
                          return (
                            <React.Fragment key={`ellipsis-${page}`}>
                              <span className="px-3 py-2 text-gray-500 dark:text-gray-400">...</span>
                              <button
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-1 rounded-md ${
                                  pagination.currentPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        }
                        
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 rounded-md ${
                              pagination.currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                  </div>
                  
                  <span className="text-sm text-gray-700 dark:text-gray-300 md:hidden">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className={`flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                      pagination.currentPage === pagination.totalPages
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )};