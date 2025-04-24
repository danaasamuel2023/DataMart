// pages/user-stats.js
'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  User, 
  CreditCard, 
  ShoppingCart, 
  Award, 
  Clock, 
  Mail, 
  Phone, 
  Calendar, 
  Wallet,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Percent,
  TrendingUp,
  Moon,
  Sun
} from 'lucide-react';

const UserStatsPage = () => {
  const router = useRouter();
  
  // State variables
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  // Get token and user data from localStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      const userDataStr = localStorage.getItem('userData');
      
      // Check for system dark mode preference or saved preference
      const savedDarkMode = localStorage.getItem('darkMode');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      setDarkMode(savedDarkMode === 'true' || (savedDarkMode === null && prefersDark));
      
      if (!token) {
        router.push('/login');
        return;
      }
      
      setAuthToken(token);
      
      if (userDataStr) {
        try {
          const parsedUserData = JSON.parse(userDataStr);
          setUserData(parsedUserData);
        } catch (err) {
          console.error('Error parsing user data:', err);
          localStorage.removeItem('userData');
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  // Listen for system dark mode changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only change if user hasn't explicitly set a preference
      if (localStorage.getItem('darkMode') === null) {
        setDarkMode(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save preference
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Fetch user stats when component mounts
  useEffect(() => {
    if (userData && authToken) {
      fetchUserStats();
    }
  }, [authToken, userData]);

  // Function to fetch user stats
  const fetchUserStats = async () => {
    if (!authToken || !userData) return;
    
    setLoading(true);
    try {
      const userId = userData.id;
      
      // Using GET request with userId in URL params
      const response = await axios.get(`https://datamartbackened.onrender.com/api/v1/user-stats/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.data.success) {
        setUserStats(response.data.data);
      } else {
        setError('Failed to fetch user statistics');
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        // Handle token expiration
        setError('Your session has expired. Please log in again.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.push('/login');
      } else {
        setError('An error occurred while fetching user statistics');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  // Show loading spinner if data is still loading
  if (!userData || !authToken || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }
  
  // Show error message if there was an error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="flex items-center justify-center text-red-500 dark:text-red-400 mb-4">
            <AlertCircle className="w-12 h-12" />
          </div>
          <h2 className="text-xl text-center font-bold text-gray-800 dark:text-gray-100 mb-2">Error</h2>
          <p className="text-center text-gray-600 dark:text-gray-300">{error}</p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg flex items-center transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 transition-colors">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Your Account Statistics</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">View your account performance and activity</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={toggleDarkMode}
                className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={fetchUserStats}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Stats
              </button>
            </div>
          </div>
        </div>
        
        {/* User Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 transition-colors">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mr-4 transition-colors">
              <User className="w-8 h-8 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{userStats.userInfo.name}</h2>
              <div className="flex items-center text-gray-600 dark:text-gray-300 mt-1">
                <Mail className="w-4 h-4 mr-1" />
                <span>{userStats.userInfo.email}</span>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-300 mt-1">
                <Phone className="w-4 h-4 mr-1" />
                <span>{userStats.userInfo.phoneNumber}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Account Status */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Account Status</p>
                  <div className={`mt-1 px-2 py-1 rounded text-xs font-medium inline-block capitalize ${getStatusColor(userStats.userInfo.accountStatus)}`}>
                    {userStats.userInfo.accountStatus}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-600 p-2 rounded-full transition-colors">
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
            </div>
            
            {/* Wallet Balance */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Wallet Balance</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">{formatCurrency(userStats.userInfo.walletBalance)}</p>
                </div>
                <div className="bg-white dark:bg-gray-600 p-2 rounded-full transition-colors">
                  <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
            </div>
            
            {/* Account Age */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Account Age</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">{userStats.userInfo.accountAge} days</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Since {formatDate(userStats.userInfo.registrationDate)}</p>
                </div>
                <div className="bg-white dark:bg-gray-600 p-2 rounded-full transition-colors">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Deposit Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3 transition-colors">
                <CreditCard className="w-6 h-6 text-green-600 dark:text-green-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Deposit Statistics</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Total Amount Deposited</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{formatCurrency(userStats.depositStats.totalAmount)}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Number of Deposits</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{userStats.depositStats.numberOfDeposits}</p>
              </div>
            </div>
          </div>
          
          {/* Order Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3 transition-colors">
                <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Order Statistics</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Total Orders</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{userStats.orderStats.totalOrders}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Successful Orders</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{userStats.orderStats.successfulOrders}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Success Rate</p>
                <div className="flex items-center mt-1">
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{userStats.orderStats.successRate}%</p>
                  <Percent className="w-4 h-4 text-gray-500 dark:text-gray-400 ml-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ranking Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
          <div className="flex items-center mb-6">
            <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3 transition-colors">
              <Award className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Your Ranking</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg text-center transition-colors">
              <div className="w-16 h-16 mx-auto bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-3 transition-colors">
                <Award className="w-8 h-8 text-purple-600 dark:text-purple-300" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Your Position</p>
              <div className="flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-800 dark:text-white mr-1">#{userStats.ranking.position}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/ {userStats.ranking.outOf}</span>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg transition-colors">
              <h4 className="text-gray-700 dark:text-gray-200 font-medium mb-3">Percentile Ranking</h4>
              <div className="bg-gray-200 dark:bg-gray-600 h-4 rounded-full overflow-hidden transition-colors">
                <div 
                  className="bg-purple-600 dark:bg-purple-500 h-full rounded-full transition-colors" 
                  style={{ width: `${userStats.ranking.percentile}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-gray-600 dark:text-gray-300">Top {userStats.ranking.percentile}%</span>
                <span className="text-gray-600 dark:text-gray-300">Better than {100 - userStats.ranking.percentile}% users</span>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg transition-colors">
              <h4 className="text-gray-700 dark:text-gray-200 font-medium mb-3">What This Means</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {userStats.ranking.position <= 10 ? (
                  "You're among our top users! Your continued business helps us grow."
                ) : userStats.ranking.position <= 50 ? (
                  "You're a valued customer in our community. Keep ordering to improve your rank!"
                ) : (
                  "You're on your way up! More orders will boost your ranking."
                )}
              </p>
              <div className="mt-3">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <TrendingUp className="w-4 h-4 mr-2 text-green-500 dark:text-green-400" />
                  <span>More orders = Higher ranking</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatsPage;