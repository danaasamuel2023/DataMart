'use client'
import React, { useState, useEffect } from 'react';
import { CreditCard, Package, Database, DollarSign, TrendingUp, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

const DashboardPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    balance: 0,
    todayOrders: 0,
    todayGbSold: 0,
    todayRevenue: 0,
    recentTransactions: []
  });

  const ViewAll=()=>{
    router.push('/orders');
  }

  useEffect(() => {
    // Check if user is authenticated
    

    // Fetch user data from localStorage
    const userDataString = localStorage.getItem('userData');
    if (!userDataString) {
      router.push('/Signup');
      return;
    }

    const userData = JSON.parse(userDataString);
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
            method: order.method, // Add this line
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
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // You might want to show an error message to the user
    } finally {
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

  // Calculate percentage change (placeholder for now)
  // In a real implementation, you'd fetch previous day's data as well
  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Get today's date
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // MTN Brand color
  const mtnYellow = "#ffcc00";

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
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">MTN</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">MTNUP2U Dashboard</h1>
            </div>
            <div className="flex items-center text-gray-600">
              <Calendar className="h-5 w-5 mr-2" />
              <span>{today}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Stats - Account Balance and Orders Today */}
        <div className="mb-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="h-2" style={{ backgroundColor: mtnYellow }}></div>
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Key Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Account Balance Box */}
              <div className="rounded-lg p-4 flex flex-col items-center justify-center" 
                   style={{ backgroundColor: `${mtnYellow}20` }}>
                <CreditCard className="h-6 w-6 mb-2" style={{ color: mtnYellow }} />
                <span className="text-sm font-medium text-gray-600">Account Balance</span>
                <span className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(stats.balance)}</span>
              </div>
              
              {/* Orders Today Box */}
              <div className="rounded-lg p-4 flex flex-col items-center justify-center" 
                   style={{ backgroundColor: `${mtnYellow}20` }}>
                <Package className="h-6 w-6 mb-2" style={{ color: mtnYellow }} />
                <span className="text-sm font-medium text-gray-600">Orders Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-xl font-bold text-gray-900">{stats.todayOrders}</span>
                </div>
              </div>
              
              {/* GB Sold Today Box */}
              <div className="rounded-lg p-4 flex flex-col items-center justify-center" 
                   style={{ backgroundColor: `${mtnYellow}20` }}>
                <Database className="h-6 w-6 mb-2" style={{ color: mtnYellow }} />
                <span className="text-sm font-medium text-gray-600">GB Sold Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-xl font-bold text-gray-900">{stats.todayGbSold} GB</span>
                </div>
              </div>
              
              {/* Revenue Today Box */}
              <div className="rounded-lg p-4 flex flex-col items-center justify-center" 
                   style={{ backgroundColor: `${mtnYellow}20` }}>
                <DollarSign className="h-6 w-6 mb-2" style={{ color: mtnYellow }} />
                <span className="text-sm font-medium text-gray-600">Revenue Today</span>
                <div className="flex items-center mt-1">
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(stats.todayRevenue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mb-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="h-2" style={{ backgroundColor: mtnYellow }}></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
              <button className="text-sm hover:text-yellow-600 font-medium" style={{ color: mtnYellow }} onClick={ViewAll}>View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Network
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Package
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentTransactions.length > 0 ? (
                    stats.recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{transaction.customer}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{transaction.method}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{transaction.time}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{transaction.network}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{transaction.gb} GB</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(transaction.amount)}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500">
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-2" style={{ backgroundColor: mtnYellow }}></div>
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => router.push('/new-order')}
                className="rounded-lg p-4 flex flex-col items-center transition-colors" 
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <Package className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">New Order</span>
              </button>
              <button 
                onClick={() => router.push('/reports')}
                className="rounded-lg p-4 flex flex-col items-center transition-colors"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <TrendingUp className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Sales Report</span>
              </button>
              <button 
                onClick={() => router.push('/manage-data')}
                className="rounded-lg p-4 flex flex-col items-center transition-colors"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <Database className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Manage Data</span>
              </button>
              <button 
                onClick={() => router.push('/add-credit')}
                className="rounded-lg p-4 flex flex-col items-center transition-colors"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <CreditCard className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Add Credit</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;