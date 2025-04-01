// pages/leaderboard.js
'use client';

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  ChevronUp, 
  ChevronDown, 
  ArrowUpDown, 
  Clock, 
  DollarSign, 
  ShoppingCart, 
  User, 
  RefreshCw,
  Moon,
  Sun
} from 'lucide-react';

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
  const [expandedUser, setExpandedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(20);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize dark mode based on system preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if user has a saved preference
      const savedMode = localStorage.getItem('darkMode');
      if (savedMode) {
        setDarkMode(savedMode === 'true');
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(prefersDark);
      }
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
  };

  // Get current user from localStorage on component mount
  useEffect(() => {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        setCurrentUserId(parsedUserData.id);
      }
    } catch (error) {
      console.error('Error retrieving user data from localStorage:', error);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchLeaderboardData();
    
    // Set up WebSocket connection
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'https://datamartbackened.onrender.com');
    
    socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    socket.on('leaderboardUpdate', (data) => {
      setLeaderboardData(data.leaderboard);
      setLastUpdated(new Date(data.lastUpdated));
    });
    
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
    
    return () => {
      socket.disconnect();
    };
  }, [limit]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://datamartbackened.onrender.com/api/v1/data/users-leaderboard?limit=${limit}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setLeaderboardData(data.data.leaderboard);
        setLastUpdated(new Date(data.data.lastUpdated));
      } else {
        setError(data.message || 'Failed to fetch leaderboard data');
      }
    } catch (err) {
      setError('Error connecting to the server. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!leaderboardData) return [];
    
    const filteredData = leaderboardData.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const sortableData = [...filteredData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  };

  const toggleUserDetails = (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Function to mask phone number (e.g., "123-456-7890" becomes "***-***-7890")
  const maskPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Keep only the last 4 digits visible
    const parts = phoneNumber.split(/[-\s]/);
    if (parts.length >= 3) {
      return `***-***-${parts[parts.length - 1]}`;
    } else {
      // Fallback if the format is different
      const digits = phoneNumber.replace(/\D/g, '');
      const lastFourDigits = digits.slice(-4);
      return `******${lastFourDigits}`;
    }
  };

  // Function to check if a user is the current logged-in user
  const isCurrentUser = (userId) => {
    return currentUserId === userId;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <div className="flex flex-col items-center p-8 space-y-4">
          <RefreshCw className={`w-12 h-12 ${darkMode ? 'text-blue-400' : 'text-blue-500'} animate-spin`} />
          <h2 className="text-xl font-semibold">Loading Leaderboard Data...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`p-8 rounded-lg border max-w-md ${darkMode ? 'bg-gray-800 border-red-800 text-white' : 'bg-red-50 border-red-200'}`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Error Loading Leaderboard</h2>
          <p className={darkMode ? 'text-red-300' : 'text-red-600'}>{error}</p>
          <button 
            className={`mt-4 px-4 py-2 rounded hover:bg-red-700 transition ${darkMode ? 'bg-red-800 text-white' : 'bg-red-600 text-white'}`}
            onClick={fetchLeaderboardData}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const sortedData = getSortedData();

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="container mx-auto p-2 sm:p-4 max-w-6xl">
        <div className="flex justify-end mb-4">
          <button 
            onClick={toggleDarkMode} 
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'} transition-colors duration-200`}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      
        <div className={`${darkMode ? 'bg-gradient-to-r from-blue-900 to-indigo-900' : 'bg-gradient-to-r from-blue-600 to-indigo-700'} text-white p-4 sm:p-6 rounded-t-lg`}>
          <h1 className="text-2xl sm:text-3xl font-bold">Users Leaderboard</h1>
          <p className="mt-2 text-blue-100">
            Top users ranked by order count and activity
          </p>
          {lastUpdated && (
            <div className="flex items-center mt-2 text-blue-100 text-sm">
              <Clock className="w-4 h-4 mr-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-3 sm:p-4 rounded-b-lg shadow-md border-t-0 border`}>
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="relative w-full md:w-auto">
              <input
                type="text"
                placeholder="Search users..."
                className={`pl-10 pr-4 py-2 border rounded-lg w-full md:w-64 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-700'
                }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 w-full md:w-auto">
              <label htmlFor="limit" className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Show:</label>
              <select
                id="limit"
                className={`border rounded-md py-1 px-2 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'
                }`}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <option value={10}>10 users</option>
                <option value={20}>20 users</option>
                <option value={50}>50 users</option>
                <option value={100}>100 users</option>
              </select>
              
              <button
                className={`flex items-center px-4 py-2 rounded hover:bg-blue-600 transition ${
                  darkMode ? 'bg-blue-700 text-white hover:bg-blue-800' : 'bg-blue-500 text-white'
                }`}
                onClick={fetchLeaderboardData}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={`min-w-full ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`} onClick={() => requestSort('rank')}>
                    <div className="flex items-center">
                      <span>Rank</span>
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`} onClick={() => requestSort('name')}>
                    <div className="flex items-center">
                      <span>User</span>
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`} onClick={() => requestSort('orderCount')}>
                    <div className="flex items-center">
                      <ShoppingCart className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Orders</span>
                    </div>
                  </th>
                  <th className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`} onClick={() => requestSort('totalSpent')}>
                    <div className="flex items-center">
                      <DollarSign className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Total</span>
                    </div>
                  </th>
                  <th className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  } hidden md:table-cell`} onClick={() => requestSort('averageOrderValue')}>
                    <div className="flex items-center">
                      <span>Avg</span>
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  } hidden sm:table-cell`} onClick={() => requestSort('timeSinceLastOrder')}>
                    <div className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>Last</span>
                    </div>
                  </th>
                  <th className={`px-2 sm:px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {sortedData.length > 0 ? (
                  sortedData.map((user) => (
                    <React.Fragment key={user.userId}>
                      <tr className={`
                        ${expandedUser === user.userId ? 
                          (darkMode ? 'bg-blue-900/30' : 'bg-blue-50') : ''
                        } 
                        ${isCurrentUser(user.userId) ? 
                          (darkMode ? 'bg-green-900/30 hover:bg-green-900/50' : 'bg-green-50 hover:bg-green-100') : 
                          (darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50')
                        }
                      `}>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium">
                            {user.rank <= 3 ? (
                              <span className={`inline-flex items-center justify-center w-6 sm:w-8 h-6 sm:h-8 rounded-full ${
                                user.rank === 1 ? 
                                  (darkMode ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-800') : 
                                user.rank === 2 ? 
                                  (darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-100 text-gray-800') : 
                                  (darkMode ? 'bg-amber-800 text-amber-200' : 'bg-amber-100 text-amber-800')
                              }`}>
                                {user.rank}
                              </span>
                            ) : (
                              <span>{user.rank}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center ${
                              isCurrentUser(user.userId) ? 
                                (darkMode ? 'bg-green-800' : 'bg-green-100') : 
                                (darkMode ? 'bg-blue-800' : 'bg-blue-100')
                            }`}>
                              <User className={`h-4 w-4 sm:h-6 sm:w-6 ${
                                isCurrentUser(user.userId) ? 
                                  (darkMode ? 'text-green-400' : 'text-green-600') : 
                                  (darkMode ? 'text-blue-400' : 'text-blue-500')
                              }`} />
                            </div>
                            <div className="ml-2 sm:ml-4">
                              <div className="flex items-center">
                                <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                  {user.name}
                                </div>
                                {isCurrentUser(user.userId) && (
                                  <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-center">
                                <span role="img" aria-label="User">👤</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {user.orderCount}
                          </div>
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {formatCurrency(user.totalSpent)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                          <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {formatCurrency(user.averageOrderValue)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {user.timeSinceLastOrder}
                          </div>
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center">
                          <button 
                            onClick={() => toggleUserDetails(user.userId)}
                            className={darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}
                            aria-label={expandedUser === user.userId ? "Hide details" : "Show details"}
                          >
                            {expandedUser === user.userId ? 
                              <ChevronUp className="h-5 w-5" /> : 
                              <ChevronDown className="h-5 w-5" />
                            }
                          </button>
                        </td>
                      </tr>
                      {expandedUser === user.userId && user.recentOrders && (
                        <tr>
                          <td colSpan="7" className={
                            isCurrentUser(user.userId) ? 
                              (darkMode ? 'bg-green-900/20' : 'bg-green-50') : 
                              (darkMode ? 'bg-blue-900/20' : 'bg-blue-50')
                          }>
                            <div className={`p-4 rounded-md shadow-sm ${
                              darkMode ? 'bg-gray-800' : 'bg-white'
                            }`}>
                              <h3 className={`font-medium text-lg mb-2 ${
                                darkMode ? 'text-gray-200' : 'text-gray-900'
                              }`}>Recent Orders</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {user.recentOrders.map((order, index) => (
                                  <div key={index} className={`border rounded-md p-3 ${
                                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                                  }`}>
                                    <div className="flex justify-between items-start">
                                      <div className={`text-sm font-medium ${
                                        darkMode ? 'text-gray-200' : 'text-gray-900'
                                      }`}>
                                        {order.network} - {order.capacity}
                                      </div>
                                      <div className={`text-sm font-medium ${
                                        darkMode ? 'text-blue-400' : 'text-blue-600'
                                      }`}>
                                        {formatCurrency(order.price)}
                                      </div>
                                    </div>
                                    <div className={`text-sm mt-1 ${
                                      darkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                      {maskPhoneNumber(order.phoneNumber)}
                                    </div>
                                    <div className={`text-xs mt-2 ${
                                      darkMode ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                      {order.formattedDate}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className={`px-6 py-10 text-center ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {searchTerm ? 'No users match your search criteria' : 'No data available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}