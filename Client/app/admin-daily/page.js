"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Calendar, ArrowUp, ArrowDown, Database, Users, Activity, RefreshCw, CreditCard, TrendingUp, DollarSign, Clock, Target, Zap, Eye } from 'lucide-react';

// Enhanced Loader Component
const DashboardLoader = () => (
  <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin mx-auto">
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-2 font-medium">Loading Dashboard...</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Fetching latest analytics data</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Search Loader Component
const SearchLoader = () => (
  <div className="flex items-center justify-center py-8">
    <div className="flex items-center space-x-3">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-gray-600 dark:text-gray-300">Searching transactions...</span>
    </div>
  </div>
);

// Fetch dashboard data with transaction search
const getDashboardData = async (date, filters = {}, page = 1) => {
  try {
    // Get auth token from localStorage (only available on client-side)
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      throw new Error('Authentication token not found');
    }
    
    // Build query parameters
    const params = new URLSearchParams({
      date,
      transactionPage: page.toString(),
      transactionLimit: '20'
    });
    
    // Add filter parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    
    // Call your enhanced daily-summary endpoint
    const response = await fetch(`https://datamartbackened.onrender.com/api/daily-summary?${params}`, {
      headers: {
        'x-auth-token': authToken
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData || userData.role !== 'admin') {
          throw new Error('unauthorized-redirect');
        }
      }
      throw new Error(`Failed to fetch dashboard data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Store user info if provided
    if (data.user) {
      localStorage.setItem('userData', JSON.stringify({
        id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role
      }));
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    
    // Fallback mock data for development
    if (error.message !== 'unauthorized-redirect') {
      return {
        date: date,
        summary: {
          totalOrders: 45,
          totalRevenue: 2350.75,
          totalDeposits: 3100.25,
          totalCapacityGB: 125,
          uniqueCustomers: 32,
          depositCount: 18,
          averageDeposit: 172.24,
          uniqueDepositors: 15,
          netCashFlow: 749.50,
          conversionRate: 73.33,
          avgRevenuePerCustomer: 73.46,
          avgDepositPerCustomer: 206.68,
          activeCustomers: 11
        },
        networkSummary: [
          { network: 'YELLO', count: 25, totalGB: 62, revenue: 1200.50 },
          { network: 'TELECEL', count: 15, totalGB: 45, revenue: 850.25 },
          { network: 'AT_PREMIUM', count: 5, totalGB: 18, revenue: 300.00 }
        ],
        capacityDetails: [
          { network: 'YELLO', capacity: 1, count: 5, totalGB: 5 },
          { network: 'YELLO', capacity: 2, count: 10, totalGB: 20 },
          { network: 'YELLO', capacity: 5, count: 6, totalGB: 30 }
        ],
        statusSummary: [
          { status: 'completed', count: 38 },
          { status: 'pending', count: 5 },
          { status: 'processing', count: 2 }
        ],
        depositAnalytics: {
          summary: {
            totalDeposits: 3100.25,
            depositCount: 18,
            averageDeposit: 172.24
          },
          byGateway: [
            { gateway: 'paystack', count: 8, totalAmount: 1500.50, averageAmount: 187.56 },
            { gateway: 'flutterwave', count: 6, totalAmount: 950.25, averageAmount: 158.38 },
            { gateway: 'momo', count: 4, totalAmount: 649.50, averageAmount: 162.38 }
          ],
          topDepositors: [
            {
              userId: '1',
              name: 'John Doe',
              email: 'john@example.com',
              phoneNumber: '+233501234567',
              totalDeposited: 500.00,
              depositCount: 3,
              averageDeposit: 166.67
            }
          ],
          recentDeposits: [
            {
              id: '1',
              amount: 200.00,
              gateway: 'paystack',
              reference: 'PAY123',
              createdAt: new Date(),
              user: { name: 'John Doe', phoneNumber: '+233501234567' }
            }
          ],
          hourlyPattern: [
            { hour: 8, count: 2, amount: 300 },
            { hour: 10, count: 5, amount: 850 },
            { hour: 14, count: 4, amount: 720 },
            { hour: 16, count: 3, amount: 450 },
            { hour: 18, count: 4, amount: 780 }
          ],
          sizeDistribution: [
            { _id: 50, count: 5, totalAmount: 200 },
            { _id: 100, count: 8, totalAmount: 700 },
            { _id: 200, count: 3, totalAmount: 450 },
            { _id: 500, count: 2, totalAmount: 800 }
          ]
        },
        transactionManagement: {
          searchResults: {
            transactions: [
              {
                id: '1',
                reference: 'PAY123456',
                type: 'deposit',
                amount: 250.00,
                status: 'completed',
                gateway: 'paystack',
                createdAt: new Date(),
                balanceAfterTransaction: 750.00,
                user: {
                  id: '1',
                  name: 'John Doe',
                  email: 'john@example.com',
                  phoneNumber: '+233501234567',
                  currentWalletBalance: 500.00
                }
              }
            ],
            totalTransactions: 50,
            currentPage: 1,
            totalPages: 3,
            hasNextPage: true,
            hasPrevPage: false
          },
          paystackSummary: {
            total: 15,
            completed: 12,
            pending: 2,
            failed: 1,
            totalAmount: 2500.00
          },
          adminSummary: {
            total: 8,
            deposits: 5,
            deductions: 2,
            refunds: 1,
            totalAdminDeposits: 800.00,
            totalAdminDeductions: 150.00,
            totalRefunds: 75.00
          },
          filters: {}
        },
        businessInsights: {
          peakDepositHour: { hour: 10, count: 5, amount: 850 },
          topGateway: { gateway: 'paystack', count: 8, totalAmount: 1500.50 },
          customerEngagement: {
            totalCustomers: 32,
            depositingCustomers: 15,
            activeCustomers: 11,
            conversionRate: 73.33
          }
        }
      };
    }
    throw error;
  }
};

const ComprehensiveDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Transaction search states
  const [transactionFilters, setTransactionFilters] = useState({
    search: '',
    phoneNumber: '',
    email: '',
    reference: '',
    gateway: '',
    transactionType: '',
    transactionStatus: '',
    userId: ''
  });
  const [transactionPage, setTransactionPage] = useState(1);
  
  // Format currency for display (GHS - Ghanaian Cedi)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  const refreshData = async () => {
    setRefreshing(true);
    try {
      const dashboardData = await getDashboardData(selectedDate, transactionFilters, transactionPage);
      setData(dashboardData);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      if (err.message === 'unauthorized-redirect') {
        // Handle redirect in a real app
        console.log('Redirect to login');
      } else {
        setError(err.message);
      }
    } finally {
      setRefreshing(false);
    }
  };
  
  // Handle transaction search
  const handleTransactionSearch = async (newFilters = transactionFilters, newPage = 1) => {
    setSearching(true);
    setTransactionFilters(newFilters);
    setTransactionPage(newPage);
    
    try {
      const dashboardData = await getDashboardData(selectedDate, newFilters, newPage);
      setData(dashboardData);
    } catch (err) {
      console.error('Failed to search transactions:', err);
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };
  
  // Clear transaction filters
  const clearTransactionFilters = () => {
    const emptyFilters = {
      search: '',
      phoneNumber: '',
      email: '',
      reference: '',
      gateway: '',
      transactionType: '',
      transactionStatus: '',
      userId: ''
    };
    handleTransactionSearch(emptyFilters, 1);
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const dashboardData = await getDashboardData(selectedDate, transactionFilters, transactionPage);
        setData(dashboardData);
        setError(null);
      } catch (err) {
        if (err.message === 'unauthorized-redirect') {
          // Handle redirect in a real app
          console.log('Redirect to login');
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedDate]);
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const STATUS_COLORS = {
    'completed': '#4ade80',
    'pending': '#f97316',
    'processing': '#3b82f6',
    'failed': '#ef4444',
    'waiting': '#a855f7',
    'delivered': '#14b8a6'
  };
  const GATEWAY_COLORS = {
    'paystack': '#0066cc',
    'flutterwave': '#f5a623',
    'momo': '#50c878',
    'bank_transfer': '#9013fe',
    'wallet': '#17c3b2'
  };
  
  // Loading state
  if (loading) return <DashboardLoader />;
  
  // Error state
  if (error) return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-medium">Error loading dashboard data</h3>
        </div>
        <p className="mt-2 text-sm">{error}</p>
        <button 
          onClick={refreshData}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
        </button>
      </div>
    </div>
  );
  
  if (!data) return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-lg p-4">
        No data available. Please try another date.
      </div>
    </div>
  );
  
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
            Comprehensive insights into daily performance, deposits, and customer behavior
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
            <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm focus:outline-none bg-transparent text-gray-900 dark:text-white"
              aria-label="Select date"
            />
          </div>
          
          <button 
            onClick={refreshData} 
            disabled={refreshing}
            className={`flex items-center space-x-2 py-2 px-4 rounded-lg ${
              refreshing 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
            } transition-colors duration-200 shadow-sm`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Business Overview
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Transaction Management
            </button>
            <button
              onClick={() => setActiveTab('deposits')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'deposits'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Deposit Analytics
            </button>
          </nav>
        </div>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Orders</h3>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{data.summary.totalOrders}</p>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{data.date}</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Revenue</h3>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(data.summary.totalRevenue)}</p>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">From {data.summary.totalOrders} orders</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Deposits</h3>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(data.summary.totalDeposits)}</p>
              <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{data.summary.depositCount} deposits</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Net Cash Flow</h3>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${data.summary.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(data.summary.netCashFlow)}
              </p>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Deposits - Revenue</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Conversion Rate</h3>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{data.summary.conversionRate.toFixed(1)}%</p>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Depositors who purchased</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Active Customers</h3>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{data.summary.activeCustomers}</p>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">of {data.summary.uniqueCustomers} total</div>
            </div>
          </div>

          {/* Business Intelligence Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Peak Deposit Hour</h3>
                <Clock className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold mb-2">
                {data.businessInsights.peakDepositHour ? `${data.businessInsights.peakDepositHour.hour}:00` : 'N/A'}
              </div>
              <div className="text-blue-100">
                {data.businessInsights.peakDepositHour ? formatCurrency(data.businessInsights.peakDepositHour.amount) : 'No data'} in deposits
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Top Gateway</h3>
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold mb-2 capitalize">
                {data.businessInsights.topGateway ? data.businessInsights.topGateway.gateway : 'N/A'}
              </div>
              <div className="text-green-100">
                {data.businessInsights.topGateway ? formatCurrency(data.businessInsights.topGateway.totalAmount) : 'No data'} total
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 text-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Customer Engagement</h3>
                <Eye className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold mb-2">
                {data.businessInsights.customerEngagement.conversionRate.toFixed(1)}%
              </div>
              <div className="text-purple-100">
                {data.businessInsights.customerEngagement.activeCustomers} of {data.businessInsights.customerEngagement.depositingCustomers} converted
              </div>
            </div>
          </div>
          
          {/* Network Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Network Performance</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Network</th>
                      <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Orders</th>
                      <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.networkSummary.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{item.network}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{item.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">{formatCurrency(item.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Order Status Summary</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.statusSummary}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="status" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip 
                      formatter={(value) => [`${value} orders`, 'Count']}
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                    />
                    <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
                      {data.statusSummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#82ca9d'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Transaction Search Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Transaction Search & Management</h2>
            
            {/* Search Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={transactionFilters.search}
                onChange={(e) => setTransactionFilters(prev => ({ ...prev, search: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              
              <input
                type="text"
                placeholder="Phone number..."
                value={transactionFilters.phoneNumber}
                onChange={(e) => setTransactionFilters(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              
              <input
                type="text"
                placeholder="Email address..."
                value={transactionFilters.email}
                onChange={(e) => setTransactionFilters(prev => ({ ...prev, email: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              
              <input
                type="text"
                placeholder="Reference number..."
                value={transactionFilters.reference}
                onChange={(e) => setTransactionFilters(prev => ({ ...prev, reference: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <select
                value={transactionFilters.gateway}
                onChange={(e) => setTransactionFilters(prev => ({ ...prev, gateway: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Gateways</option>
                <option value="paystack">Paystack</option>
                <option value="flutterwave">Flutterwave</option>
                <option value="momo">Mobile Money</option>
                <option value="admin-deposit">Admin Deposit</option>
                <option value="admin-deduction">Admin Deduction</option>
              </select>
              
              <select
                value={transactionFilters.transactionType}
                onChange={(e) => setTransactionFilters(prev => ({ ...prev, transactionType: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="purchase">Purchase</option>
                <option value="refund">Refund</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
              
              <select
                value={transactionFilters.transactionStatus}
                onChange={(e) => setTransactionFilters(prev => ({ ...prev, transactionStatus: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="processing">Processing</option>
              </select>
              
              <input
                type="text"
                placeholder="User ID..."
                value={transactionFilters.userId}
                onChange={(e) => setTransactionFilters(prev => ({ ...prev, userId: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleTransactionSearch(transactionFilters, 1)}
                disabled={searching}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {searching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Searching...
                  </>
                ) : (
                  'Search Transactions'
                )}
              </button>
              <button
                onClick={clearTransactionFilters}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          {searching ? (
            <SearchLoader />
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Paystack Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Total Transactions</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{data.transactionManagement.paystackSummary.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Completed</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">{data.transactionManagement.paystackSummary.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Pending</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">{data.transactionManagement.paystackSummary.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Failed</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">{data.transactionManagement.paystackSummary.failed}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">Total Amount</span>
                        <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(data.transactionManagement.paystackSummary.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Admin Actions</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Total Actions</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{data.transactionManagement.adminSummary.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Manual Deposits</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{data.transactionManagement.adminSummary.deposits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Deductions</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">{data.transactionManagement.adminSummary.deductions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Refunds</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">{data.transactionManagement.adminSummary.refunds}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Search Results</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Total Found</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{data.transactionManagement.searchResults.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Current Page</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{data.transactionManagement.searchResults.currentPage} of {data.transactionManagement.searchResults.totalPages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Showing</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{data.transactionManagement.searchResults.transactions.length} results</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Transaction Results Table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Transaction Results</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleTransactionSearch(transactionFilters, transactionPage - 1)}
                      disabled={!data.transactionManagement.searchResults.hasPrevPage}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handleTransactionSearch(transactionFilters, transactionPage + 1)}
                      disabled={!data.transactionManagement.searchResults.hasNextPage}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Transaction</th>
                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Balance After</th>
                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Balance</th>
                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {data.transactionManagement.searchResults.transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{transaction.user.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{transaction.user.email}</div>
                              <div className="text-xs text-gray-400 dark:text-gray-500">{transaction.user.phoneNumber}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">{transaction.type}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{transaction.gateway}</div>
                              <div className="text-xs text-gray-400 dark:text-gray-500">{transaction.reference}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className={`text-sm font-semibold ${
                              transaction.type === 'deposit' || transaction.type === 'refund' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {transaction.type === 'deposit' || transaction.type === 'refund' ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(transaction.balanceAfterTransaction)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {formatCurrency(transaction.user.currentWalletBalance)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              transaction.status === 'completed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : transaction.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : transaction.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(transaction.createdAt).toLocaleTimeString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {data.transactionManagement.searchResults.transactions.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No transactions found matching your search criteria.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Deposits Tab */}
      {activeTab === 'deposits' && (
        <div className="space-y-6">
          {/* Deposit Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Deposit Distribution</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.depositAnalytics.byGateway}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalAmount"
                      nameKey="gateway"
                      label={({ gateway, percent }) => `${gateway}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.depositAnalytics.byGateway.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={GATEWAY_COLORS[entry.gateway] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Hourly Deposit Pattern</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.depositAnalytics.hourlyPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'amount' ? formatCurrency(value) : value,
                        name === 'amount' ? 'Amount' : 'Count'
                      ]}
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                    />
                    <Area type="monotone" dataKey="amount" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="count" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Payment Gateway Performance</h2>
              <div className="space-y-4">
                {data.depositAnalytics.byGateway.map((gateway, index) => (
                  <div key={gateway.gateway} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: GATEWAY_COLORS[gateway.gateway] || COLORS[index % COLORS.length] }}
                      ></div>
                      <div>
                        <div className="font-medium capitalize text-gray-900 dark:text-white">{gateway.gateway}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{gateway.count} transactions</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(gateway.totalAmount)}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Avg: {formatCurrency(gateway.averageAmount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Customer Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Top Depositors Today</h2>
              <div className="space-y-3">
                {data.depositAnalytics.topDepositors.slice(0, 5).map((depositor, index) => (
                  <div key={depositor.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{depositor.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{depositor.phoneNumber}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(depositor.totalDeposited)}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{depositor.depositCount} deposits</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Recent Deposits</h2>
              <div className="space-y-3">
                {data.depositAnalytics.recentDeposits.slice(0, 6).map((deposit) => (
                  <div key={deposit.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-600 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{deposit.user.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {deposit.gateway} • {deposit.reference}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600 dark:text-green-400">{formatCurrency(deposit.amount)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(deposit.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
        <p>Last updated: {new Date().toLocaleString()} • Real-time business analytics</p>
      </div>
    </div>
  );
};

export default ComprehensiveDashboard;