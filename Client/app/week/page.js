'use client'
import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// Helper function to get user ID from localStorage
const getUserIdFromLocalStorage = () => {
  if (typeof window === 'undefined') return null;
  
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

// Tooltip component for term explanations
const TermTooltip = ({ term, explanation }) => {
  return (
    <div className="group relative inline-block">
      <span className="cursor-help border-b border-dashed border-gray-400 dark:border-gray-500">
        {term}
      </span>
      <div className="absolute z-10 w-64 p-3 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 border border-gray-200 dark:border-gray-700">
        {explanation}
      </div>
    </div>
  );
};

// Animated loading spinner with dark mode support
const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
        <div className="w-12 h-12 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin absolute top-0"></div>
      </div>
      <div className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading sales data...</div>
    </div>
  );
};

const DailySalesChart = ({ userId = getUserIdFromLocalStorage() }) => {
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(7); // Default to 7 days
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [theme, setTheme] = useState('light');

  // Check for dark mode preference
  useEffect(() => {
    // Check system preference initially
    if (typeof window !== 'undefined') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDarkMode ? 'dark' : 'light');
      
      // Listen for changes in color scheme preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        setTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  useEffect(() => {
    fetchDailySalesData();
  }, [userId, timeRange]);

  const fetchDailySalesData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (userId) {
        queryParams.append('userId', userId);
      }
      
      queryParams.append('days', timeRange);
      
      // Get auth token from localStorage
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      // Log debug information
      console.log('Fetching daily sales with:', {
        userId,
        timeRange,
        hasAuthToken: !!authToken
      });
      
      // Adjust the URL to match your actual API endpoint
      const apiUrl = `https://datamartbackened.onrender.com/api/v1/data/daily-sales?${queryParams.toString()}`;
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to fetch daily sales data: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('API response:', result);
      
      if (result.status === 'success') {
        // Format data for charts
        const formattedData = result.data.dailySales.map(day => ({
          name: day.dayFormatted,
          revenue: day.revenue,
          orders: day.orderCount,
          averageOrderValue: day.averageOrderValue
        }));
        
        setChartData(formattedData);
        setMetrics(result.data.metrics);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching daily sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (e) => {
    setTimeRange(Number(e.target.value));
  };

  // Terms and explanations
  const terms = {
    'Revenue': 'The total amount of money generated from sales before deducting expenses.',
    'Average Order Value': 'The average amount spent each time a customer places an order. Calculated by dividing total revenue by number of orders.',
    'Best Performing Day': 'The day with the highest revenue within the selected time period.'
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        <button 
          onClick={fetchDailySalesData}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Daily Sales Performance</h2>
          <button 
            onClick={() => setShowTermsModal(!showTermsModal)}
            className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            aria-label="Show term explanations"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="timeRange" className="text-sm text-gray-600 dark:text-gray-300">Time Range:</label>
          <select
            id="timeRange"
            value={timeRange}
            onChange={handleTimeRangeChange}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded p-1 text-gray-800 dark:text-gray-200"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Terms explanation modal */}
      {showTermsModal && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300">Sales Terms Explained</h3>
            <button 
              onClick={() => setShowTermsModal(false)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <dl className="space-y-2 text-sm">
            {Object.entries(terms).map(([term, explanation]) => (
              <div key={term} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <dt className="font-medium text-gray-700 dark:text-gray-300">{term}</dt>
                <dd className="text-gray-600 dark:text-gray-400 md:col-span-2">{explanation}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-100 dark:border-blue-800">
          <p className="text-sm text-blue-600 dark:text-blue-400">Total Orders</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{metrics.totalPeriodOrders || 0}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded border border-green-100 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400">
            <TermTooltip 
              term="Total Revenue" 
              explanation="The total amount of money generated from sales before deducting expenses." 
            />
          </p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">${metrics.totalPeriodRevenue?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded border border-purple-100 dark:border-purple-800">
          <p className="text-sm text-purple-600 dark:text-purple-400">
            <TermTooltip 
              term="Avg. Order Value" 
              explanation="The average amount spent each time a customer places an order. Calculated by dividing total revenue by number of orders." 
            />
          </p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">GHS{metrics.periodAverageOrderValue?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Best day highlight */}
      {metrics.bestPerformingDay && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded border border-yellow-200 dark:border-yellow-800">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">
            <TermTooltip 
              term="Best Performing Day" 
              explanation="The day with the highest revenue within the selected time period." 
            />
          </h3>
          <div className="flex flex-wrap gap-4 mt-2">
            <div>
              <span className="text-sm text-yellow-700 dark:text-yellow-400">Date:</span>
              <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">{metrics.bestPerformingDay.date}</span>
            </div>
            <div>
              <span className="text-sm text-yellow-700 dark:text-yellow-400">Revenue:</span>
              <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">GHS{metrics.bestPerformingDay.revenue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-sm text-yellow-700 dark:text-yellow-400">Orders:</span>
              <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">{metrics.bestPerformingDay.orderCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main chart */}
      {chartData.length > 0 ? (
        <div className="h-64 mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
              <XAxis 
                dataKey="name" 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} 
                tick={{ fill: theme === 'dark' ? '#e5e7eb' : '#374151' }} 
              />
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                stroke="#8884d8" 
                tick={{ fill: theme === 'dark' ? '#e5e7eb' : '#374151' }} 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#82ca9d" 
                tick={{ fill: theme === 'dark' ? '#e5e7eb' : '#374151' }} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1f2937' : 'white',
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                  color: theme === 'dark' ? '#e5e7eb' : '#374151'
                }} 
              />
              <Legend 
                wrapperStyle={{ 
                  color: theme === 'dark' ? '#e5e7eb' : '#374151' 
                }} 
              />
              <Bar yAxisId="left" dataKey="orders" fill="#8884d8" name="Orders" barSize={20} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" name="Revenue ($)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md mb-8">
          <p className="text-yellow-700 dark:text-yellow-400">No sales data available for the selected time period.</p>
        </div>
      )}

      {/* Daily breakdown table */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Daily Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Day</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Orders</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <TermTooltip 
                    term="Avg Order Value" 
                    explanation="The average amount spent each time a customer places an order on this specific day." 
                  />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {chartData.map((day, index) => {
                const isBestDay = metrics.bestPerformingDay && day.name === metrics.bestPerformingDay.date;
                const isZeroRevenue = day.revenue === 0;
                
                let rowClass = '';
                if (theme === 'dark') {
                  rowClass = isZeroRevenue ? 'bg-gray-900/50' : (isBestDay ? 'bg-yellow-900/30' : '');
                } else {
                  rowClass = isZeroRevenue ? 'bg-gray-50' : (isBestDay ? 'bg-yellow-50' : '');
                }
                
                return (
                  <tr key={index} className={rowClass}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{day.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{day.orders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${day.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    GHS{day.averageOrderValue ? day.averageOrderValue.toLocaleString() : '0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailySalesChart;