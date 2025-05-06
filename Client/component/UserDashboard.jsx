'use client'
import React, { useState, useEffect } from 'react';
import { CreditCard, Package, Database, DollarSign, TrendingUp, Calendar, AlertCircle, PlusCircle, User, BarChart2, ChevronDown, ChevronUp, Clock, Eye, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnimatedCounter, CurrencyCounter } from './Animation'; // Adjust the import path as necessary
import DailySalesChart from '@/app/week/page';

const DashboardPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({
    balance: 0,
    todayOrders: 0,
    todayGbSold: 0,
    todayRevenue: 0,
    recentTransactions: []
  });
  
  // Add a state to control animation start
  const [animateStats, setAnimateStats] = useState(false);
  // Add state to control sales chart visibility
  const [showSalesChart, setShowSalesChart] = useState(false);
  // Add state for sales chart time period
  const [salesPeriod, setSalesPeriod] = useState('7d');

  const ViewAll = () => {
    router.push('/orders');
  };

  const navigateToTransactions = () => {
    router.push('/myorders');
  };

  const navigateToTopup = () => {
    router.push('/topup');
  };
  
  const navigateToregisterFriend = () => {
    router.push('/registerFriend');
  }
  
  const navigateToVerificationServices = () => {
    router.push('/verification-services');
  }

  const navigateToNetwork = (network) => {
    switch(network) {
      case 'mtn':
        router.push('/mtnup2u');
        break;
      case 'airteltigo':
        router.push('/at-ishare');
        break;
      case 'telecel':
        router.push('/TELECEL');
        break;
      default:
        router.push('/');
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    // Fetch user data from localStorage
    const userDataString = localStorage.getItem('userData');
    if (!userDataString) {
      router.push('/SignUp');
      return;
    }

    const userData = JSON.parse(userDataString);
    setUserName(userData.name || 'User');
    fetchDashboardData(userData.id);
  }, [router]);

  // Fetch dashboard data from API
  const fetchDashboardData = async (userId) => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');
      
      const response = await fetch(`https://datamartbackened.onrender.com/api/v1/data/user-dashboard/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const responseData = await response.json();
      
      if (responseData.status === 'success') {
        // Map API data to our stats state
        const { userBalance, todayOrders } = responseData.data;
        
        setStats({
          balance: userBalance,
          todayOrders: todayOrders.count,
          todayGbSold: todayOrders.totalGbSold,
          todayRevenue: todayOrders.totalValue,
          recentTransactions: todayOrders.orders.map(order => ({
            id: order._id,
            customer: order.phoneNumber,
            method: order.method,
            amount: order.price,
            gb: formatDataCapacity(order.capacity),
            time: new Date(order.createdAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            network: order.network
          }))
        });
        
        // Set loading to false first
        setLoading(false);
        
        // Delay animation start slightly for better UX
        setTimeout(() => {
          setAnimateStats(true);
        }, 300);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // You might want to show an error message to the user
      setLoading(false);
    }
  };

  // Helper function to format data capacity (convert to GB if needed)
  const formatDataCapacity = (capacity) => {
    if (capacity >= 1000) {
      return (capacity / 1000).toFixed(1);
    }
    return capacity;
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Get greeting based on time of day - Ghana time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Mema wo akye'; // Good Morning in Ghana
    if (hour < 18) return 'Mema wo aha'; // Good Afternoon in Ghana
    return 'Mema wo adwo'; // Good Evening in Ghana
  };

  // Get English greeting
  const getEnglishGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  // MTN Brand color
  const mtnYellow = "#ffcc00";
  
  // Telecel brand color
  const telecelRed = "#e60000";
  
  // AirtelTigo brand color
  const airtelTigoBlue = "#0033a0";

  // Toggle sales chart visibility
  const toggleSalesChart = () => {
    setShowSalesChart(!showSalesChart);
  };

  // Handle time period change for sales data
  const handleSalesPeriodChange = (period) => {
    setSalesPeriod(period);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 rounded-full border-4 border-yellow-100 dark:border-yellow-900"></div>
            <div className="absolute top-0 w-16 h-16 rounded-full border-4 border-transparent border-t-yellow-400 dark:border-t-yellow-500 animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      {/* Dashboard Content */}
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        {/* User Greeting - Optimized for Ghana */}
        <div className="mb-4 bg-gradient-to-r from-yellow-400 to-yellow-300 dark:from-yellow-600 dark:to-yellow-500 rounded-lg shadow-md overflow-hidden">
          <div className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-1 sm:mb-3">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-white flex flex-col sm:flex-row sm:items-center">
                  <span className="mr-1">{getGreeting()},</span>
                  <span>{userName}!</span>
                </h2>
                <p className="text-white text-opacity-90 text-xs sm:text-sm mt-1">Good {getEnglishGreeting()}! Welcome to Datamart</p>
                <p className="text-white font-bold text-xs mt-1 bg-black bg-opacity-20 inline-block px-2 py-1 rounded-full border border-white shadow-sm">Where Resellers Meet</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-md">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
              </div>
            </div>
            
            <div className="flex mt-2 space-x-2 sm:space-x-3">
              <button 
                onClick={() => router.push('/orders')}
                className="inline-flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-white dark:bg-gray-800 text-yellow-500 font-medium rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300 text-xs sm:text-sm"
              >
                <Calendar className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                Orders
              </button>
              <button 
                onClick={navigateToTransactions}
                className="inline-flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-white dark:bg-gray-800 text-yellow-500 font-medium rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300 text-xs sm:text-sm"
              >
                <AlertCircle className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                Transactions
              </button>

              <button 
                onClick={navigateToregisterFriend}
                className="inline-flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-white dark:bg-gray-800 text-yellow-500 font-medium rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300 text-xs sm:text-sm"
              >
                <User className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                Register an agent
              </button>
            </div>
          </div>
        </div>

        {/* Sales Performance Dashboard - NEW SECTION */}
        <div className="mb-4 sm:mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="h-1 sm:h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 dark:from-yellow-600 dark:via-yellow-500 dark:to-yellow-400"></div>
          
          <div onClick={toggleSalesChart} className="p-3 sm:p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div className="flex items-center">
              <div className="bg-yellow-100 dark:bg-yellow-900 p-2 sm:p-3 rounded-lg mr-3">
                <BarChart2 className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-500 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100">Sales Performance</h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Track your daily sales and revenue analytics</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="hidden sm:flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1 mr-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleSalesPeriodChange('7d'); }} 
                  className={`px-2 py-1 text-xs rounded ${salesPeriod === '7d' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  7D
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleSalesPeriodChange('14d'); }} 
                  className={`px-2 py-1 text-xs rounded ${salesPeriod === '14d' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  14D
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleSalesPeriodChange('30d'); }} 
                  className={`px-2 py-1 text-xs rounded ${salesPeriod === '30d' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  30D
                </button>
              </div>
              <div className="flex items-center text-yellow-500 dark:text-yellow-400">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                <span className="text-xs sm:text-sm mr-1">View</span>
                {showSalesChart ? <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" /> : <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />}
              </div>
            </div>
          </div>
          
          {/* Conditionally render sales chart */}
          {showSalesChart && (
            <div className="p-3 sm:p-5 pt-0 sm:pt-0 border-t border-gray-100 dark:border-gray-700">
              {/* Mobile time selector */}
              <div className="flex sm:hidden items-center justify-center mb-4">
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
                  <button 
                    onClick={() => handleSalesPeriodChange('7d')} 
                    className={`px-3 py-1 text-xs rounded ${salesPeriod === '7d' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    7D
                  </button>
                  <button 
                    onClick={() => handleSalesPeriodChange('14d')} 
                    className={`px-3 py-1 text-xs rounded ${salesPeriod === '14d' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    14D
                  </button>
                  <button 
                    onClick={() => handleSalesPeriodChange('30d')} 
                    className={`px-3 py-1 text-xs rounded ${salesPeriod === '30d' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    30D
                  </button>
                </div>
              </div>
              
              {/* Key sales metrics for the selected period */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">Total Sales</p>
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrency(stats.todayRevenue * (salesPeriod === '7d' ? 7 : salesPeriod === '14d' ? 14 : 30))}</span>
                    <div className="flex items-center text-green-500 text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      <span>12%</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Orders</p>
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{stats.todayOrders * (salesPeriod === '7d' ? 7 : salesPeriod === '14d' ? 14 : 30)}</span>
                    <div className="flex items-center text-green-500 text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      <span>8%</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">GB Sold</p>
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{(stats.todayGbSold * (salesPeriod === '7d' ? 7 : salesPeriod === '14d' ? 14 : 30)).toFixed(1)} GB</span>
                    <div className="flex items-center text-green-500 text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      <span>15%</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Avg Order Value</p>
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrency(stats.todayRevenue / (stats.todayOrders || 1))}</span>
                    <div className="flex items-center text-red-500 text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" transform="rotate(180)" />
                      <span>3%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* The actual sales chart component */}
              <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <DailySalesChart timeRange={salesPeriod === '7d' ? 7 : salesPeriod === '14d' ? 14 : 30} />
              </div>
              
              {/* Last updated info */}
              <div className="mt-3 flex justify-end items-center text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3 mr-1" />
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Quick Order Buttons */}
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="h-1 sm:h-2 bg-gradient-to-r from-yellow-400 via-red-500 to-blue-600"></div>
          <div className="p-3 sm:p-5">
            <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 sm:mb-4">Place New Order</h2>
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {/* MTN Button */}
              <button 
                onClick={() => navigateToNetwork('mtn')}
                className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 transform hover:scale-105"
                style={{ backgroundColor: `${mtnYellow}20` }}
              >
                <div className="w-8 h-8 sm:w-16 sm:h-16 rounded-full bg-yellow-400 flex items-center justify-center mb-1 sm:mb-2 shadow-md">
                  <span className="text-white font-bold text-xs sm:text-xl">MTN</span>
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200 text-xs sm:text-sm text-center">MTN Data</span>
              </button>
              
              {/* AirtelTigo Button */}
              <button 
                onClick={() => navigateToNetwork('airteltigo')}
                className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 transform hover:scale-105"
                style={{ backgroundColor: `${airtelTigoBlue}10` }}
              >
                <div className="w-8 h-8 sm:w-16 sm:h-16 rounded-full bg-blue-700 flex items-center justify-center mb-1 sm:mb-2 shadow-md">
                  <span className="text-white font-bold text-xs sm:text-lg">ATigo</span>
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200 text-xs sm:text-sm text-center">ATigo Data</span>
              </button>
              
              {/* Telecel Button */}
              <button 
                onClick={() => navigateToNetwork('telecel')}
                className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 transform hover:scale-105"
                style={{ backgroundColor: `${telecelRed}10` }}
              >
                <div className="w-8 h-8 sm:w-16 sm:h-16 rounded-full bg-red-600 flex items-center justify-center mb-1 sm:mb-2 shadow-md">
                  <span className="text-white font-bold text-xs sm:text-xl">Tel</span>
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200 text-xs sm:text-sm text-center">Telecel Data</span>
              </button>
              
              {/* Foreign Number Verification - NEW BUTTON */}
              <button 
                onClick={navigateToVerificationServices}
                className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 transform hover:scale-105"
                style={{ backgroundColor: `rgba(75, 85, 99, 0.1)` }} // Gray background
              >
                <div className="w-8 h-8 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-1 sm:mb-2 shadow-md">
                  <Globe className="text-white w-4 h-4 sm:w-8 sm:h-8" />
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200 text-xs sm:text-sm text-center">Foreign Number</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Stats - Account Balance and Orders Today */}
        <div className="mb-4 sm:mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="h-1 sm:h-2" style={{ backgroundColor: mtnYellow }}></div>
          <div className="p-3 sm:p-5">
            <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 sm:mb-4">Key Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
              {/* Account Balance Box */}
              <div className="rounded-lg p-2 sm:p-4 flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-300" 
                   style={{ backgroundColor: `${mtnYellow}20` }}>
                <CreditCard className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" style={{ color: mtnYellow }} />
                <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Balance</span>
                <span className="text-sm sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {animateStats ? 
                    <CurrencyCounter value={stats.balance} duration={1500} /> : 
                    formatCurrency(0)
                  }
                </span>
                <button
                  onClick={navigateToTopup}
                  className="mt-1 sm:mt-2 text-xs font-medium px-2 py-0.5 sm:py-1 rounded-full text-white hover:bg-yellow-500 transition-colors duration-300"
                  style={{ backgroundColor: mtnYellow }}
                >
                  Deposit
                </button>
              </div>
              
              {/* Orders Today Box */}
              <div className="rounded-lg p-2 sm:p-4 flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-300" 
                   style={{ backgroundColor: `${mtnYellow}20` }}>
                <Package className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" style={{ color: mtnYellow }} />
                <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Orders Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-sm sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                    {animateStats ? 
                      <AnimatedCounter value={stats.todayOrders} duration={1200} /> : 
                      "0"
                    }
                  </span>
                </div>
              </div>
              
              {/* GB Sold Today Box */}
              <div className="rounded-lg p-2 sm:p-4 flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-300" 
                   style={{ backgroundColor: `${mtnYellow}20` }}>
                <Database className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" style={{ color: mtnYellow }} />
                <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">GB Sold Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-sm sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                    {animateStats ? 
                      <AnimatedCounter value={stats.todayGbSold} duration={1350} suffix=" GB" decimals={1} /> : 
                      "0 GB"
                    }
                  </span>
                </div>
              </div>
              
              {/* Revenue Today Box */}
              <div className="rounded-lg p-2 sm:p-4 flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-300" 
                   style={{ backgroundColor: `${mtnYellow}20` }}>
                <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" style={{ color: mtnYellow }} />
                <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Revenue Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-sm sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                    {animateStats ? 
                      <CurrencyCounter value={stats.todayRevenue} duration={1500} /> : 
                      formatCurrency(0)
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Deposit Notification */}
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-l-4 hover:shadow-lg transition-shadow duration-300" style={{ borderLeftColor: "#ffcc00" }}>
          <div className="p-2 sm:p-4 flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            </div>
            <div className="ml-2 sm:ml-3 w-full">
              <div className="flex justify-between items-center">
                <h3 className="text-xs sm:text-md font-medium text-gray-900 dark:text-gray-100">Add Funds to Your Account</h3>
              </div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <p>
                  Need more credits? Deposit money into your account.
                </p>
              </div>
              <div className="mt-2 sm:mt-3">
                <button
                  onClick={navigateToTopup}
                  className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 border border-transparent text-xs font-medium rounded-md text-white hover:bg-yellow-500 transition-colors duration-300"
                  style={{ backgroundColor: "#ffcc00" }}
                >
                  Deposit Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mb-4 sm:mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="h-1 sm:h-2" style={{ backgroundColor: mtnYellow }}></div>
          <div className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100">Recent Transactions</h2>
              <button className="text-xs sm:text-sm hover:text-yellow-600 dark:hover:text-yellow-400 font-medium flex items-center transition-colors duration-300" style={{ color: mtnYellow }} onClick={ViewAll}>
                View All 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Phone #
                    </th>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Method
                    </th>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Net
                    </th>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {stats.recentTransactions.length > 0 ? (
                    stats.recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{transaction.customer}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{transaction.method}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{transaction.time}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                            {transaction.network === 'YELLO' ? 'MTN' : 
                             transaction.network === 'AT_PREMIUM' || transaction.network === 'airteltigo' || transaction.network === 'at' ? 'AT' : 
                             transaction.network === 'TELECEL' ? 'Tel' : 
                             transaction.network}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">{transaction.gb}GB</div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(transaction.amount)}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-2 sm:px-4 py-2 sm:py-4 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        No transactions today
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="h-1 sm:h-2" style={{ backgroundColor: mtnYellow }}></div>
          <div className="p-3 sm:p-5">
            <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 sm:mb-4">Quick Actions</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4">
              <button 
                onClick={() => router.push('/datamart')}
                className="rounded-lg p-2 sm:p-4 flex flex-col items-center transition-all duration-300 transform hover:scale-105 hover:shadow-md" 
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <Package className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium">New Order</span>
              </button>
              <button 
                onClick={() => router.push('/reports')}
                className="rounded-lg p-2 sm:p-4 flex flex-col items-center transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium">Reports</span>
              </button>
              <button 
                onClick={() => router.push('/orders')}
                className="rounded-lg p-2 sm:p-4 flex flex-col items-center transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <Database className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium">Data</span>
              </button>

              <button 
                onClick={() => router.push('/topup')}
                className="rounded-lg p-2 sm:p-4 flex flex-col items-center transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <CreditCard className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium">Credit</span>
              </button>
              <button 
                onClick={navigateToTransactions}
                className="rounded-lg p-2 sm:p-4 flex flex-col items-center transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <AlertCircle className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium">Trans</span>
              </button>
              <button 
                onClick={navigateToVerificationServices}
                className="rounded-lg p-2 sm:p-4 flex flex-col items-center transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                style={{ backgroundColor: `rgba(124, 58, 237, 0.1)`, color: '#7c3aed' }}>
                <Globe className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium">Foreign</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;