'use client'
import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Bar, 
  BarChart,
  ComposedChart
} from 'recharts';

// Helper function to get user ID from localStorage
const getUserIdFromLocalStorage = () => {
  try {
    const userDataString = localStorage.getItem('userData');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      return userData.id;
    }
    return null;
  } catch (error) {
    console.error('Error getting user ID from localStorage:', error);
    return null;
  }
};

const WeeklySalesChart = ({ userId = getUserIdFromLocalStorage() }) => {
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(4); // Default to 4 weeks

  useEffect(() => {
    fetchWeeklySalesData();
  }, [userId, timeRange]);

  const fetchWeeklySalesData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (userId) {
        queryParams.append('userId', userId);
      }
      
      queryParams.append('weeks', timeRange);
      
      // Get auth token from localStorage
      const authToken = localStorage.getItem('authToken');
      
      const response = await fetch(`http://localhost:5000/api/weekly-sales?${queryParams.toString()}`, {
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch weekly sales data');
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        // Format data for charts
        const formattedData = result.data.weeklySales.map(week => ({
          name: week.weekLabel,
          revenue: week.revenue,
          orders: week.orderCount,
          averageOrderValue: week.averageOrderValue
        }));
        
        setChartData(formattedData);
        setMetrics(result.data.metrics);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (e) => {
    setTimeRange(Number(e.target.value));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading sales data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">Error: {error}</p>
        <button 
          onClick={fetchWeeklySalesData}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-yellow-700">No sales data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Weekly Sales Performance</h2>
        <div className="flex items-center space-x-2">
          <label htmlFor="timeRange" className="text-sm text-gray-600">Time Range:</label>
          <select
            id="timeRange"
            value={timeRange}
            onChange={handleTimeRangeChange}
            className="border border-gray-300 rounded p-1"
          >
            <option value={4}>Last 4 Weeks</option>
            <option value={8}>Last 8 Weeks</option>
            <option value={12}>Last 12 Weeks</option>
            <option value={26}>Last 26 Weeks</option>
          </select>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded border border-blue-100">
          <p className="text-sm text-blue-600">Total Orders</p>
          <p className="text-2xl font-bold">{metrics.totalPeriodOrders || 0}</p>
        </div>
        <div className="bg-green-50 p-4 rounded border border-green-100">
          <p className="text-sm text-green-600">Total Revenue</p>
          <p className="text-2xl font-bold">${metrics.totalPeriodRevenue?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded border border-purple-100">
          <p className="text-sm text-purple-600">Avg. Order Value</p>
          <p className="text-2xl font-bold">${metrics.periodAverageOrderValue?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Main chart */}
      <div className="h-64 mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="orders" fill="#8884d8" name="Orders" barSize={20} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" name="Revenue ($)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Trend indicators */}
      {metrics.weeklyGrowth && metrics.weeklyGrowth.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">Week-over-Week Growth</h3>
          <div className="flex flex-wrap gap-2">
            {metrics.weeklyGrowth.slice(1).map((growth, index) => (
              <div key={index} className="inline-flex items-center">
                <span className="text-sm text-gray-600">Week {index + 2}:</span>
                <span className={`ml-1 ${growth.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growth.revenue >= 0 ? '↑' : '↓'} {Math.abs(growth.revenue)}% revenue
                </span>
                <span className="mx-1">|</span>
                <span className={`${growth.orders >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growth.orders >= 0 ? '↑' : '↓'} {Math.abs(growth.orders)}% orders
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklySalesChart;