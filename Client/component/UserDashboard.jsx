'use client'
import React, { useState, useEffect } from 'react';
import { CreditCard, Package, Database, DollarSign, TrendingUp, Calendar, AlertCircle, PlusCircle, User, BarChart2, ChevronDown, ChevronUp, Clock, Eye, Globe, Zap, Activity, Sparkles, ArrowUpRight, Star, Target, Flame, Award, Shield } from 'lucide-react';
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          {/* Epic Loading Animation */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200/20"></div>
            {/* Spinning gradient ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-400 border-r-teal-400 animate-spin"></div>
            {/* Inner pulsing circle */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse flex items-center justify-center">
              <Zap className="w-8 h-8 text-white animate-bounce" strokeWidth={2.5} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-transparent bg-clip-text animate-pulse">
              DATAHUSTLE
            </h1>
            <div className="flex items-center justify-center space-x-2 text-emerald-300">
              <Sparkles className="w-5 h-5 animate-spin" />
              <span className="text-lg font-bold">Preparing your hustle zone...</span>
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-400/10 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/10 to-pink-400/10 blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-400/5 to-blue-400/5 blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Hero Section - Completely New Design */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-black/10">
              <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Star className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-white animate-bounce" />
              </div>
            </div>
            
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-6 lg:mb-0">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h1 className="text-5xl font-black text-white tracking-tight">DATAHUSTLE</h1>
                      <p className="text-white/80 text-lg font-medium">Hustle Mode: Activated</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white">
                      {getGreeting()}, {userName}! 🚀
                    </h2>
                    <p className="text-xl text-white/90 font-medium">
                      Ready to dominate your {getEnglishGreeting().toLowerCase()}?
                    </p>
                  </div>
                </div>
                
                {/* Action Buttons - New Layout */}
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:w-64">
                  <button 
                    onClick={navigateToTopup}
                    className="group bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-bold py-4 px-6 rounded-2xl border border-white/30 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    <Zap className="w-6 h-6 group-hover:animate-pulse" />
                    <span>Power Up</span>
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                  
                  <button 
                    onClick={() => router.push('/orders')}
                    className="group bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-bold py-4 px-6 rounded-2xl border border-white/30 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    <Target className="w-6 h-6 group-hover:animate-spin" />
                    <span>Orders</span>
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid - Completely Redesigned */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Balance Card - Hero Style */}
            <div className="lg:col-span-2 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-4 right-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-white/80 text-lg font-medium">Account Balance</p>
                    <p className="text-white text-sm">Available funds</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-4xl font-black text-white">
                    {animateStats ? 
                      <CurrencyCounter value={stats.balance} duration={1500} /> : 
                      formatCurrency(0)
                    }
                  </div>
                  <button
                    onClick={navigateToTopup}
                    className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl border border-white/30 transition-all duration-300 transform hover:scale-105"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Add Funds</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Orders Today */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-400/20 blur-xl"></div>
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-white">
                      {animateStats ? 
                        <AnimatedCounter value={stats.todayOrders} duration={1200} /> : 
                        "0"
                      }
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-white font-bold text-lg">Orders Today</p>
                  <p className="text-white/70 text-sm">Active transactions</p>
                </div>
              </div>
            </div>

            {/* Revenue Today */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-xl"></div>
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">
                      {animateStats ? 
                        <CurrencyCounter value={stats.todayRevenue} duration={1500} /> : 
                        formatCurrency(0)
                      }
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-white font-bold text-lg">Revenue Today</p>
                  <p className="text-white/70 text-sm">Total earnings</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Network Selection - Card Grid Design */}
        <div className="mb-8">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Quick Order</h2>
                <p className="text-white/70">Choose your network and start hustling</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* MTN */}
              <button 
                onClick={() => navigateToNetwork('mtn')}
                className="group bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 shadow-xl relative overflow-hidden"
              >
                <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full bg-white/20 blur-xl"></div>
                <div className="relative z-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-lg font-black text-white">MTN</span>
                  </div>
                  <div>
                    <p className="text-white font-bold">MTN Data</p>
                    <p className="text-white/80 text-sm">Fastest network</p>
                  </div>
                </div>
              </button>

              {/* AirtelTigo */}
              <button 
                onClick={() => navigateToNetwork('airteltigo')}
                className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 shadow-xl relative overflow-hidden"
              >
                <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full bg-white/20 blur-xl"></div>
                <div className="relative z-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-sm font-black text-white">ATigo</span>
                  </div>
                  <div>
                    <p className="text-white font-bold">AirtelTigo</p>
                    <p className="text-white/80 text-sm">Reliable choice</p>
                  </div>
                </div>
              </button>

              {/* Telecel */}
              <button 
                onClick={() => navigateToNetwork('telecel')}
                className="group bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 shadow-xl relative overflow-hidden"
              >
                <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full bg-white/20 blur-xl"></div>
                <div className="relative z-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-lg font-black text-white">TEL</span>
                  </div>
                  <div>
                    <p className="text-white font-bold">Telecel</p>
                    <p className="text-white/80 text-sm">Growing strong</p>
                  </div>
                </div>
              </button>

              {/* Foreign Numbers */}
              <button 
                onClick={navigateToVerificationServices}
                className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 shadow-xl relative overflow-hidden"
              >
                <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full bg-white/20 blur-xl"></div>
                <div className="relative z-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Globe className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-white font-bold">Global</p>
                    <p className="text-white/80 text-sm">Worldwide reach</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity - Modern Table */}
        <div className="mb-8">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden">
            <div className="p-8 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Recent Activity</h2>
                    <p className="text-white/70">Your latest transactions</p>
                  </div>
                </div>
                
                <button 
                  onClick={ViewAll}
                  className="group flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl border border-white/20 transition-all duration-300 transform hover:scale-105"
                >
                  <span>View All</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            </div>
            
            <div className="p-8">
              {stats.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentTransactions.map((transaction, index) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                          <Database className="w-5 h-5 text-white" strokeWidth={2} />
                        </div>
                        <div>
                          <p className="text-white font-bold">{transaction.customer}</p>
                          <p className="text-white/70 text-sm">{transaction.gb}GB • {transaction.method}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-white font-bold">{formatCurrency(transaction.amount)}</p>
                        <p className="text-white/70 text-sm">{transaction.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                    <Database className="w-6 h-6 text-white/50" />
                  </div>
                  <p className="text-white/70 text-lg font-medium">No transactions yet</p>
                  <p className="text-white/50">Start your hustle journey!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions - Floating Action Grid */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: Package, label: 'New Order', path: '/datamart', color: 'from-emerald-400 to-teal-500' },
            { icon: BarChart2, label: 'Analytics', path: '/reports', color: 'from-blue-400 to-indigo-500' },
            { icon: Clock, label: 'History', path: '/orders', color: 'from-purple-400 to-pink-500' },
            { icon: CreditCard, label: 'Top Up', onClick: navigateToTopup, color: 'from-yellow-400 to-orange-500' },
            { icon: AlertCircle, label: 'Support', path: '/support', color: 'from-red-400 to-red-500' },
            { icon: User, label: 'Profile', path: '/profile', color: 'from-gray-400 to-gray-500' }
          ].map((action, index) => (
            <button
              key={index}
              onClick={action.onClick || (() => router.push(action.path))}
              className={`group bg-gradient-to-br ${action.color} hover:scale-105 rounded-2xl p-6 transition-all duration-300 transform shadow-xl relative overflow-hidden`}
            >
              <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-white/20 blur-lg"></div>
              <div className="relative z-10 text-center space-y-2">
                <action.icon className="w-6 h-6 text-white mx-auto group-hover:scale-110 transition-transform" strokeWidth={2} />
                <p className="text-white font-bold text-sm">{action.label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;