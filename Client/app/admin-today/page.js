'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DashboardSummary = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/today');
        setDashboardData(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  if (!dashboardData) {
    return <div className="p-4 text-center">No dashboard data available</div>;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GHS', // Assuming Ghanaian Cedis based on networks like YELLO, TELECEL
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Daily Dashboard Summary</h1>
      <h2 className="text-lg font-semibold mb-4">{formatDate(dashboardData.date)}</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <h3 className="text-gray-500 font-medium">Total Orders</h3>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">{dashboardData.orders.total}</span>
            <span className="text-lg">{formatCurrency(dashboardData.orders.totalAmount)}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <h3 className="text-gray-500 font-medium">Total Deposits</h3>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">{dashboardData.deposits.total}</span>
            <span className="text-lg">{formatCurrency(dashboardData.deposits.totalAmount)}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <h3 className="text-gray-500 font-medium">New Users</h3>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">{dashboardData.newUsers}</span>
          </div>
        </div>
      </div>
      
      {/* Order Status Breakdown */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Orders by Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg shadow p-3">
            <h4 className="text-green-600 font-medium">Completed</h4>
            <div className="flex justify-between mt-2">
              <span className="font-bold">{dashboardData.orders.byStatus.completed || 0}</span>
              <span>{formatCurrency(dashboardData.orders.completedAmount)}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3">
            <h4 className="text-yellow-600 font-medium">Pending</h4>
            <div className="flex justify-between mt-2">
              <span className="font-bold">{dashboardData.orders.byStatus.pending || 0}</span>
              <span>{formatCurrency(dashboardData.orders.pendingAmount)}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3">
            <h4 className="text-red-600 font-medium">Failed</h4>
            <div className="flex justify-between mt-2">
              <span className="font-bold">{dashboardData.orders.byStatus.failed || 0}</span>
              <span>{formatCurrency(dashboardData.orders.failedAmount)}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3">
            <h4 className="text-blue-600 font-medium">Waiting</h4>
            <div className="flex justify-between mt-2">
              <span className="font-bold">{dashboardData.orders.byStatus.waiting || 0}</span>
              <span>{formatCurrency(dashboardData.orders.waitingAmount)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Network Breakdown */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Orders by Network</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dashboardData.orders.byNetwork.map((network) => (
                <tr key={network._id}>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{network._id}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{network.count}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{formatCurrency(network.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardSummary;