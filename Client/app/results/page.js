'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  ChevronLeft, Wallet, ShoppingBag, Clock, CheckCircle, XCircle, 
  Sun, Moon, Copy, Eye, EyeOff, Download, CreditCard, AlertCircle, 
  Code2, ExternalLink, Info, MessageSquareOff, Shield, TrendingUp,
  Award, BookOpen, GraduationCap, FileText, Check
} from 'lucide-react';

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
  const [showPin, setShowPin] = useState(false);
  const [copiedText, setCopiedText] = useState('');

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

  // Fetch user balance
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

      const response = await axios.get(`https://datamartbackened.onrender.com/api/v1/user-stats/${userId}`, {
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
      
      const response = await axios.get('https://datamartbackened.onrender.com/api/result-checkers/user/products', {
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
      
      const response = await axios.post('https://api.datamartgh.shop/api/result-checkers/purchase', 
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
      toast.success('Purchase successful! View your credentials below.');
      
      // Show success screen
      setShowPurchaseModal(false);
      setTimeout(() => {
        setActiveTab('history');
        fetchMyPurchases();
        setPurchaseSuccess(null);
      }, 7000);
      
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

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} copied!`);
    setTimeout(() => setCopiedText(''), 2000);
  };

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
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode 
        ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-black' 
        : 'bg-gradient-to-b from-gray-50 via-white to-gray-50'
    }`}>
      <Head>
        <title>Result Checkers - WAEC & BECE | Professional Service</title>
      </Head>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className={`text-3xl lg:text-4xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              } mb-2`}>
                Result Checker Service
              </h1>
              <p className={`text-base lg:text-lg ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Official WAEC and BECE result verification cards
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Balance Card */}
              <div className={`px-5 py-3 rounded-xl ${
                darkMode 
                  ? 'bg-gray-800/80 backdrop-blur border border-gray-700' 
                  : 'bg-white shadow-md border border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <Wallet className={`w-5 h-5 ${
                    darkMode ? 'text-emerald-400' : 'text-emerald-600'
                  }`} />
                  <div className="flex flex-col">
                    <span className={`text-xs ${
                      darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>Balance</span>
                    <span className={`text-lg font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      GHS {userBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              {/* Back Button */}
              <button
                onClick={() => router.push('/dashboard')}
                className={`px-5 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            </div>
          </div>
        </div>

        {/* SMS Service Notice */}
        <div className={`mb-6 p-4 rounded-xl border ${
          darkMode 
            ? 'bg-amber-900/20 border-amber-800/50' 
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <MessageSquareOff className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              darkMode ? 'text-amber-400' : 'text-amber-600'
            }`} />
            <div className="flex-1">
              <h3 className={`font-semibold mb-1 ${
                darkMode ? 'text-amber-300' : 'text-amber-800'
              }`}>
                SMS Service Temporarily Unavailable
              </h3>
              <p className={`text-sm ${
                darkMode ? 'text-amber-400/80' : 'text-amber-700'
              }`}>
                SMS notifications are currently offline. Don't worry - all your purchase details are safely stored 
                and can be viewed anytime in your purchase history. Click "View Details" on any purchase to see 
                your serial number and PIN.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'buy', label: 'Available Cards', icon: ShoppingBag },
            { id: 'history', label: 'My Purchases', icon: Clock }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? darkMode
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                    : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Success Alert */}
        {purchaseSuccess && (
          <div className={`mb-6 p-6 rounded-xl ${
            darkMode 
              ? 'bg-emerald-900/30 border border-emerald-700/50' 
              : 'bg-emerald-50 border border-emerald-200'
          }`}>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-3 ${
                  darkMode ? 'text-emerald-300' : 'text-emerald-800'
                }`}>
                  Purchase Successful!
                </h3>
                <div className={`space-y-2 ${
                  darkMode ? 'text-emerald-200' : 'text-emerald-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Type:</span>
                    <span className="font-mono bg-white/20 px-2 py-0.5 rounded">
                      {purchaseSuccess.checkerType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Serial:</span>
                    <span className="font-mono bg-white/20 px-2 py-0.5 rounded">
                      {purchaseSuccess.serialNumber}
                    </span>
                    <button
                      onClick={() => copyToClipboard(purchaseSuccess.serialNumber, 'serial')}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">PIN:</span>
                    <span className="font-mono bg-white/20 px-2 py-0.5 rounded">
                      {purchaseSuccess.pin}
                    </span>
                    <button
                      onClick={() => copyToClipboard(purchaseSuccess.pin, 'pin')}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className={`text-sm mt-3 flex items-center gap-2 ${
                    darkMode ? 'text-emerald-300' : 'text-emerald-600'
                  }`}>
                    <Info className="w-4 h-4" />
                    Saved to your purchase history for future reference
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Buy Tab */}
            {activeTab === 'buy' && (
              <div className="space-y-6">
                {/* Products Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <div
                      key={product._id}
                      className={`rounded-xl overflow-hidden transition-all duration-200 ${
                        darkMode 
                          ? 'bg-gray-800 hover:bg-gray-750 border border-gray-700' 
                          : 'bg-white hover:shadow-lg border border-gray-200'
                      }`}
                    >
                      {/* Product Header */}
                      <div className={`p-6 ${
                        product.name === 'WAEC' 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                          : 'bg-gradient-to-r from-purple-600 to-purple-700'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                              {product.name === 'WAEC' ? 
                                <GraduationCap className="w-8 h-8 text-white" /> : 
                                <BookOpen className="w-8 h-8 text-white" />
                              }
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-white">
                                {product.name}
                              </h3>
                              <p className="text-white/80 text-sm mt-1">
                                Result Checker Card
                              </p>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            product.available 
                              ? 'bg-green-400/20 text-green-100 border border-green-400/30' 
                              : 'bg-red-400/20 text-red-100 border border-red-400/30'
                          }`}>
                            {product.available ? `${product.stockCount} Available` : 'Out of Stock'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Product Body */}
                      <div className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {product.description}
                        </p>
                        
                        {/* Features */}
                        <div className="space-y-2 mb-6">
                          {[
                            'Instant digital delivery',
                            'Valid for current examination year',
                            'Secure and authenticated',
                            'One-time use per card'
                          ].map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Check className={`w-4 h-4 ${
                                darkMode ? 'text-emerald-400' : 'text-emerald-600'
                              }`} />
                              <span className={`text-sm ${
                                darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Price and Action */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <p className={`text-sm ${
                              darkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              Price
                            </p>
                            <p className={`text-2xl font-bold ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              GHS {product.price.toFixed(2)}
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
                            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                              product.available
                                ? product.name === 'WAEC'
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {product.available ? 'Purchase Now' : 'Unavailable'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* API Integration Card */}
                <div className={`rounded-xl p-6 ${
                  darkMode 
                    ? 'bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-700/30' 
                    : 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200'
                }`}>
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 backdrop-blur rounded-lg">
                        <Code2 className={`w-6 h-6 ${
                          darkMode ? 'text-indigo-400' : 'text-indigo-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold mb-1 ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          Developer API Available
                        </h3>
                        <p className={`text-sm ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Integrate result checker sales into your platform
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => router.push('/checkers-doc')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all duration-200"
                    >
                      View Documentation
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {myPurchases.length > 0 ? (
                  myPurchases.map((purchase) => (
                    <div
                      key={purchase._id}
                      className={`rounded-xl overflow-hidden transition-all duration-200 ${
                        darkMode 
                          ? 'bg-gray-800 hover:bg-gray-750 border border-gray-700' 
                          : 'bg-white hover:shadow-md border border-gray-200'
                      }`}
                    >
                      <div className="p-6">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          {/* Purchase Info */}
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${
                              purchase.checkerType === 'WAEC' 
                                ? 'bg-blue-100 dark:bg-blue-900/30' 
                                : 'bg-purple-100 dark:bg-purple-900/30'
                            }`}>
                              {purchase.checkerType === 'WAEC' ? 
                                <GraduationCap className={`w-6 h-6 ${
                                  purchase.checkerType === 'WAEC'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-purple-600 dark:text-purple-400'
                                }`} /> : 
                                <BookOpen className={`w-6 h-6 ${
                                  purchase.checkerType === 'WAEC'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-purple-600 dark:text-purple-400'
                                }`} />
                              }
                            </div>
                            
                            <div>
                              <h4 className={`text-lg font-semibold ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {purchase.checkerType} Result Checker
                              </h4>
                              <p className={`text-sm mt-1 ${
                                darkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                Ref: {purchase.purchaseReference}
                              </p>
                              <p className={`text-xs mt-1 ${
                                darkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {formatDate(purchase.createdAt)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-3">
                            <div className="text-right mr-4">
                              <p className={`text-sm ${
                                darkMode ? 'text-gray-500' : 'text-gray-500'
                              }`}>
                                Amount
                              </p>
                              <p className={`text-lg font-semibold ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                GHS {purchase.price.toFixed(2)}
                              </p>
                            </div>
                            
                            <button
                              onClick={() => {
                                setSelectedPurchase(purchase);
                                setShowDetailsModal(true);
                              }}
                              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`text-center py-16 rounded-xl ${
                    darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'
                  }`}>
                    <ShoppingBag className={`w-16 h-16 mx-auto mb-4 ${
                      darkMode ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <p className={`text-lg mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      No purchases yet
                    </p>
                    <p className={`text-sm mb-6 ${
                      darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      Purchase your first result checker to get started
                    </p>
                    <button
                      onClick={() => setActiveTab('buy')}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
                    >
                      Browse Available Cards
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl overflow-hidden ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-2xl`}>
            {/* Modal Header */}
            <div className={`p-6 ${
              selectedProduct.name === 'WAEC' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                : 'bg-gradient-to-r from-purple-600 to-purple-700'
            }`}>
              <h2 className="text-xl font-semibold text-white mb-2">
                Confirm Purchase
              </h2>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  {selectedProduct.name === 'WAEC' ? 
                    <GraduationCap className="w-6 h-6 text-white" /> : 
                    <BookOpen className="w-6 h-6 text-white" />
                  }
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {selectedProduct.name}
                  </p>
                  <p className="text-white/80 text-sm">Result Checker Card</p>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="space-y-3 mb-6">
                <div className={`flex justify-between items-center p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Price
                  </span>
                  <span className="font-semibold">GHS {selectedProduct.price.toFixed(2)}</span>
                </div>
                
                <div className={`flex justify-between items-center p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Your Balance
                  </span>
                  <span className={`font-semibold ${
                    userBalance >= selectedProduct.price ? 'text-green-500' : 'text-red-500'
                  }`}>
                    GHS {userBalance.toFixed(2)}
                  </span>
                </div>
                
                <div className={`flex justify-between items-center p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    After Purchase
                  </span>
                  <span className="font-semibold">
                    GHS {(userBalance - selectedProduct.price).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {userBalance < selectedProduct.price && (
                <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-700 dark:text-red-300 font-medium text-sm">
                      Insufficient Balance
                    </p>
                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                      Please top up your wallet to continue.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSelectedProduct(null);
                  }}
                  className={`flex-1 px-5 py-3 rounded-lg font-medium transition-all duration-200 ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  disabled={processingPurchase}
                >
                  Cancel
                </button>
                
                <button
                  onClick={handlePurchase}
                  disabled={userBalance < selectedProduct.price || processingPurchase}
                  className={`flex-1 px-5 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    userBalance >= selectedProduct.price && !processingPurchase
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  {processingPurchase ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-xl overflow-hidden ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-2xl`}>
            {/* Modal Header */}
            <div className={`p-6 ${
              selectedPurchase.checkerType === 'WAEC' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                : 'bg-gradient-to-r from-purple-600 to-purple-700'
            } relative`}>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPurchase(null);
                  setShowPin(false);
                }}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              >
                <XCircle className="w-5 h-5 text-white" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-lg">
                  {selectedPurchase.checkerType === 'WAEC' ? 
                    <GraduationCap className="w-8 h-8 text-white" /> : 
                    <BookOpen className="w-8 h-8 text-white" />
                  }
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {selectedPurchase.checkerType} Result Checker
                  </h2>
                  <p className="text-white/80 text-sm mt-1">Purchase Details</p>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {/* Important Notice */}
              <div className={`mb-4 p-3 rounded-lg ${
                darkMode 
                  ? 'bg-blue-900/30 border border-blue-700/50' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-start gap-2">
                  <Shield className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                  <p className={`text-sm ${
                    darkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    Your credentials are secure. Copy and save them for checking your results.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Reference */}
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <p className={`text-xs mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Reference
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono font-semibold">
                      {selectedPurchase.purchaseReference}
                    </p>
                    <button
                      onClick={() => copyToClipboard(selectedPurchase.purchaseReference, 'reference')}
                      className={`p-1.5 rounded transition-colors ${
                        darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Serial Number */}
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <p className={`text-xs mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Serial Number
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {selectedPurchase.serialNumber}
                    </p>
                    <button
                      onClick={() => copyToClipboard(selectedPurchase.serialNumber, 'serial')}
                      className={`p-1.5 rounded transition-colors ${
                        darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* PIN */}
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <p className={`text-xs mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    PIN
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono font-semibold text-green-600 dark:text-green-400">
                      {showPin ? selectedPurchase.pin : '••••••••••••'}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setShowPin(!showPin)}
                        className={`p-1.5 rounded transition-colors ${
                          darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(selectedPurchase.pin, 'pin')}
                        className={`p-1.5 rounded transition-colors ${
                          darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className={`text-xs mb-1 ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Amount
                    </p>
                    <p className="font-semibold">GHS {selectedPurchase.price.toFixed(2)}</p>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className={`text-xs mb-1 ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Status
                    </p>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="font-semibold capitalize">{selectedPurchase.status}</p>
                    </div>
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <p className={`text-xs mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Purchase Date
                  </p>
                  <p className="font-medium text-sm">{formatDate(selectedPurchase.createdAt)}</p>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 pt-3">
                  <button className="flex-1 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Download Receipt
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedPurchase(null);
                      setShowPin(false);
                    }}
                    className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx global>{`
        .dark-mode {
          background-color: #0f172a;
          color: #f1f5f9;
        }
      `}</style>
    </div>
  );
};

export default UserResultCheckers;