"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, ArrowUp, ArrowDown, Database, Users, Activity, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Import for navigation

// Fetch dashboard data
const getDashboardData = async (date) => {
  try {
    // Get auth token from localStorage (only available on client-side)
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      throw new Error('Authentication token not found');
    }
    
    // Replace with your actual API endpoint
    const response = await fetch(`https://datamartbackened.onrender.com/api/daily-summary?date=${date}`, {
      headers: {
        'x-auth-token': authToken
      }
    });
    
    if (!response.ok) {
      // Handle 401 Unauthorized error
      if (response.status === 401) {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData || userData.role !== 'admin') {
          // Redirect non-admin users on 401
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
    // Return mock data as fallback for preview purposes
    if (error.message !== 'unauthorized-redirect') {
      return {
        date: date,
        summary: {
          totalOrders: 45,
          totalRevenue: 2350.75,
          totalDeposits: 3100.25,
          totalCapacityGB: 125,
          uniqueCustomers: 32
        },
        networkSummary: [
          { network: 'YELLO', count: 25, totalGB: 62, revenue: 1200.50 },
          { network: 'TELECEL', count: 15, totalGB: 45, revenue: 850.25 },
          { network: 'AT_PREMIUM', count: 5, totalGB: 18, revenue: 300.00 }
        ],
        capacityDetails: [
          { network: 'YELLO', capacity: 1, count: 5, totalGB: 5 },
          { network: 'YELLO', capacity: 2, count: 10, totalGB: 20 },
          { network: 'YELLO', capacity: 5, count: 6, totalGB: 30 },
          { network: 'TELECEL', capacity: 2, count: 7, totalGB: 14 },
          { network: 'TELECEL', capacity: 5, count: 3, totalGB: 15 },
          { network: 'AT_PREMIUM', capacity: 3, count: 3, totalGB: 9 },
          { network: 'AT_PREMIUM', capacity: 5, count: 1, totalGB: 5 }
        ],
        statusSummary: [
          { status: 'completed', count: 38 },
          { status: 'pending', count: 5 },
          { status: 'processing', count: 2 }
        ]
      };
    }
    // Re-throw the error to handle in component
    throw error;
  }
};

const DailyDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter(); // Initialize router for navigation
  
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
      const dashboardData = await getDashboardData(selectedDate);
      setData(dashboardData);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      if (err.message === 'unauthorized-redirect') {
        router.push('/'); // Redirect to home page on auth error
      } else {
        setError(err.message);
      }
    } finally {
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const dashboardData = await getDashboardData(selectedDate);
        setData(dashboardData);
        setError(null);
      } catch (err) {
        if (err.message === 'unauthorized-redirect') {
          router.push('/'); // Redirect to home page on auth error
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedDate, router]);
  
  // Array of colors for the charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // Status colors for better visualization
  const STATUS_COLORS = {
    'completed': '#4ade80', // Green
    'pending': '#f97316',   // Orange
    'processing': '#3b82f6', // Blue
    'failed': '#ef4444',    // Red
    'waiting': '#a855f7',   // Purple
    'delivered': '#14b8a6'  // Teal
  };
  
  // Loading state with skeleton UI
  if (loading) return (
    <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-200 p-6 rounded-lg h-28"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-200 p-6 rounded-lg h-64"></div>
        <div className="bg-gray-200 p-6 rounded-lg h-64"></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-200 p-6 rounded-lg h-80"></div>
        <div className="bg-gray-200 p-6 rounded-lg h-80"></div>
      </div>
    </div>
  );
  
  // Error state
  if (error) return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-medium">Error loading dashboard data</h3>
        </div>
        <p className="mt-2 text-sm">{error}</p>
        <div className="mt-4">
          <button 
            onClick={refreshData}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </button>
        </div>
      </div>
    </div>
  );
  
  if (!data) return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
        No data available. Please try another date.
      </div>
    </div>
  );
  
  // Prepare data for the capacity breakdown chart
  const prepareCapacityBreakdown = () => {
    // Group capacity details by capacity size
    const capacityGroups = {};
    data.capacityDetails.forEach(item => {
      if (!capacityGroups[item.capacity]) {
        capacityGroups[item.capacity] = {
          capacity: `${item.capacity}GB`,
          count: 0
        };
      }
      capacityGroups[item.capacity].count += item.count;
    });
    
    return Object.values(capacityGroups).sort((a, b) => 
      parseInt(a.capacity) - parseInt(b.capacity)
    );
  };
  
  const capacityBreakdown = prepareCapacityBreakdown();
  
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daily Business Summary</h1>
          <p className="text-gray-600 text-sm mt-1">
            View your daily metrics, sales, and performance indicators
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-2">
            <Calendar className="h-5 w-5 text-gray-500 mr-2" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm focus:outline-none"
              aria-label="Select date"
            />
          </div>
          
          <button 
            onClick={refreshData} 
            disabled={refreshing}
            className={`flex items-center space-x-2 py-2 px-4 rounded-lg ${
              refreshing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } transition-colors duration-200 shadow-sm`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm text-gray-500 font-medium">Total Orders</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.summary.totalOrders}</p>
          <div className="mt-2 text-xs text-gray-500">
            {data.date}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm text-gray-500 font-medium">Total Revenue</h3>
            <div className="p-2 bg-green-50 rounded-lg">
              <ArrowUp className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(data.summary.totalRevenue)}</p>
          <div className="mt-2 text-xs text-gray-500">
            {data.date}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm text-gray-500 font-medium">Total Deposits</h3>
            <div className="p-2 bg-purple-50 rounded-lg">
              <ArrowDown className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(data.summary.totalDeposits)}</p>
          <div className="mt-2 text-xs text-gray-500">
            {data.date}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm text-gray-500 font-medium">Data Sold</h3>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Database className="h-5 w-5 text-yellow-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.summary.totalCapacityGB} <span className="text-sm font-normal">GB</span></p>
          <div className="mt-2 text-xs text-gray-500">
            {data.date}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm text-gray-500 font-medium">Unique Customers</h3>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Users className="h-5 w-5 text-indigo-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.summary.uniqueCustomers}</p>
          <div className="mt-2 text-xs text-gray-500">
            {data.date}
          </div>
        </div>
      </div>
      
      {/* Network Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200 hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Network Performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">Network</th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Data (GB)</th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.networkSummary.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-sm font-medium text-gray-900">{item.network}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.totalGB}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                    {data.networkSummary.reduce((sum, item) => sum + item.count, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                    {data.networkSummary.reduce((sum, item) => sum + item.totalGB, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                    {formatCurrency(data.networkSummary.reduce((sum, item) => sum + item.revenue, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200 hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Network Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.networkSummary}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="network"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data.networkSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value} orders`, props.payload.network]} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Data Capacity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200 hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Data Package Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={capacityBreakdown}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="capacity" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} orders`, 'Orders']}
                  labelFormatter={(value) => `Package Size: ${value}`}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #f0f0f0' }}
                />
                <Legend />
                <Bar dataKey="count" name="Number of Orders" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200 hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Package Details By Network</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">Network</th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Package Size</th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">Total Data</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.capacityDetails.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ 
                          backgroundColor: COLORS[data.networkSummary.findIndex(n => n.network === item.network) % COLORS.length] 
                        }}></div>
                        <span className="text-sm font-medium text-gray-900">{item.network}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.capacity} GB</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{item.totalGB} GB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Order Status */}
      <div className="grid grid-cols-1 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200 hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Order Status Summary</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.statusSummary}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value} orders`, 'Count']}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #f0f0f0' }}
                  />
                  <Legend />
                  <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
                    {data.statusSummary.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.status] || '#82ca9d'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-4">
                {data.statusSummary.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3" 
                      style={{ backgroundColor: STATUS_COLORS[item.status] || '#82ca9d' }}
                    ></div>
                    <div>
                      <div className="text-sm font-medium capitalize">{item.status}</div>
                      <div className="text-2xl font-bold">{item.count}</div>
                      <div className="text-xs text-gray-500">
                        {((item.count / data.summary.totalOrders) * 100).toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-center text-xs text-gray-500 mt-8">
        <p>Data last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default DailyDashboard;