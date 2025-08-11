'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import axios from 'axios';
import { toast } from 'react-toastify';

const UserResultCheckers = () => {
  const router = useRouter();
  
  // State Management
  const [products, setProducts] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('buy');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [processingPurchase, setProcessingPurchase] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [purchaseSuccess, setPurchaseSuccess] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Check authentication and dark mode on mount
  useEffect(() => {
    checkAuth();
    fetchUserBalance();
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    }
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'buy') {
      fetchProducts();
    } else if (activeTab === 'history') {
      fetchMyPurchases();
    }
  }, [activeTab]);

  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login?redirect=/result-checkers');
      return;
    }
  };

  // Fetch user balance using the user stats pattern
  const fetchUserBalance = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const userDataStr = localStorage.getItem('userData');
      
      if (!authToken || !userDataStr) {
        console.error('No auth token or user data found');
        return;
      }

      const userData = JSON.parse(userDataStr);
      const userId = userData.id;

      const response = await axios.get(`http://localhost:5000/api/v1/user-stats/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.data.success) {
        setUserBalance(response.data.data.userInfo.walletBalance || 0);
      } else {
        throw new Error('Failed to fetch user stats');
      }
    } catch (err) {
      console.error('Error fetching user balance:', err);
      if (err.response && err.response.status === 401) {
        // Handle token expiration
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.push('/login');
      } else {
        toast.error('Failed to fetch wallet balance');
      }
    }
  };

  // Fetch available products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');
      
      const response = await axios.get('http://localhost:5000/api/result-checkers/user/products', {
        headers: {
          'x-auth-token': authToken
        }
      });
      
      setProducts(response.data.data);
    } catch (err) {
      console.error('Error fetching products:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('authToken');
        router.push('/login');
      } else {
        toast.error('Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's purchases
  const fetchMyPurchases = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');
      
      const response = await axios.get('http://localhost:5000/api/result-checkers/my-purchases', {
        headers: {
          'x-auth-token': authToken
        }
      });
      
      setMyPurchases(response.data.data.purchases);
    } catch (err) {
      console.error('Error fetching purchases:', err);
      toast.error('Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  };

  // Handle purchase
  const handlePurchase = async () => {
    if (!selectedProduct) return;

    try {
      setProcessingPurchase(true);
      const authToken = localStorage.getItem('authToken');
      
      const response = await axios.post('http://localhost:5000/api/result-checkers/purchase', 
        {
          checkerType: selectedProduct.name,
          paymentMethod: 'wallet'
        },
        {
          headers: {
            'x-auth-token': authToken
          }
        }
      );
      
      setPurchaseSuccess(response.data.data);
      setUserBalance(response.data.data.newWalletBalance);
      toast.success('Purchase successful! Check your SMS for details.');
      
      // Show success screen
      setShowPurchaseModal(false);
      setTimeout(() => {
        setActiveTab('history');
        fetchMyPurchases();
        setPurchaseSuccess(null);
      }, 5000);
      
    } catch (err) {
      console.error('Purchase error:', err);
      if (err.response?.data?.message === 'Insufficient wallet balance') {
        toast.error(`Insufficient balance. Your balance: GHS ${userBalance.toFixed(2)}`);
      } else {
        toast.error(err.response?.data?.message || 'Purchase failed');
      }
    } finally {
      setProcessingPurchase(false);
    }
  };

  // View purchase details
  const viewPurchaseDetails = (purchase) => {
    setSelectedPurchase(purchase);
    setShowDetailsModal(true);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <Head>
        <title>Result Checkers - WAEC & BECE</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Result Checkers</h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Purchase WAEC and BECE result checkers
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
              <p className="text-sm">Wallet Balance</p>
              <p className="text-xl font-bold text-green-600">GHS {userBalance.toFixed(2)}</p>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors duration-200 ${
                darkMode 
                  ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' 
                  : 'bg-gray-700 text-white hover:bg-gray-800'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button 
              onClick={() => router.push('/dashboard')}
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('buy')}
            className={`px-6 py-3 rounded-t-lg transition-colors duration-200 font-semibold ${
              activeTab === 'buy'
                ? 'bg-blue-500 text-white'
                : darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Buy Checkers
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-t-lg transition-colors duration-200 font-semibold ${
              activeTab === 'history'
                ? 'bg-blue-500 text-white'
                : darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            My Purchases
          </button>
        </div>

        {/* Purchase Success Alert */}
        {purchaseSuccess && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
              ✅ Purchase Successful!
            </h3>
            <div className="space-y-1 text-green-700 dark:text-green-300">
              <p><strong>Type:</strong> {purchaseSuccess.checkerType}</p>
              <p><strong>Serial Number:</strong> <span className="font-mono">{purchaseSuccess.serialNumber}</span></p>
              <p><strong>PIN:</strong> <span className="font-mono">{purchaseSuccess.pin}</span></p>
              <p className="text-sm mt-2">Check your SMS for details. Keep this information safe!</p>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className={`rounded-lg shadow-md p-6 transition-colors duration-200 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Buy Tab */}
              {activeTab === 'buy' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Available Result Checkers</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {products.map((product) => (
                      <div 
                        key={product._id} 
                        className={`border rounded-lg p-6 transition-all duration-200 ${
                          darkMode 
                            ? 'border-gray-700 hover:border-blue-500' 
                            : 'border-gray-200 hover:border-blue-400'
                        } ${!product.available && 'opacity-60'}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-2xl font-bold">{product.name}</h3>
                            <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {product.description}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm ${
                            product.available
                              ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                              : darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
                          }`}>
                            {product.available ? `${product.stockCount} Available` : 'Out of Stock'}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-6">
                          <div>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                              GHS {product.price}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (product.available) {
                                setSelectedProduct(product);
                                setShowPurchaseModal(true);
                              }
                            }}
                            disabled={!product.available}
                            className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 ${
                              product.available
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            }`}
                          >
                            {product.available ? 'Buy Now' : 'Out of Stock'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {products.length === 0 && (
                    <div className="text-center py-12">
                      <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        No products available at the moment.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Purchase History</h2>
                  
                  {myPurchases.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className={`min-w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                          <tr>
                            <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                              Reference
                            </th>
                            <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                              Type
                            </th>
                            <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                              Price
                            </th>
                            <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                              Date
                            </th>
                            <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {myPurchases.map((purchase) => (
                            <tr key={purchase._id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                              <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} font-mono text-sm`}>
                                {purchase.purchaseReference}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  purchase.checkerType === 'WAEC'
                                    ? darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                                    : darkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {purchase.checkerType}
                                </span>
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                GHS {purchase.price.toFixed(2)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                {formatDate(purchase.createdAt)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <button
                                  onClick={() => viewPurchaseDetails(purchase)}
                                  className="px-3 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-sm"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        No purchases yet. Buy your first result checker!
                      </p>
                      <button
                        onClick={() => setActiveTab('buy')}
                        className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                      >
                        Browse Checkers
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Purchase Confirmation Modal */}
      {showPurchaseModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-6 w-full max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">Confirm Purchase</h2>
            
            <div className="mb-6 space-y-3">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-semibold text-lg">{selectedProduct.name} Result Checker</h3>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {selectedProduct.description}
                </p>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Price:</span>
                <span className="font-bold text-xl">GHS {selectedProduct.price}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Your Balance:</span>
                <span className={`font-bold ${userBalance >= selectedProduct.price ? 'text-green-600' : 'text-red-600'}`}>
                  GHS {userBalance.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Balance After:</span>
                <span className="font-bold">
                  GHS {(userBalance - selectedProduct.price).toFixed(2)}
                </span>
              </div>
            </div>
            
            {userBalance < selectedProduct.price && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-lg">
                <p className="text-red-700 dark:text-red-200 text-sm">
                  Insufficient balance. Please top up your wallet before purchasing.
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setSelectedProduct(null);
                }}
                className={`px-4 py-2 rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                disabled={processingPurchase}
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                className={`px-4 py-2 rounded-md text-white transition-colors duration-200 ${
                  userBalance >= selectedProduct.price && !processingPurchase
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                disabled={userBalance < selectedProduct.price || processingPurchase}
              >
                {processingPurchase ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      {showDetailsModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-6 w-full max-w-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Purchase Details</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPurchase(null);
                }}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-semibold text-lg mb-3">{selectedPurchase.checkerType} Result Checker</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Reference:</span>
                    <span className="font-mono font-semibold">{selectedPurchase.purchaseReference}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Serial Number:</span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {selectedPurchase.serialNumber}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>PIN:</span>
                    <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                      {selectedPurchase.pin}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Price:</span>
                    <span className="font-semibold">GHS {selectedPurchase.price.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Purchase Date:</span>
                    <span>{formatDate(selectedPurchase.createdAt)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedPurchase.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}`}>
                <p className="font-semibold mb-1">Important:</p>
                <p>Keep your serial number and PIN safe. You'll need them to check your results on the official website.</p>
              </div>
              
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPurchase(null);
                }}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dark mode styles */}
      <style jsx global>{`
        .dark-mode {
          background-color: #111827;
          color: #f3f4f6;
        }
        
        .dark-mode ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .dark-mode ::-webkit-scrollbar-track {
          background: #374151;
        }
        
        .dark-mode ::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }
        
        .dark-mode ::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default UserResultCheckers;