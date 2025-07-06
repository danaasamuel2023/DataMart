'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, Search, TrendingUp, Users, DollarSign, AlertTriangle, Download, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [todayData, setTodayData] = useState({
    date: new Date().toDateString(),
    stats: {
      totalTransfers: 0,
      totalAmount: 0,
      byWorker: {}
    },
    transfers: []
  });
  const [searchRef, setSearchRef] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);

  // Mock data for demonstration
  useEffect(() => {
    // Simulate fetching today's data
    setTodayData({
      date: new Date().toDateString(),
      stats: {
        totalTransfers: 45,
        totalAmount: 8750.50,
        byWorker: {
          'John Worker': { count: 20, amount: 3800 },
          'Jane Worker': { count: 15, amount: 2950.50 },
          'Mike Worker': { count: 10, amount: 2000 }
        }
      },
      transfers: [
        { _id: '1', createdAt: new Date(), momoReference: 'MOM123456', customerName: 'Customer A', customerPhone: '0241234567', amount: 150, workerName: 'John Worker', status: 'completed' },
        { _id: '2', createdAt: new Date(), momoReference: 'MOM789012', customerName: 'Customer B', customerPhone: '0551234567', amount: 200, workerName: 'Jane Worker', status: 'completed' },
        { _id: '3', createdAt: new Date(), momoReference: 'MOM345678', customerName: 'Customer C', customerPhone: '0201234567', amount: 350, workerName: 'Mike Worker', status: 'completed' }
      ]
    });
  }, []);

  const handleSearch = () => {
    if (!searchRef) return;
    
    // Simulate search
    const found = todayData.transfers.find(t => t.momoReference === searchRef);
    if (found) {
      setSearchResult(found);
    } else {
      setSearchResult({ notFound: true });
    }
  };

  const generateReport = () => {
    // Simulate report generation
    setReportData({
      totalTransfers: 234,
      totalAmount: 45670.50,
      dailyStats: {
        [dateRange.startDate]: { count: 45, amount: 8750.50 },
        [new Date(Date.now() - 86400000).toISOString().split('T')[0]]: { count: 52, amount: 9820.00 },
        [new Date(Date.now() - 172800000).toISOString().split('T')[0]]: { count: 48, amount: 9100.00 }
      }
    });
  };

  const refreshData = () => {
    // In real app, this would fetch fresh data
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <button
            onClick={refreshData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Today's Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Transfers Today</p>
                <p className="text-3xl font-bold text-gray-800">{todayData.stats.totalTransfers}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Amount Today</p>
                <p className="text-3xl font-bold text-green-600">GHS {todayData.stats.totalAmount.toFixed(2)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Workers</p>
                <p className="text-3xl font-bold text-purple-600">{Object.keys(todayData.stats.byWorker).length}</p>
              </div>
              <Users className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Search Transfer */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Search Transfer by Reference</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              placeholder="Enter MoMo reference"
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </button>
          </div>
          
          {searchResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              {searchResult.notFound ? (
                <p className="text-red-600">No transfer found with this reference</p>
              ) : (
                <div>
                  <p><strong>Reference:</strong> {searchResult.momoReference}</p>
                  <p><strong>Customer:</strong> {searchResult.customerName} ({searchResult.customerPhone})</p>
                  <p><strong>Amount:</strong> GHS {searchResult.amount.toFixed(2)}</p>
                  <p><strong>Worker:</strong> {searchResult.workerName}</p>
                  <p><strong>Time:</strong> {new Date(searchResult.createdAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Worker Performance */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Worker Performance Today</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(todayData.stats.byWorker).map(([workerName, stats]) => (
              <div key={workerName} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg">{workerName}</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Transfers: <span className="font-bold">{stats.count}</span></p>
                  <p className="text-sm text-gray-600">Amount: <span className="font-bold text-green-600">GHS {stats.amount.toFixed(2)}</span></p>
                  <p className="text-sm text-gray-600">Average: <span className="font-bold">GHS {(stats.amount / stats.count).toFixed(2)}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Date Range Report */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Generate Report</h2>
          <div className="flex gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={generateReport}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Generate Report
              </button>
            </div>
          </div>
          
          {reportData && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold mb-2">Report Summary</h3>
              <p>Total Transfers: <span className="font-bold">{reportData.totalTransfers}</span></p>
              <p>Total Amount: <span className="font-bold text-green-600">GHS {reportData.totalAmount.toFixed(2)}</span></p>
              <div className="mt-4">
                <h4 className="font-medium mb-2">Daily Breakdown:</h4>
                {Object.entries(reportData.dailyStats).map(([date, stats]) => (
                  <div key={date} className="flex justify-between py-1">
                    <span>{date}</span>
                    <span>{stats.count} transfers - GHS {stats.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Transfers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Transfers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Reference</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-left p-3">Worker</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayData.transfers.map((transfer) => (
                  <tr key={transfer._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{new Date(transfer.createdAt).toLocaleTimeString()}</td>
                    <td className="p-3 font-mono text-xs">{transfer.momoReference}</td>
                    <td className="p-3">{transfer.customerName}</td>
                    <td className="p-3">{transfer.customerPhone}</td>
                    <td className="p-3">{transfer.workerName}</td>
                    <td className="p-3 text-right font-semibold">GHS {transfer.amount.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                        {transfer.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}