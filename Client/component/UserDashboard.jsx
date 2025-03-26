'use client'
import React, { useState, useEffect } from 'react';
import { CreditCard, Package, Database, DollarSign, TrendingUp, Calendar, ArrowUp, ArrowDown, AlertCircle, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const TransactionsNotification = ({ pendingCount, onClick }) => {
  return (
    <div className="mb-6 bg-white rounded-lg shadow overflow-hidden border-l-4" style={{ borderLeftColor: "#ffcc00" }}>
      <div className="p-4 flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="ml-3 w-full">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-medium text-gray-900">Transactions Management</h3>
            {pendingCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {pendingCount} pending
              </span>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-500">
            <p>
              View your transaction history and verify any uncredited payments. 
              {pendingCount > 0 ? " You have pending transactions that might need verification." : ""}
            </p>
          </div>
          <div className="mt-3">
            <button
              onClick={onClick}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white"
              style={{ backgroundColor: "#ffcc00" }}
            >
              View Transactions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DepositNotification = ({ onClick }) => {
  return (
    <div className="mb-6 bg-white rounded-lg shadow overflow-hidden border-l-4" style={{ borderLeftColor: "#ffcc00" }}>
      <div className="p-4 flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          <PlusCircle className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="ml-3 w-full">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-medium text-gray-900">Add Funds to Your Account</h3>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            <p>
              Need more credits? Deposit money into your account to continue selling data packages without interruption.
            </p>
          </div>
          <div className="mt-3">
            <button
              onClick={onClick}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white"
              style={{ backgroundColor: "#ffcc00" }}
            >
              Deposit Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [pendingTransactions, setPendingTransactions] = useState(0);

  const ViewAll = () => {
    router.push('/orders');
  };

  const navigateToTransactions = () => {
    router.push('/myorders');
  };

  const navigateToTopup = () => {
    router.push('/topup');
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
    fetchDashboardData(userData.id);
    fetchPendingTransactionsCount(userData.id);
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
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // You might want to show an error message to the user
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending transactions count
  const fetchPendingTransactionsCount = async (userId) => {
    try {
      const authToken = localStorage.getItem('authToken');
      
      const response = await fetch(`https://datamartbackened.onrender.com/api/v1/user-transactions/${userId}?status=pending`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending transactions');
      }

      const responseData = await response.json();
      
      if (responseData.success) {
        setPendingTransactions(responseData.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
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
        {/* Transactions Notification */}
        <TransactionsNotification 
          pendingCount={pendingTransactions} 
          onClick={navigateToTransactions} 
        />

        {/* Deposit Notification */}
        <DepositNotification
          onClick={navigateToTopup}
        />

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
                <button
                  onClick={navigateToTopup}
                  className="mt-2 text-xs font-medium px-2 py-1 rounded-full text-white"
                  style={{ backgroundColor: mtnYellow }}
                >
                  Deposit
                </button>
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
                      <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                onClick={() => router.push('/orders')}
                className="rounded-lg p-4 flex flex-col items-center transition-colors"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <Database className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Manage Data</span>
              </button>
              <button 
                onClick={() => router.push('/topup')}
                className="rounded-lg p-4 flex flex-col items-center transition-colors"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <CreditCard className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Add Credit</span>
              </button>
              <button 
                onClick={navigateToTransactions}
                className="rounded-lg p-4 flex flex-col items-center transition-colors"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <AlertCircle className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Transactions</span>
              </button>
              <button 
                onClick={navigateToTopup}
                className="rounded-lg p-4 flex flex-col items-center transition-colors"
                style={{ backgroundColor: `${mtnYellow}20`, color: mtnYellow }}>
                <PlusCircle className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Deposit Money</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;