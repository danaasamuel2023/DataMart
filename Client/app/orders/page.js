'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight, ChevronDown, Calendar, Phone, Database, CreditCard, Clock, Tag } from 'lucide-react';

// API constants
const GEONETTECH_BASE_URL = 'https://posapi.geonettech.com/api/v1';
const API_KEY = '21|rkrw7bcoGYjK8irAOTMaZ8sc1LRHYcwjuZnZmMNw4a6196f1';

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
  'processing': 'bg-blue-200 text-blue-900 dark:bg-blue-500 dark:text-black font-semibold'
};

export default function DataPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });
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
        const response = await axios.get(`https://datamartbackened.onrender.com/api/v1/data/purchase-history/${userId}`, {
          params: {
            page: pagination.currentPage,
            limit: 10
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
                    await axios.post(`https://datamartbackened.onrender.com/api/v1/data/update-status/${purchase._id}`, {
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
                onClick={() => router.push('/login')}
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full overflow-hidden border border-gray-200 dark:border-gray-600">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 md:p-6 bg-gradient-to-r from-blue-500 to-indigo-600">
          <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">Data Purchase History</h2>
        </div>
        
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Desktop table view */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 rounded-lg overflow-hidden">
                  <thead className="bg-blue-500 text-white">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Network</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Phone Number</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Data Size</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Price</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Method</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {purchases.map((purchase) => (
                      <tr key={purchase._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(purchase.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-100">
                          <div className="flex items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 ${networkColors[purchase.network] || 'bg-gray-500'}`}>
                              {getNetworkInitials(purchase.network)}
                            </div>
                            {networkNames[purchase.network] || purchase.network}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-100">
                          {purchase.phoneNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-100 font-medium">
                          {formatDataSize(purchase.capacity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-100">
                          {formatCurrency(purchase.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-100 capitalize">
                          {purchase.method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[purchase.status] || 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                            {purchase.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700 dark:text-gray-100 truncate max-w-xs">
                          {purchase.geonetReference || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination - enhanced for mobile and dark mode */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-6">
                  <button 
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className={`px-4 py-2 rounded-md shadow-sm font-medium ${pagination.currentPage === 1 
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'}`}
                  >
                    Previous
                  </button>
                  <div className="text-sm font-bold text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-600 px-4 py-2 rounded-md">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  <button 
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className={`px-4 py-2 rounded-md shadow-sm font-medium ${pagination.currentPage === pagination.totalPages 
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'}`}
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