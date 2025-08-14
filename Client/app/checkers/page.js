'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ChevronLeft, Wallet, ShoppingBag, Clock, CheckCircle, XCircle, Sun, Moon, Copy, Eye, EyeOff, Download, CreditCard, AlertCircle, Code2, Sparkles, ExternalLink } from 'lucide-react';

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
      
      // Add visual properties to products
      const productsWithVisuals = response.data.data.map(product => ({
        ...product,
        color: product.name === 'WAEC' ? 'from-blue-500 to-blue-700' : 'from-purple-500 to-purple-700',
        bgPattern: product.name === 'WAEC' ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-gradient-to-br from-purple-50 to-purple-100',
        icon: product.name === 'WAEC' ? '🎓' : '📚'
      }));
      
      setProducts(productsWithVisuals);
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

  // WAEC Logo SVG Component
  const WAECLogo = ({ className }) => (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="90" fill="url(#waec-gradient)" />
      <defs>
        <linearGradient id="waec-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
      <text x="100" y="90" fontSize="24" fontWeight="bold" fill="white" textAnchor="middle">WAEC</text>
      <path d="M50 120 L100 140 L150 120" stroke="white" strokeWidth="3" fill="none" />
      <circle cx="100" cy="120" r="5" fill="white" />
    </svg>
  );

  // BECE Logo SVG Component
  const BECELogo = ({ className }) => (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="180" height="180" rx="20" fill="url(#bece-gradient)" />
      <defs>
        <linearGradient id="bece-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <text x="100" y="90" fontSize="24" fontWeight="bold" fill="white" textAnchor="middle">BECE</text>
      <rect x="60" y="110" width="80" height="50" rx="5" fill="white" fillOpacity="0.3" />
      <circle cx="100" cy="135" r="8" fill="white" />
    </svg>
  );

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
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
    <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}>
      <Head>
        <title>Result Checkers - WAEC & BECE</title>
      </Head>

      {/* Animated Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 ${darkMode ? 'bg-blue-500/10' : 'bg-blue-500/5'} rounded-full blur-3xl animate-pulse`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 ${darkMode ? 'bg-purple-500/10' : 'bg-purple-500/5'} rounded-full blur-3xl animate-pulse animation-delay-2000`} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
          <div className="animate-fadeIn">
            <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
              <span className="text-5xl">📝</span>
              Result Checkers
            </h1>
            <p className={`text-lg mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Purchase WAEC and BECE result checkers instantly
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 animate-slideInRight">
            {/* Balance Card */}
            <div className={`px-6 py-4 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-white to-gray-50'} shadow-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} animate-float`}>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${darkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                  <Wallet className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Wallet Balance</p>
                  <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-green-600">
                    GHS {userBalance.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${
                darkMode 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 shadow-lg shadow-yellow-500/25' 
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
              }`}
            >
              {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
            
            {/* Back Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Dashboard
            </button>
          </div>
        </div>

        {/* Animated Tabs */}
        <div className="flex gap-2 mb-8">
          {['buy', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl shadow-blue-500/25'
                  : darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                  : 'bg-white hover:bg-gray-50 text-gray-600 shadow-md'
              }`}
            >
              <div className="flex items-center gap-2">
                {tab === 'buy' ? <ShoppingBag className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                {tab === 'buy' ? 'Buy Checkers' : 'My Purchases'}
              </div>
            </button>
          ))}
        </div>

        {/* API Promotion Section */}
        <div className="mb-8 animate-slideInUp">
          <div className={`relative overflow-hidden rounded-2xl ${
            darkMode 
              ? 'bg-gradient-to-r from-indigo-900/50 via-purple-900/50 to-pink-900/50' 
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
          } p-1`}>
            <div className={`rounded-xl ${darkMode ? 'bg-gray-900' : 'bg-white'} p-6`}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    darkMode 
                      ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20' 
                      : 'bg-gradient-to-br from-indigo-100 to-purple-100'
                  }`}>
                    <Code2 className={`w-8 h-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Are You a Developer?
                      </h3>
                      <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Integrate WAEC & BECE result checker sales into your platform with our API
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => router.push('/checkers-doc')}
                  className="group px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 flex items-center gap-2"
                >
                  <span>View API Documentation</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              
              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-50'
                }`}>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    RESTful API Integration
                  </span>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-50'
                }`}>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Real-time Webhooks
                  </span>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-50'
                }`}>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Instant SMS Delivery
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {purchaseSuccess && (
          <div className="mb-8 animate-bounceIn">
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-green-900/50 to-green-800/50' : 'bg-gradient-to-r from-green-50 to-green-100'} border ${darkMode ? 'border-green-700' : 'border-green-300'} shadow-xl`}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-500 rounded-full animate-pulse">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-green-300' : 'text-green-800'} mb-3`}>
                    Purchase Successful! 🎉
                  </h3>
                  <div className={`space-y-2 ${darkMode ? 'text-green-200' : 'text-green-700'}`}>
                    <p><strong>Type:</strong> {purchaseSuccess.checkerType}</p>
                    <p><strong>Serial:</strong> <span className="font-mono bg-white/20 px-2 py-1 rounded">{purchaseSuccess.serialNumber}</span></p>
                    <p><strong>PIN:</strong> <span className="font-mono bg-white/20 px-2 py-1 rounded">{purchaseSuccess.pin}</span></p>
                    <p className="text-sm mt-3 italic">📱 Check your SMS for details!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 absolute top-0 left-0" style={{ animationDelay: '-0.5s', animationDirection: 'reverse' }}></div>
            </div>
          </div>
        ) : (
          <>
            {/* Buy Tab */}
            {activeTab === 'buy' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                  {products.map((product, index) => (
                    <div
                      key={product._id}
                      className={`group relative overflow-hidden rounded-3xl transition-all duration-500 transform hover:scale-105 hover:-rotate-1 animate-slideInUp`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Card Background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${product.color} opacity-90`} />
                      
                      {/* Pattern Overlay */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)`
                        }} />
                      </div>
                      
                      {/* Content */}
                      <div className="relative p-8 text-white">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            {product.name === 'WAEC' ? 
                              <WAECLogo className="w-20 h-20 animate-float" /> : 
                              <BECELogo className="w-20 h-20 animate-float" />
                            }
                            <div>
                              <h3 className="text-3xl font-bold mb-2">{product.name}</h3>
                              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                                product.available 
                                  ? 'bg-green-400/20 text-green-100 border border-green-400/30' 
                                  : 'bg-red-400/20 text-red-100 border border-red-400/30'
                              }`}>
                                {product.available ? (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    {product.stockCount} Available
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4" />
                                    Out of Stock
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Description */}
                        <p className="text-white/90 mb-8 text-lg leading-relaxed">
                          {product.description}
                        </p>
                        
                        {/* Price and Action */}
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-white/70 text-sm mb-1">Price</p>
                            <p className="text-4xl font-bold">
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
                            className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-110 ${
                              product.available
                                ? 'bg-white text-gray-900 hover:shadow-2xl hover:shadow-white/25'
                                : 'bg-gray-400/30 text-gray-200 cursor-not-allowed'
                            }`}
                          >
                            {product.available ? 'Buy Now' : 'Unavailable'}
                          </button>
                        </div>
                        
                        {/* Decorative Elements */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                      </div>
                    </div>
                  ))}

                  {products.length === 0 && (
                    <div className="col-span-2 text-center py-20">
                      <div className="text-6xl mb-4">🔍</div>
                      <p className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        No products available at the moment.
                      </p>
                    </div>
                  )}
                </div>

                {/* Developer Integration Section - Now inside Buy tab */}
                {products.length > 0 && (
                  <div className={`mt-12 text-center p-8 rounded-2xl ${
                    darkMode ? 'bg-gray-800' : 'bg-gradient-to-br from-gray-50 to-gray-100'
                  } border-2 border-dashed ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                    <Code2 className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Developer? Integrate Our API
                    </h3>
                    <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Add result checker sales to your platform • Set your own prices • Manage via API
                    </p>
                    <button
                      onClick={() => router.push('/checkers-doc')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                    >
                      <span>View API Documentation</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="animate-fadeIn">
                {myPurchases.length > 0 ? (
                  <div className="grid gap-4">
                    {myPurchases.map((purchase, index) => (
                      <div
                        key={purchase._id}
                        className={`group p-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] animate-slideInUp ${
                          darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'
                        } shadow-lg hover:shadow-2xl`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          {/* Left Section */}
                          <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl ${
                              purchase.checkerType === 'WAEC' 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                                : 'bg-gradient-to-br from-purple-500 to-purple-600'
                            }`}>
                              <span className="text-3xl text-white">
                                {purchase.checkerType === 'WAEC' ? '🎓' : '📚'}
                              </span>
                            </div>
                            
                            <div>
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Reference: {purchase.purchaseReference}
                              </p>
                              <h4 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {purchase.checkerType} Result Checker
                              </h4>
                              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {formatDate(purchase.createdAt)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Right Section */}
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Amount</p>
                              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                GHS {purchase.price.toFixed(2)}
                              </p>
                            </div>
                            
                            <button
                              onClick={() => {
                                setSelectedPurchase(purchase);
                                setShowDetailsModal(true);
                              }}
                              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/25"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-20 rounded-3xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
                    <div className="text-6xl mb-4 animate-bounce">📭</div>
                    <p className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                      No purchases yet. Buy your first result checker!
                    </p>
                    <button
                      onClick={() => setActiveTab('buy')}
                      className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
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

      {/* Purchase Modal */}
      {showPurchaseModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-300 animate-slideInUp ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Modal Header with Gradient */}
            <div className={`p-8 bg-gradient-to-br ${selectedProduct.color} text-white relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)`
                }} />
              </div>
              
              <div className="relative">
                <h2 className="text-2xl font-bold mb-2">Confirm Purchase</h2>
                <p className="text-white/90">You're about to purchase</p>
                <div className="mt-4 flex items-center gap-3">
                  {selectedProduct.name === 'WAEC' ? 
                    <WAECLogo className="w-16 h-16" /> : 
                    <BECELogo className="w-16 h-16" />
                  }
                  <div>
                    <p className="text-3xl font-bold">{selectedProduct.name}</p>
                    <p className="text-white/80">Result Checker</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className={`p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="space-y-4 mb-6">
                <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Price:</span>
                  <span className="font-bold text-xl">GHS {selectedProduct.price.toFixed(2)}</span>
                </div>
                
                <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Your Balance:</span>
                  <span className={`font-bold text-xl ${userBalance >= selectedProduct.price ? 'text-green-500' : 'text-red-500'}`}>
                    GHS {userBalance.toFixed(2)}
                  </span>
                </div>
                
                <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>After Purchase:</span>
                  <span className="font-bold text-xl">
                    GHS {(userBalance - selectedProduct.price).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {userBalance < selectedProduct.price && (
                <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-red-700 dark:text-red-300 font-semibold">Insufficient Balance</p>
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                      Please top up your wallet before purchasing.
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
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  disabled={processingPurchase}
                >
                  Cancel
                </button>
                
                <button
                  onClick={handlePurchase}
                  disabled={userBalance < selectedProduct.price || processingPurchase}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                    userBalance >= selectedProduct.price && !processingPurchase
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25 transform hover:scale-105'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  {processingPurchase ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Confirm Purchase
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-300 animate-slideInUp ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`p-8 bg-gradient-to-br ${
              selectedPurchase.checkerType === 'WAEC' 
                ? 'from-blue-500 to-blue-700' 
                : 'from-purple-500 to-purple-700'
            } text-white relative`}>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPurchase(null);
                  setShowPin(false);
                }}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-4">
                {selectedPurchase.checkerType === 'WAEC' ? 
                  <WAECLogo className="w-20 h-20" /> : 
                  <BECELogo className="w-20 h-20" />
                }
                <div>
                  <h2 className="text-2xl font-bold">{selectedPurchase.checkerType} Result Checker</h2>
                  <p className="text-white/80 mt-1">Purchase Details</p>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className={`p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="space-y-4">
                {/* Reference */}
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Reference Number</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono font-bold text-lg">{selectedPurchase.purchaseReference}</p>
                    <button
                      onClick={() => copyToClipboard(selectedPurchase.purchaseReference, 'reference')}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                      }`}
                    >
                      {copiedText === 'reference' ? 
                        <CheckCircle className="w-5 h-5 text-green-500" /> : 
                        <Copy className="w-5 h-5" />
                      }
                    </button>
                  </div>
                </div>
                
                {/* Serial Number */}
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Serial Number</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono font-bold text-lg text-blue-500">{selectedPurchase.serialNumber}</p>
                    <button
                      onClick={() => copyToClipboard(selectedPurchase.serialNumber, 'serial')}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                      }`}
                    >
                      {copiedText === 'serial' ? 
                        <CheckCircle className="w-5 h-5 text-green-500" /> : 
                        <Copy className="w-5 h-5" />
                      }
                    </button>
                  </div>
                </div>
                
                {/* PIN */}
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>PIN</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono font-bold text-lg text-green-500">
                      {showPin ? selectedPurchase.pin : '••••••••••'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPin(!showPin)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                      >
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(selectedPurchase.pin, 'pin')}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                      >
                        {copiedText === 'pin' ? 
                          <CheckCircle className="w-5 h-5 text-green-500" /> : 
                          <Copy className="w-5 h-5" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Amount Paid</p>
                    <p className="font-bold text-lg">GHS {selectedPurchase.price.toFixed(2)}</p>
                  </div>
                  
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Status</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <p className="font-bold text-lg capitalize">{selectedPurchase.status}</p>
                    </div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Purchase Date</p>
                  <p className="font-semibold">{formatDate(selectedPurchase.createdAt)}</p>
                </div>
                
                {/* Warning Message */}
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-300'}`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className={`font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>Important</p>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        Keep your serial number and PIN safe. You'll need them to check your results on the official website.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    Download Receipt
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedPurchase(null);
                      setShowPin(false);
                    }}
                    className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
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

      {/* Floating API Button - Always Visible */}
      <div className="fixed bottom-6 right-6 z-40 animate-bounceIn">
        <div className="relative group">
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className={`px-3 py-2 rounded-lg shadow-lg whitespace-nowrap ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-gray-900 text-white'
            }`}>
              <p className="text-xs font-medium">For Developers</p>
              <p className="text-xs opacity-90">Integrate with your platform</p>
            </div>
            <div className={`absolute bottom-[-4px] right-6 w-2 h-2 rotate-45 ${
              darkMode ? 'bg-gray-800' : 'bg-gray-900'
            }`} />
          </div>
          
          {/* Button */}
          <button
            onClick={() => router.push('/checkers-doc')}
            className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-110"
          >
            <Code2 className="w-5 h-5" />
            <span className="font-semibold">API Integration</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
          </button>
        </div>
      </div>

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
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInRight {
          from { 
            opacity: 0;
            transform: translateX(20px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes bounceIn {
          0% { 
            opacity: 0;
            transform: scale(0.3);
          }
          50% { 
            transform: scale(1.05);
          }
          70% { 
            transform: scale(0.9);
          }
          100% { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.5s ease-out;
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out;
        }
        
        .animate-bounceIn {
          animation: bounceIn 0.6s ease-out;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};

export default UserResultCheckers;