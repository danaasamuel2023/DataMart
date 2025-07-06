// pages/transfers.js or components/TransferPage.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  DollarSign, 
  Search, 
  Calendar, 
  FileText, 
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Clock,
  CreditCard,
  Activity
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://datamartbackened.onrender.com/api';

export default function TransferPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('process');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchWalletBalance();
    } else {
      router.push('/login');
    }
  }, [router]);

  const fetchWalletBalance = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/transfers/wallet-balance`,
        { headers: getAuthHeader() }
      );
      setWalletBalance(response.data.walletBalance);
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    }
  };

  const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return { 'x-auth-token': token };
  };

  // Determine available tabs based on user role
  const availableTabs = user?.role === 'admin' 
    ? ['process', 'today', 'search', 'report']
    : ['process', 'my-transfers'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-6 p-6 transform transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white animate-fade-in">
              Transfer Management
            </h1>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Welcome,</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</span>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                {user?.role}
              </span>
              {(user?.role === 'worker' || user?.role === 'admin') && (
                <div className="ml-4 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                  Balance: GHS {walletBalance.toFixed(2)}
                </div>
              )}
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-hide">
              {availableTabs.includes('process') && (
                <button
                  onClick={() => setActiveTab('process')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 transform hover:scale-105 ${
                    activeTab === 'process'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <DollarSign className="inline w-4 h-4 mr-2" />
                  Process Payment
                </button>
              )}
              
              {availableTabs.includes('today') && (
                <button
                  onClick={() => setActiveTab('today')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 transform hover:scale-105 ${
                    activeTab === 'today'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Calendar className="inline w-4 h-4 mr-2" />
                  Today's Transfers
                </button>
              )}
              
              {availableTabs.includes('search') && (
                <button
                  onClick={() => setActiveTab('search')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 transform hover:scale-105 ${
                    activeTab === 'search'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Search className="inline w-4 h-4 mr-2" />
                  Search
                </button>
              )}
              
              {availableTabs.includes('report') && (
                <button
                  onClick={() => setActiveTab('report')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 transform hover:scale-105 ${
                    activeTab === 'report'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <FileText className="inline w-4 h-4 mr-2" />
                  Reports
                </button>
              )}
              
              {availableTabs.includes('my-transfers') && (
                <button
                  onClick={() => setActiveTab('my-transfers')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 transform hover:scale-105 ${
                    activeTab === 'my-transfers'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <User className="inline w-4 h-4 mr-2" />
                  My Transfers
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl animate-slide-up">
          {activeTab === 'process' && <ProcessPayment getAuthHeader={getAuthHeader} onBalanceUpdate={setWalletBalance} />}
          {activeTab === 'today' && <TodayTransfers getAuthHeader={getAuthHeader} />}
          {activeTab === 'search' && <SearchTransfer getAuthHeader={getAuthHeader} />}
          {activeTab === 'report' && <ReportView getAuthHeader={getAuthHeader} />}
          {activeTab === 'my-transfers' && <MyTransfers getAuthHeader={getAuthHeader} />}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// Process Payment Component
function ProcessPayment({ getAuthHeader, onBalanceUpdate }) {
  const [formData, setFormData] = useState({
    momoReference: '',
    customerPhone: '',
    customerName: '',
    amount: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/transfers/wallet-balance`,
        { headers: getAuthHeader() }
      );
      setWalletBalance(response.data.walletBalance);
      if (onBalanceUpdate) {
        onBalanceUpdate(response.data.walletBalance);
      }
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if amount exceeds wallet balance
    const transferAmount = parseFloat(formData.amount);
    if (transferAmount > walletBalance) {
      setError(`Insufficient wallet balance. Your balance: GHS ${walletBalance.toFixed(2)}`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/transfers/process-momo`,
        {
          ...formData,
          amount: transferAmount
        },
        { headers: getAuthHeader() }
      );

      setSuccess(response.data.data);
      setWalletBalance(response.data.data.workerNewBalance);
      if (onBalanceUpdate) {
        onBalanceUpdate(response.data.data.workerNewBalance);
      }
      setFormData({ momoReference: '', customerPhone: '', customerName: '', amount: '' });
    } catch (err) {
      if (err.response?.data?.workerBalance !== undefined) {
        setWalletBalance(err.response.data.workerBalance);
        if (onBalanceUpdate) {
          onBalanceUpdate(err.response.data.workerBalance);
        }
      }
      setError(err.response?.data?.error || 'Failed to process transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 mb-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-sm font-medium">Your Wallet Balance</p>
            {loadingBalance ? (
              <div className="h-8 w-32 bg-white/20 rounded animate-pulse mt-2"></div>
            ) : (
              <p className="text-3xl font-bold mt-2">GHS {walletBalance.toFixed(2)}</p>
            )}
          </div>
          <div className="p-4 bg-white/20 rounded-full">
            <CreditCard className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="flex items-center mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white ml-4">Process MoMo Payment</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="group">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            MoMo Reference Number *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 group-hover:border-blue-400"
            value={formData.momoReference}
            onChange={(e) => setFormData({ ...formData, momoReference: e.target.value })}
            placeholder="Enter MoMo reference"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            Customer Phone Number *
          </label>
          <input
            type="tel"
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 group-hover:border-blue-400"
            value={formData.customerPhone}
            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
            placeholder="0241234567"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            Customer Name (Optional)
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 group-hover:border-blue-400"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            placeholder="Customer name"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            Amount (GHS) *
          </label>
          <input
            type="number"
            step="0.01"
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 group-hover:border-blue-400"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg animate-shake">
            <AlertCircle className="inline w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg animate-bounce-in">
            <CheckCircle className="inline w-4 h-4 mr-2" />
            Transfer processed successfully!
            <div className="mt-2 text-sm space-y-1">
              <p>Reference: <span className="font-semibold">{success.reference}</span></p>
              <p>Amount: <span className="font-semibold">GHS {success.amount}</span></p>
              <p>Customer: <span className="font-semibold">{success.customerName}</span></p>
              <p>Customer New Balance: <span className="font-semibold">GHS {success.customerNewBalance}</span></p>
              <p className="text-yellow-300 mt-2">Your New Balance: <span className="font-semibold">GHS {success.workerNewBalance}</span></p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <RefreshCw className="inline w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="inline w-5 h-5 mr-2" />
              Process Transfer
            </>
          )}
        </button>
      </form>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes bounce-in {
          0% { 
            opacity: 0;
            transform: scale(0.3);
          }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}

// Today's Transfers Component
function TodayTransfers({ getAuthHeader }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTodayTransfers();
  }, []);

  const fetchTodayTransfers = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/transfers/today`,
        { headers: getAuthHeader() }
      );
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch transfers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-12">
      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
  
  if (error) return (
    <div className="text-red-600 dark:text-red-400 text-center py-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
      {error}
    </div>
  );
  
  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Today's Transfers - {data.date}
        </h2>
        <button
          onClick={fetchTodayTransfers}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Transfers</p>
              <p className="text-3xl font-bold text-white mt-2">{data.stats.totalTransfers}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Amount</p>
              <p className="text-3xl font-bold text-white mt-2">GHS {data.stats.totalAmount.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Active Workers</p>
              <p className="text-3xl font-bold text-white mt-2">{Object.keys(data.stats.byWorker).length}</p>
            </div>
            <User className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Worker Statistics */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Performance by Worker</h3>
        <div className="space-y-3">
          {Object.entries(data.stats.byWorker).map(([worker, stats], index) => (
            <div 
              key={worker} 
              className="flex justify-between items-center py-4 px-6 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 transform hover:scale-[1.02]"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{worker}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">{stats.count} transfers</p>
                <p className="font-semibold text-gray-900 dark:text-white">GHS {stats.amount.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transfers */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Transfers</h3>
        <div className="overflow-hidden rounded-lg shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.transfers.slice(0, 10).map((transfer, index) => (
                  <tr 
                    key={transfer._id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{transfer.customerName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{transfer.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {transfer.momoReference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {transfer.workerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        GHS {transfer.amount.toFixed(2)}
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

// Search Transfer Component
function SearchTransfer({ getAuthHeader }) {
  const [reference, setReference] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/transfers/search/${reference}`,
        { headers: getAuthHeader() }
      );
      setResult(response.data.transfer);
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
          <Search className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white ml-4">Search Transfer</h2>
      </div>
      
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            required
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Enter MoMo reference number"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg transform transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4 animate-shake">
          <AlertCircle className="inline w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      {result && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 shadow-lg animate-slide-up">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-6 text-lg">Transfer Details</h3>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Reference</dt>
              <dd className="text-sm font-semibold text-gray-900 dark:text-white">{result.momoReference}</dd>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</dt>
              <dd className="text-sm font-semibold text-green-600 dark:text-green-400">GHS {result.amount.toFixed(2)}</dd>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer</dt>
              <dd className="text-sm font-semibold text-gray-900 dark:text-white">{result.customerName}</dd>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</dt>
              <dd className="text-sm font-semibold text-gray-900 dark:text-white">{result.customerPhone}</dd>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Worker</dt>
              <dd className="text-sm font-semibold text-gray-900 dark:text-white">{result.workerName}</dd>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date</dt>
              <dd className="text-sm font-semibold text-gray-900 dark:text-white">
                {new Date(result.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</dt>
              <dd className="inline-flex items-center px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                <CheckCircle className="w-3 h-3 mr-1" />
                {result.status}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

// Report Component
function ReportView({ getAuthHeader }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await axios.get(
        `${API_BASE_URL}/transfers/report?${params}`,
        { headers: getAuthHeader() }
      );
      setReport(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white ml-4">Generate Report</h2>
      </div>
      
      <form onSubmit={handleGenerateReport} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white transition-all duration-200 group-hover:border-orange-400"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white transition-all duration-200 group-hover:border-orange-400"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold px-6 py-3 rounded-lg transform transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <RefreshCw className="inline w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="inline w-5 h-5 mr-2" />
              Generate Report
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
          <AlertCircle className="inline w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      {report && (
        <div className="animate-slide-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105">
              <p className="text-blue-100 text-sm">Total Transfers</p>
              <p className="text-3xl font-bold text-white mt-2">{report.totalTransfers}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105">
              <p className="text-green-100 text-sm">Total Amount</p>
              <p className="text-3xl font-bold text-white mt-2">GHS {report.totalAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Daily Breakdown */}
          {Object.keys(report.dailyStats).length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Daily Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(report.dailyStats).map(([date, stats], index) => (
                  <div 
                    key={date} 
                    className="flex justify-between items-center py-4 px-6 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mr-3">
                        <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{date}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stats.count} transfers</p>
                      <p className="font-semibold text-gray-900 dark:text-white">GHS {stats.amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// My Transfers Component
function MyTransfers({ getAuthHeader }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyTransfers();
  }, []);

  const fetchMyTransfers = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/transfers/my-transfers`,
        { headers: getAuthHeader() }
      );
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch transfers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-12">
      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
  
  if (error) return (
    <div className="text-red-600 dark:text-red-400 text-center py-8">
      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
      {error}
    </div>
  );
  
  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Transfers Today</h2>
        <button
          onClick={fetchMyTransfers}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Transfers</p>
              <p className="text-3xl font-bold text-white mt-2">{data.count}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Amount</p>
              <p className="text-3xl font-bold text-white mt-2">GHS {data.totalAmount.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-200" />
          </div>
        </div>
      </div>

      {/* Transfers List */}
      {data.transfers.length > 0 ? (
        <div className="overflow-hidden rounded-lg shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <Clock className="inline w-4 h-4 mr-1" />
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.transfers.map((transfer, index) => (
                  <tr 
                    key={transfer._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(transfer.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{transfer.customerName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{transfer.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {transfer.momoReference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        GHS {transfer.amount.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No transfers yet today</p>
        </div>
      )}
    </div>
  );
}