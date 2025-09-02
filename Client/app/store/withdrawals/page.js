// ========== app/store/withdrawals/page.jsx ==========
'use client';
import { useState, useEffect } from 'react';
import { Wallet, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [store, setStore] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      // Get store data
      const storeResponse = await fetch(`https://datamartbackened.onrender.com/api/v1/agent-stores/agent/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (storeResponse.ok) {
        const storeData = await storeResponse.json();
        setStore(storeData.data);
        
        // Get withdrawals
        const withdrawalsResponse = await fetch(
          `https://datamartbackened.onrender.com/api/v1/agent-stores/stores/${storeData.data._id}/withdrawals`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (withdrawalsResponse.ok) {
          const withdrawalsData = await withdrawalsResponse.json();
          setWithdrawals(withdrawalsData.data.withdrawals || []);
        }
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Withdrawals</h1>
        <p className="text-gray-600">Manage your earnings and withdrawal requests</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Available Balance</p>
            <Wallet className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            ₵{store?.wallet?.availableBalance?.toFixed(2) || '0.00'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Pending</p>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            ₵{store?.wallet?.pendingBalance?.toFixed(2) || '0.00'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Withdrawn</p>
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold">
            ₵{store?.wallet?.totalWithdrawn?.toFixed(2) || '0.00'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Min. Withdrawal</p>
            <AlertCircle className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-2xl font-bold">
            ₵{store?.withdrawalSettings?.minimumWithdrawal || '10.00'}
          </p>
        </div>
      </div>

      {/* Request Withdrawal Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowModal(true)}
          disabled={store?.wallet?.availableBalance < (store?.withdrawalSettings?.minimumWithdrawal || 10)}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Request Withdrawal
        </button>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Withdrawal History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {withdrawals.length > 0 ? (
                withdrawals.map((withdrawal) => (
                  <tr key={withdrawal._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">{withdrawal.withdrawalId}</td>
                    <td className="px-6 py-4 text-sm">₵{withdrawal.requestedAmount?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">₵{withdrawal.fee?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-semibold">₵{withdrawal.netAmount?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm uppercase">{withdrawal.method}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(withdrawal.status)}
                        <span className={`text-sm ${
                          withdrawal.status === 'completed' ? 'text-green-600' :
                          withdrawal.status === 'pending' ? 'text-yellow-600' :
                          withdrawal.status === 'rejected' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {withdrawal.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No withdrawal requests yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showModal && (
        <WithdrawalModal
          store={store}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            fetchWithdrawals();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

// Withdrawal Modal Component
function WithdrawalModal({ store, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    amount: '',
    method: 'momo',
    paymentDetails: {
      momoNetwork: '',
      momoNumber: '',
      momoName: '',
      bankName: '',
      accountNumber: '',
      accountName: ''
    },
    agentNotes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const agentId = localStorage.getItem('userId');
      
      const response = await fetch(
        `https://datamartbackened.onrender.com/api/v1/agent-stores/stores/${store._id}/withdraw`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData,
            agentId
          })
        }
      );
      
      if (response.ok) {
        alert('Withdrawal request submitted successfully!');
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit withdrawal request');
      }
    } catch (error) {
      alert('Error submitting withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  const withdrawalFee = formData.amount ? (formData.amount * 0.01).toFixed(2) : '0.00';
  const netAmount = formData.amount ? (formData.amount - withdrawalFee).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Request Withdrawal</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Amount (₵)</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              min={store.withdrawalSettings?.minimumWithdrawal || 10}
              max={store.wallet?.availableBalance}
            />
            <p className="mt-1 text-xs text-gray-500">
              Available: ₵{store.wallet?.availableBalance?.toFixed(2)}
            </p>
          </div>

          {formData.amount > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Withdrawal Fee (1%):</span>
                <span>₵{withdrawalFee}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>You'll Receive:</span>
                <span className="text-green-600">₵{netAmount}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <select
              value={formData.method}
              onChange={(e) => setFormData({...formData, method: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="momo">Mobile Money</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          {formData.method === 'momo' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">MoMo Network</label>
                <select
                  value={formData.paymentDetails.momoNetwork}
                  onChange={(e) => setFormData({
                    ...formData,
                    paymentDetails: {...formData.paymentDetails, momoNetwork: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Network</option>
                  <option value="mtn">MTN</option>
                  <option value="vodafone">Vodafone</option>
                  <option value="airteltigo">AirtelTigo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">MoMo Number</label>
                <input
                  type="tel"
                  value={formData.paymentDetails.momoNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    paymentDetails: {...formData.paymentDetails, momoNumber: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Account Name</label>
                <input
                  type="text"
                  value={formData.paymentDetails.momoName}
                  onChange={(e) => setFormData({
                    ...formData,
                    paymentDetails: {...formData.paymentDetails, momoName: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </>
          )}

          {formData.method === 'bank' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Bank Name</label>
                <input
                  type="text"
                  value={formData.paymentDetails.bankName}
                  onChange={(e) => setFormData({
                    ...formData,
                    paymentDetails: {...formData.paymentDetails, bankName: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Account Number</label>
                <input
                  type="text"
                  value={formData.paymentDetails.accountNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    paymentDetails: {...formData.paymentDetails, accountNumber: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Account Name</label>
                <input
                  type="text"
                  value={formData.paymentDetails.accountName}
                  onChange={(e) => setFormData({
                    ...formData,
                    paymentDetails: {...formData.paymentDetails, accountName: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
            <textarea
              value={formData.agentNotes}
              onChange={(e) => setFormData({...formData, agentNotes: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== app/store/transactions/page.jsx ==========
'use client';
import { useState, useEffect } from 'react';
import { Search, Filter, Download, TrendingUp, TrendingDown, Package } from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    search: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      // Get store ID first
      const storeResponse = await fetch(`https://datamartbackened.onrender.com/api/v1/agent-stores/agent/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (storeResponse.ok) {
        const storeData = await storeResponse.json();
        
        // Fetch transactions
        let url = `https://datamartbackened.onrender.com/api/v1/agent-stores/stores/${storeData.data._id}/transactions?`;
        if (filters.status !== 'all') url += `status=${filters.status}&`;
        
        const transactionsResponse = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setTransactions(transactionsData.data.transactions || []);
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Date', 'Customer', 'Product', 'Amount', 'Profit', 'Status'],
      ...transactions.map(t => [
        new Date(t.createdAt).toLocaleString(),
        t.customerPhone,
        `${t.network} ${t.capacity}GB`,
        t.sellingPrice,
        t.netProfit,
        t.orderStatus
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.sellingPrice || 0), 0);
  const totalProfit = transactions.reduce((sum, t) => sum + (t.netProfit || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Transactions</h1>
        <p className="text-gray-600">View and manage all your store transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
          <p className="text-2xl font-bold">{transactions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-600">₵{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Profit</p>
          <p className="text-2xl font-bold text-green-600">₵{totalProfit.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by phone number..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <p className="font-medium">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{new Date(transaction.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">{transaction.transactionId}</td>
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <p className="font-medium">{transaction.customerName || 'Guest'}</p>
                        <p className="text-xs text-gray-500">{transaction.customerPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-gray-400" />
                        {transaction.network} {transaction.capacity}GB
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      ₵{transaction.sellingPrice?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1 text-green-600 font-semibold">
                        <TrendingUp className="w-4 h-4" />
                        ₵{transaction.netProfit?.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        transaction.orderStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        transaction.orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaction.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No transactions found
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