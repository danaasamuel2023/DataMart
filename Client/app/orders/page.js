'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight, ChevronDown, Calendar, Phone, Database, CreditCard, Clock, Tag, Search, Filter, X, Zap, Activity, Sparkles, TrendingUp } from 'lucide-react';

// API constants
const GEONETTECH_BASE_URL = 'https://testhub.geonettech.site/api/v1/checkOrderStatus/:ref';
const API_KEY = '42|tjhxBxaWWe4mPUpxXN1uIk0KTxypvlSqOIOQWz6K162aa0d6';
// Add Telcel API endpoint and key
const TELCEL_API_URL = 'https://iget.onrender.com/api/developer/orders/reference/:orderRef';
const TELCEL_API_KEY = '4cb6763274e86173d2c22c120493ca67b6185039f826f4aa43bb3057db50f858'; 
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

// Network logo colors - updated for DATAHUSTLE theme
const networkColors = {
  'YELLO': 'bg-gradient-to-br from-yellow-500 to-yellow-600',
  'TELECEL': 'bg-gradient-to-br from-red-500 to-red-600',
  'AT_PREMIUM': 'bg-gradient-to-br from-blue-500 to-blue-600',
  'airteltigo': 'bg-gradient-to-br from-blue-500 to-blue-600',
  'at': 'bg-gradient-to-br from-blue-500 to-blue-600'
};

// Status badge color mapping - enhanced for DATAHUSTLE theme
const statusColors = {
  'pending': 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/40 dark:to-yellow-800/40 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700',
  'completed': 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 dark:from-emerald-900/40 dark:to-emerald-800/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700',
  'failed': 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/40 dark:to-red-800/40 dark:text-red-300 border border-red-300 dark:border-red-700',
  'processing': 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/40 dark:to-blue-800/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700',
  'refunded': 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 dark:from-purple-900/40 dark:to-purple-800/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700',
  'waiting': 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-800/40 dark:to-gray-700/40 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
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

  // Modified function to check order status for different networks
  const checkOrderStatus = async (purchaseId, geonetReference, network) => {
    // Skip if there's no geonetReference or it's an AirtelTigo purchase
    if (!geonetReference || network === 'at') {
      return;
    }
    
    setCheckingStatus(prev => ({ ...prev, [purchaseId]: true }));
    
    try {
      let statusResponse;
      let status;
      
      // Use Telcel API for Telecel network
      if (network === 'TELECEL') {
        // Replace :orderRef in the URL with the actual reference
        const telcelUrl = TELCEL_API_URL.replace(':orderRef', geonetReference);
        
        console.log('Checking Telcel status with URL:', telcelUrl);
        console.log('Using geonetReference:', geonetReference);
        
        // Make request to Telcel API to get current status
        statusResponse = await axios.get(
          telcelUrl,
          {
            headers: {
              'X-API-Key': TELCEL_API_KEY
            }
          }
        );
        
        console.log('Telcel API Response:', statusResponse.data);
        
        // Extract status from Telcel response based on API documentation
        status = statusResponse.data.data.order.status;
        
        console.log('Extracted Telcel status:', status);
      } else {
        // For other networks, use the original GeoNetTech API
        const url = GEONETTECH_BASE_URL.replace(':ref', geonetReference);
        
        console.log('Checking status with URL:', url);
        console.log('Using geonetReference:', geonetReference);
        
        // Make request to Geonettech API to get current status
        statusResponse = await axios.get(
          url,
          {
            headers: {
              Authorization: `Bearer ${API_KEY}`
            }
          }
        );
        
        console.log('API Response:', statusResponse.data);
        
        // Extract status from response
        status = statusResponse.data.data.status;
        
        console.log('Extracted status:', status);
      }
      
      // Only update if we got a valid status back
      if (status) {
        // Update status in state
        const updatedPurchases = allPurchases.map(purchase => {
          if (purchase._id === purchaseId) {
            return { ...purchase, status: status };
          }
          return purchase;
        });
        
        setAllPurchases(updatedPurchases);
        
        // Also update the filtered purchases list
        const updatedFilteredPurchases = purchases.map(purchase => {
          if (purchase._id === purchaseId) {
            return { ...purchase, status: status };
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
        if (status === 'completed') {
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-emerald-200/50 dark:border-emerald-800/30">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-transparent bg-clip-text mb-4">
              DATAHUSTLE
            </h2>
            <p className="mb-6 dark:text-gray-200 font-medium">You need to be logged in to view your purchases.</p>
            <button 
              onClick={() => router.push('/SignIn')}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              Go to Login
            </button>
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

  // Calculate purchase stats
  const purchaseStats = {
    total: purchases.length,
    completed: purchases.filter(p => p.status === 'completed').length,
    pending: purchases.filter(p => p.status === 'pending').length,
    totalAmount: purchases.reduce((sum, p) => sum + p.price, 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl shadow-2xl p-6 transform hover:scale-105 transition-all duration-300">
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4">
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div className="absolute bottom-4 left-4">
                <Activity className="w-6 h-6 text-white animate-bounce" />
              </div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Database className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-white">Data Purchase History</h1>
              </div>
              <p className="text-white/90 text-lg font-medium">Track your DATAHUSTLE data purchases</p>
            </div>
          </div>
        </div>

        {/* Purchase Stats */}
        {!loading && !error && purchases.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/30">
              <div className="flex items-center">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl mr-3">
                  <Database className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Orders</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{purchaseStats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/30">
              <div className="flex items-center">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl mr-3">
                  <Zap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{purchaseStats.completed}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/30">
              <div className="flex items-center">
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-xl mr-3">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{purchaseStats.pending}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/30">
              <div className="flex items-center">
                <div className="bg-teal-100 dark:bg-teal-900/30 p-3 rounded-xl mr-3">
                  <TrendingUp className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Spent</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(purchaseStats.totalAmount)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-emerald-200/50 dark:border-emerald-800/30">
          {/* Search and filter bar */}
          {!loading && !error && purchases.length > 0 && (
            <div className="p-6 border-b border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search input */}
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by phone number or reference..."
                    className="block w-full pl-12 pr-4 py-3 border-2 border-emerald-300 dark:border-emerald-700 dark:bg-gray-800/80 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 backdrop-blur-sm font-medium"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <X className="h-5 w-5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" />
                    </button>
                  )}
                </div>
                
                {/* Filter button */}
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center px-6 py-3 border-2 border-emerald-300 dark:border-emerald-700 bg-white/80 dark:bg-gray-800/80 rounded-xl text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-bold backdrop-blur-sm shadow-sm transition-all duration-300"
                >
                  <Filter className="h-5 w-5 mr-2" />
                  Filters {showFilters ? '▲' : '▼'}
                </button>
                
                {/* Reset button */}
                {(searchTerm || filterStatus !== 'all' || filterNetwork !== 'all') && (
                  <button 
                    onClick={resetFilters}
                    className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-bold shadow-lg transform hover:scale-105 transition-all duration-300"
                  >
                    <X className="h-5 w-5 mr-2" />
                    Reset
                  </button>
                )}
              </div>
              
              {/* Expanded filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-800/30">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Status:
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="block w-full px-4 py-3 border-2 border-emerald-300 dark:border-emerald-700 dark:bg-gray-800/80 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium backdrop-blur-sm"
                    >
                      <option value="all">All Statuses</option>
                      {getUniqueStatuses().map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Network:
                    </label>
                    <select
                      value={filterNetwork}
                      onChange={(e) => setFilterNetwork(e.target.value)}
                      className="block w-full px-4 py-3 border-2 border-emerald-300 dark:border-emerald-700 dark:bg-gray-800/80 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium backdrop-blur-sm"
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
          <div className="p-6">
            {/* Loading state */}
            {loading ? (
              <div className="flex flex-col justify-center items-center py-20">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-emerald-100 dark:border-emerald-900"></div>
                  <div className="absolute top-0 w-20 h-20 rounded-full border-4 border-transparent border-t-emerald-500 dark:border-t-emerald-400 animate-spin"></div>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-transparent bg-clip-text">
                    DATAHUSTLE
                  </h1>
                </div>
                <span className="text-gray-900 dark:text-gray-100 font-medium">Loading purchases...</span>
              </div>
            ) : error ? (
              <div className="bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 p-6 rounded-2xl text-red-800 dark:text-red-200 text-base font-medium border border-red-300 dark:border-red-700 shadow-lg">
                {error}
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Database className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No data purchases found</h3>
                <p className="font-medium mb-4">Start your DATAHUSTLE journey today!</p>
                {searchTerm || filterStatus !== 'all' || filterNetwork !== 'all' ? (
                  <button 
                    onClick={resetFilters}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-300"
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
                      className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-lg rounded-2xl overflow-hidden shadow-xl border border-emerald-200/50 dark:border-emerald-800/30 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                    >
                      {/* Card header - always visible */}
                      <div 
                        className="flex items-center justify-between p-5 cursor-pointer"
                        onClick={() => toggleExpand(purchase._id)}
                      >
                        <div className="flex items-center space-x-4">
                          {/* Network logo */}
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shadow-lg ${networkColors[purchase.network] || 'bg-gradient-to-br from-gray-500 to-gray-600'}`}>
                            {getNetworkInitials(purchase.network)}
                          </div>
                          
                          <div>
                            <div className="font-black text-gray-900 dark:text-white text-lg">
                              {formatDataSize(purchase.capacity)}
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">
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
                              className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs rounded-xl flex items-center font-bold shadow-lg transform hover:scale-105 transition-all duration-300"
                            >
                              {checkingStatus[purchase._id] ? (
                                <>
                                  <Loader2 className="animate-spin h-4 w-4 mr-1" />
                                  Checking
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4 mr-1" />
                                  Check Status
                                </>
                              )}
                            </button>
                          ) : checkedStatuses[purchase._id] ? (
                            <span className={`px-3 py-2 inline-flex text-xs leading-5 font-bold rounded-xl shadow-sm ${statusColors[purchase.status] || 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 text-gray-800 dark:text-gray-200'}`}>
                              {purchase.status || "Unknown"}
                            </span>
                          ) : null}
                          {expandedId === purchase._id ? 
                            <ChevronDown className="h-6 w-6 text-emerald-500" /> : 
                            <ChevronRight className="h-6 w-6 text-emerald-500" />
                          }
                        </div>
                      </div>
                      
                      {/* Expanded details */}
                      {expandedId === purchase._id && (
                        <div className="px-5 pb-5 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/30 text-sm bg-gradient-to-r from-emerald-50/30 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/10">
                          <div className="grid grid-cols-2 gap-y-6 mt-4">
                            <div className="flex items-center text-gray-600 dark:text-gray-200 font-bold">
                              <Calendar className="h-5 w-5 mr-2 text-emerald-500" />
                              Date
                            </div>
                            <div className="text-gray-900 dark:text-white font-bold">
                              {formatDate(purchase.createdAt)}
                            </div>
                            
                            <div className="flex items-center text-gray-600 dark:text-gray-200 font-bold">
                              <CreditCard className="h-5 w-5 mr-2 text-emerald-500" />
                              Price
                            </div>
                            <div className="text-gray-900 dark:text-white font-bold">
                              {formatCurrency(purchase.price)}
                            </div>
                            
                            <div className="flex items-center text-gray-600 dark:text-gray-200 font-bold">
                              <Clock className="h-5 w-5 mr-2 text-emerald-500" />
                              Method
                            </div>
                            <div className="text-gray-900 dark:text-white font-bold capitalize">
                              {purchase.method}
                            </div>
                            
                            <div className="flex items-center text-gray-600 dark:text-gray-200 font-bold">
                              <Tag className="h-5 w-5 mr-2 text-emerald-500" />
                              Reference
                            </div>
                            <div className="text-gray-900 dark:text-white font-bold truncate">
                              {purchase.geonetReference || '-'}
                            </div>
                            
                            {checkedStatuses[purchase._id] && purchase.status && (
                              <>
                                <div className="flex items-center text-gray-600 dark:text-gray-200 font-bold">
                                  <Zap className="h-5 w-5 mr-2 text-emerald-500" />
                                  Status
                                </div>
                                <div className="text-gray-900 dark:text-white font-bold">
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
                  <div className="overflow-x-auto rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
                    <table className="min-w-full divide-y divide-emerald-200 dark:divide-emerald-800">
                      <thead className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                            Network
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                            Data
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                            Phone
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                            Price
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/80 dark:bg-gray-800/80 divide-y divide-emerald-200/50 dark:divide-emerald-800/50">
                        {purchases.map((purchase) => (
                          <tr key={purchase._id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all duration-300">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black mr-4 shadow-lg ${networkColors[purchase.network] || 'bg-gradient-to-br from-gray-500 to-gray-600'}`}>
                                  {getNetworkInitials(purchase.network)}
                                </div>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {networkNames[purchase.network] || purchase.network}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-black text-gray-900 dark:text-white">
                                {formatDataSize(purchase.capacity)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {purchase.phoneNumber}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatDate(purchase.createdAt)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(purchase.price)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                              {purchase.geonetReference && purchase.network !== 'at' ? (
                                <button
                                  onClick={() => checkOrderStatus(purchase._id, purchase.geonetReference, purchase.network)}
                                  disabled={checkingStatus[purchase._id]}
                                  className="inline-flex items-center px-4 py-2 border-2 border-emerald-500 dark:border-emerald-400 text-sm leading-5 font-bold rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-300 shadow-sm transform hover:scale-105"
                                >
                                  {checkingStatus[purchase._id] ? (
                                    <>
                                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                      Checking...
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="-ml-1 mr-2 h-4 w-4" />
                                      Check Status
                                    </>
                                  )}
                                </button>
                              ) : (
                                // For AirtelTigo or purchases without reference
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                  No check available
                                </span>
                              )}
                              
                              {/* Only show status badge after checking */}
                              {checkedStatuses[purchase._id] && (
                                <span className={`px-3 py-2 inline-flex text-xs leading-5 font-bold rounded-xl shadow-sm ${statusColors[purchase.status] || 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 text-gray-800 dark:text-gray-200'}`}>
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
                  <div className="mt-8 flex items-center justify-between border-t border-emerald-200/50 dark:border-emerald-800/30 pt-6">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className={`flex items-center px-6 py-3 text-sm rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                        pagination.currentPage === 1
                          ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-100 dark:bg-gray-700'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 bg-white/80 dark:bg-gray-800/80 shadow-lg border border-emerald-200 dark:border-emerald-700'
                      }`}
                    >
                      <ChevronRight className="h-5 w-5 mr-2" style={{ transform: 'rotate(180deg)' }} />
                      Previous
                    </button>
                    
                    <div className="flex gap-2 items-center">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-110 ${
                            page === pagination.currentPage
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 bg-white/80 dark:bg-gray-800/80 border border-emerald-200 dark:border-emerald-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className={`flex items-center px-6 py-3 text-sm rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                        pagination.currentPage === pagination.totalPages
                          ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-100 dark:bg-gray-700'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 bg-white/80 dark:bg-gray-800/80 shadow-lg border border-emerald-200 dark:border-emerald-700'
                      }`}
                    >
                      Next
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-emerald-200/50 dark:border-emerald-800/30 p-6 text-center text-sm text-gray-600 dark:text-gray-400 bg-gradient-to-r from-emerald-50/30 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/10">
            <div className="flex items-center justify-center space-x-2 font-medium">
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Having issues with your data purchase? Contact DATAHUSTLE support at support@datahustle.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}