'use client'
import React, { useState, useEffect } from 'react';
import { CreditCard, Package, Database, DollarSign, TrendingUp, Calendar, AlertCircle, PlusCircle, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnimatedCounter, CurrencyCounter } from './Animation'; // Adjust the import path as necessary'

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

  const ViewAll = () => {
    router.push('/orders');
  };

  const navigateToTransactions = () => {
    router.push('/myorders');
  };

  const navigateToTopup = () => {
    router.push('/topup');
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Dashboard Content */}
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        {/* User Greeting - Optimized for Ghana */}
        <div className="mb-4 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-lg shadow-md overflow-hidden">
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
              <div className="bg-white p-2 rounded-full shadow-md">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
              </div>
            </div>
            
            <div className="flex mt-2 space-x-2 sm:space-x-3">
              <button 
                onClick={() => router.push('/orders')}
                className="inline-flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-white text-yellow-500 font-medium rounded-md shadow-md hover:bg-gray-50 transition-colors duration-300 text-xs sm:text-sm"
              >
                <Calendar className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                Orders
              </button>
              <button 
                onClick={navigateToTransactions}
                className="inline-flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-white text-yellow-500 font-medium rounded-md shadow-md hover:bg-gray-50 transition-colors duration-300 text-xs sm:text-sm"
              >
                <AlertCircle className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                Transactions
              </button>
            </div>
          </div>
        </div>
        
        {/* Quick Order Buttons */}
        <div className="mb-4 bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="h-1 sm:h-2 bg-gradient-to-r from-yellow-400 via-red-500 to-blue-600"></div>
          <div className="p-3 sm:p-5">
            <h2 className="text-sm sm:text-lg font-bold text-gray-900 mb-2 sm:mb-4">Place New Order</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* MTN Button */}
              <button 
                onClick={() => navigateToNetwork('mtn')}
                className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 transform hover:scale-105"
                style={{ backgroundColor: `${mtnYellow}20` }}
              >
                <div className="w-8 h-8 sm:w-16 sm:h-16 rounded-full bg-yellow-400 flex items-center justify-center mb-1 sm:mb-2 shadow-md">
                  <span className="text-white font-bold text-xs sm:text-xl">MTN</span>
                </div>
                <span className="font-medium text-gray-800 text-xs sm:text-sm text-center">MTN Data</span>
              </button>
              
              {/* AirtelTigo Button */}
              <button 
                onClick={() => navigateToNetwork('airteltigo')}
                className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 transform hover:scale-105"
                style={{ backgroundColor: `${airtelTigoBlue}10` }}
              >
                <div className="w-8 h-8 sm:w-16 sm:h-16 rounded-full bg-blue-700 flex items-center justify-center mb-1 sm:mb-2 shadow-md">
                  <span className="text-white font-bold text-xs sm:text-lg">ATigo</span>
                </div>
                <span className="font-medium text-gray-800 text-xs sm:text-sm text-center">ATigo Data</span>
              </button>
              
              {/* Telecel Button */}
              <button 
                onClick={() => navigateToNetwork('telecel')}
                className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 transform hover:scale-105"
                style={{ backgroundColor: `${telecelRed}10` }}
              >
                <div className="w-8 h-8 sm:w-16 sm:h-16 rounded-full bg-red-600 flex items-center justify-center mb-1 sm:mb-2 shadow-md">
                  <span className="text-white font-bold text-xs sm:text-xl">Tel</span>
                </div>
                <span className="font-medium text-gray-800 text-xs sm:text-sm text-center">Telecel Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Stats - Account Balance and Orders Today */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="h-1 sm:h-2" style={{ backgroundColor: mtnYellow }}></div>
          <div className="p-3 sm:p-5">
            <h2 className="text-sm sm:text-lg font-bold text-gray-900 mb-2 sm:mb-4">Key Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
              {/* Account Balance Box */}
              <div className="rounded-lg p-2 sm:p-4 flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-300" 
                   style={{ backgroundColor: `${mtnYellow}20` }}>
                <CreditCard className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" style={{ color: mtnYellow }} />
                <span className="text-xs sm:text-sm font-medium text-gray-600">Balance</span>
                <span className="text-sm sm:text-xl font-bold text-gray-900 mt-1">
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
                <span className="text-xs sm:text-sm font-medium text-gray-600">Orders Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-sm sm:text-xl font-bold text-gray-900">
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
                <span className="text-xs sm:text-sm font-medium text-gray-600">GB Sold Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-sm sm:text-xl font-bold text-gray-900">
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
                <span className="text-xs sm:text-sm font-medium text-gray-600">Revenue Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-sm sm:text-xl font-bold text-gray-900">
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
        
        {/* Rest of your component remains unchanged */}
        {/* Deposit Notification */}
        <div className="mb-4 bg-white rounded-lg shadow-md overflow-hidden border-l-4 hover:shadow-lg transition-shadow duration-300" style={{ borderLeftColor: "#ffcc00" }}>
          <div className="p-2 sm:p-4 flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            </div>
            <div className="ml-2 sm:ml-3 w-full">
              <div className="flex justify-between items-center">
                <h3 className="text-xs sm:text-md font-medium text-gray-900">Add Funds to Your Account</h3>
              </div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500">
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
        <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="h-1 sm:h-2" style={{ backgroundColor: mtnYellow }}></div>
          <div className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h2 className="text-sm sm:text-lg font-bold text-gray-900">Recent Transactions</h2>
              <button className="text-xs sm:text-sm hover:text-yellow-600 font-medium flex items-center transition-colors duration-300" style={{ color: mtnYellow }} onClick={ViewAll}>
                View All 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone #
                    </th>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net
                    </th>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentTransactions.length > 0 ? (
                    stats.recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{transaction.customer}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{transaction.method}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-500">{transaction.time}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {transaction.network === 'YELLO' ? 'MTN' : 
                             transaction.network === 'AT_PREMIUM' || transaction.network === 'airteltigo' || transaction.network === 'at' ? 'AT' : 
                             transaction.network === 'TELECEL' ? 'Tel' : 
                             transaction.network}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900">{transaction.gb}GB</div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{formatCurrency(transaction.amount)}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-2 sm:px-4 py-2 sm:py-4 text-center text-xs sm:text-sm text-gray-500">
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
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="h-1 sm:h-2" style={{ backgroundColor: mtnYellow }}></div>
          <div className="p-3 sm:p-5">
            <h2 className="text-sm sm:text-lg font-bold text-gray-900 mb-2 sm:mb-4">Quick Actions</h2>
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
                onClick={navigateToTopup}
                className="rounded-lg p-2 sm:p-4 flex flex-col items-center transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <PlusCircle className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium">Deposit</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;