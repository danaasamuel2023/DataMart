// pages/leaderboard.js
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  ChevronUp, 
  ChevronDown, 
  ArrowUpDown, 
  Clock, 
  DollarSign, 
  ShoppingCart, 
  UserCircle, 
  RefreshCw 
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

  // Fetch initial data
  useEffect(() => {
    fetchLeaderboardData();
    
    // Set up WebSocket connection
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
    
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
      const response = await fetch(`/api/users-leaderboard?limit=${limit}`);
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
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center p-8 space-y-4">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
          <h2 className="text-xl font-semibold">Loading Leaderboard Data...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 p-8 rounded-lg border border-red-200 max-w-md">
          <h2 className="text-xl font-semibold text-red-700 mb-4">Error Loading Leaderboard</h2>
          <p className="text-red-600">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-t-lg">
        <h1 className="text-3xl font-bold">Users Leaderboard</h1>
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

      <div className="bg-white p-4 rounded-b-lg shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-auto">
            <input
              type="text"
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <label htmlFor="limit" className="text-sm font-medium text-gray-700">Show:</label>
            <select
              id="limit"
              className="border rounded-md py-1 px-2"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={10}>10 users</option>
              <option value={20}>20 users</option>
              <option value={50}>50 users</option>
              <option value={100}>100 users</option>
            </select>
            
            <button
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              onClick={fetchLeaderboardData}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('rank')}>
                  <div className="flex items-center">
                    <span>Rank</span>
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('name')}>
                  <div className="flex items-center">
                    <span>User</span>
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('orderCount')}>
                  <div className="flex items-center">
                    <ShoppingCart className="mr-1 h-4 w-4" />
                    <span>Orders</span>
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('totalSpent')}>
                  <div className="flex items-center">
                    <DollarSign className="mr-1 h-4 w-4" />
                    <span>Total Spent</span>
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('averageOrderValue')}>
                  <div className="flex items-center">
                    <span>Avg. Value</span>
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('timeSinceLastOrder')}>
                  <div className="flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    <span>Last Order</span>
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.length > 0 ? (
                sortedData.map((user) => (
                  <React.Fragment key={user.userId}>
                    <tr className={`hover:bg-blue-50 ${expandedUser === user.userId ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">
                          {user.rank <= 3 ? (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                              user.rank === 1 ? 'bg-yellow-100 text-yellow-800' : 
                              user.rank === 2 ? 'bg-gray-100 text-gray-800' : 
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {user.rank}
                            </span>
                          ) : (
                            <span>{user.rank}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <UserCircle className="h-6 w-6 text-blue-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{user.orderCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{formatCurrency(user.totalSpent)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{formatCurrency(user.averageOrderValue)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.timeSinceLastOrder}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button 
                          onClick={() => toggleUserDetails(user.userId)}
                          className="text-blue-600 hover:text-blue-800"
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
                        <td colSpan="7" className="px-6 py-4 bg-blue-50">
                          <div className="p-4 bg-white rounded-md shadow-sm">
                            <h3 className="font-medium text-lg text-gray-900 mb-2">Recent Orders</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {user.recentOrders.map((order, index) => (
                                <div key={index} className="border rounded-md p-3 bg-gray-50">
                                  <div className="flex justify-between items-start">
                                    <div className="text-sm font-medium text-gray-900">
                                      {order.network} - {order.capacity}
                                    </div>
                                    <div className="text-sm font-medium text-blue-600">
                                      {formatCurrency(order.price)}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {order.phoneNumber}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-2">
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
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                    {searchTerm ? 'No users match your search criteria' : 'No data available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}