'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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

// Status badge color mapping - improved for dark mode visibility
const statusColors = {
  'pending': 'bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100',
  'completed': 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100',
  'failed': 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100',
  'processing': 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100'
};

export default function DataPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md w-full">
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Purchase History</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" />
              <span className="ml-2 text-gray-700 dark:text-gray-300">Loading purchases...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md text-red-800 dark:text-red-200">{error}</div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No data purchases found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Network</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone Number</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data Size</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Method</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {purchases.map((purchase) => (
                      <tr key={purchase._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(purchase.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {networkNames[purchase.network] || purchase.network}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {purchase.phoneNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {purchase.capacity >= 1000 
                            ? `${purchase.capacity / 1000}GB` 
                            : `${purchase.capacity}MB`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {formatCurrency(purchase.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 capitalize">
                          {purchase.method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[purchase.status] || 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                            {purchase.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-300 truncate max-w-xs">
                          {purchase.geonetReference || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button 
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className={`px-3 py-1 rounded border ${pagination.currentPage === 1 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-600' 
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                  >
                    Previous
                  </button>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  <button 
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className={`px-3 py-1 rounded border ${pagination.currentPage === pagination.totalPages 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-600' 
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
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