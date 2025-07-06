'use client';
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Search, DollarSign, User, Phone, Hash } from 'lucide-react';

export default function WorkerDashboard() {
  const [momoReference, setMomoReference] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [todayTransfers, setTodayTransfers] = useState([]);
  const [todayStats, setTodayStats] = useState({ count: 0, totalAmount: 0 });

  // Mock data for demonstration
  useEffect(() => {
    // Simulate fetching transfers
    setTodayTransfers([
      { _id: '1', createdAt: new Date(), momoReference: 'MOM123456', customerName: 'John Doe', customerPhone: '0241234567', amount: 150, status: 'completed' },
      { _id: '2', createdAt: new Date(), momoReference: 'MOM789012', customerName: 'Jane Smith', customerPhone: '0551234567', amount: 200, status: 'completed' }
    ]);
    setTodayStats({ count: 2, totalAmount: 350 });
  }, []);

  const handleSubmit = async () => {
    if (!momoReference || !customerPhone || !amount) {
      setMessage({ text: 'Please fill all required fields', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    // Simulate API call
    setTimeout(() => {
      setMessage({ text: `Success! GHS ${amount} credited to ${customerName || customerPhone}`, type: 'success' });
      // Add to transfers list
      const newTransfer = {
        _id: Date.now().toString(),
        createdAt: new Date(),
        momoReference,
        customerName: customerName || 'Unknown',
        customerPhone,
        amount: parseFloat(amount),
        status: 'completed'
      };
      setTodayTransfers([newTransfer, ...todayTransfers]);
      setTodayStats({
        count: todayStats.count + 1,
        totalAmount: todayStats.totalAmount + parseFloat(amount)
      });
      // Clear inputs
      setMomoReference('');
      setCustomerPhone('');
      setCustomerName('');
      setAmount('');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Worker Dashboard</h1>
        
        {/* Stats Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Today's Performance</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-gray-600">Transfers Processed</p>
              <p className="text-2xl font-bold text-blue-600">{todayStats.count}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">GHS {todayStats.totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Process Transfer Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Process MoMo Transfer</h2>
          
          {message.text && (
            <div className={`mb-4 p-4 rounded flex items-center ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message.type === 'success' ? <CheckCircle className="mr-2" /> : <AlertCircle className="mr-2" />}
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Hash className="inline w-4 h-4 mr-1" />
                MoMo Reference Number
              </label>
              <input
                type="text"
                value={momoReference}
                onChange={(e) => setMomoReference(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter MoMo reference"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="inline w-4 h-4 mr-1" />
                Customer Phone Number
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0241234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline w-4 h-4 mr-1" />
                Customer Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Amount (GHS)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="100.00"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? 'Processing...' : 'Process Transfer'}
            </button>
          </div>
        </div>

        {/* Recent Transfers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Today's Transfers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Reference</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayTransfers.map((transfer) => (
                  <tr key={transfer._id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{new Date(transfer.createdAt).toLocaleTimeString()}</td>
                    <td className="p-2 font-mono text-xs">{transfer.momoReference}</td>
                    <td className="p-2">{transfer.customerName}</td>
                    <td className="p-2">{transfer.customerPhone}</td>
                    <td className="p-2 text-right font-semibold">GHS {transfer.amount.toFixed(2)}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        transfer.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {transfer.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {todayTransfers.length === 0 && (
              <p className="text-center text-gray-500 py-4">No transfers processed today</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}