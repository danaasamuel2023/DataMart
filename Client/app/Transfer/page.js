'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { 
  Send, 
  AlertCircle, 
  X, 
  CheckCircle, 
  User, 
  Phone, 
  Mail,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Search,
  Info,
  RefreshCw
} from 'lucide-react';

export default function WalletTransferPage() {
  // State variables
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transferDetails, setTransferDetails] = useState(null);
  const [transferHistory, setTransferHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer' or 'history'
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'sent', 'received'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  const router = useRouter();
  
  // Check authentication and get user data from localStorage
  useEffect(() => {
    const checkAuth = async () => {
      const userData = localStorage.getItem('userData');
      const token = localStorage.getItem('authToken');
      
      if (!userData || !token) {
        router.push('/SignIn');
        return;
      }
      
      try {
        const user = JSON.parse(userData);
        
        // Set user data
        setUserId(user.id);
        setUserEmail(user.email);
        setIsAuthenticated(true);
        
        // Check if account is disabled
        if (user.isDisabled) {
          setError('Your account is disabled. Transfers are not allowed.');
          return;
        }
        
        // Check account approval status
        if (user.approvalStatus === 'pending') {
          setError('Your account is pending approval. Please complete account activation to use transfers.');
          return;
        } else if (user.approvalStatus === 'rejected') {
          setError('Your account has not been approved. Please contact support.');
          return;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/SignIn');
      }
    };
    
    checkAuth();
  }, [router]);
  
  // Fetch transfer history when history tab is active
  useEffect(() => {
    if (activeTab === 'history' && isAuthenticated) {
      fetchTransferHistory();
    }
  }, [activeTab, historyFilter, isAuthenticated, router]);
  
  // Validate recipient as user types
  useEffect(() => {
    const validateRecipient = async () => {
      if (!recipient || recipient.length < 3 || !isAuthenticated) {
        setRecipientInfo(null);
        return;
      }
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        return;
      }
      
      setIsValidating(true);
      setError('');
      
      try {
        const response = await axios.get(
          `https://datamartbackened.onrender.com/api/v1/validate-recipient?identifier=${recipient}`,
          {
            headers: {
              'x-auth-token': token,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data.success) {
          setRecipientInfo(response.data.data);
        } else {
          setRecipientInfo(null);
          setError(response.data.error || 'Invalid recipient');
        }
      } catch (error) {
        if (error.response?.status === 404) {
          setError('User not found with this email or phone number');
        } else if (error.response?.status === 403) {
          setError('This account cannot receive transfers');
        } else if (error.response?.status === 401) {
          setError('Session expired. Please login again.');
          router.push('/SignIn');
        } else {
          setError('Unable to validate recipient');
        }
        setRecipientInfo(null);
      } finally {
        setIsValidating(false);
      }
    };
    
    const debounceTimer = setTimeout(validateRecipient, 500);
    return () => clearTimeout(debounceTimer);
  }, [recipient, isAuthenticated, router]);
  
  // Fetch transfer history
  const fetchTransferHistory = async () => {
    setHistoryLoading(true);
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication required');
      setHistoryLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(
        `https://datamartbackened.onrender.com/api/v1/transfer-history?type=${historyFilter}&limit=20`,
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        setTransferHistory(response.data.data.transfers || []);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
        router.push('/SignIn');
      } else {
        console.error('Error fetching transfer history:', error);
      }
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // Handle transfer form submission
  const handleTransfer = async (e) => {
    e.preventDefault();
    
    if (!recipientInfo) {
      setError('Please enter a valid recipient');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setShowConfirmModal(true);
  };
  
  // Confirm and process transfer
  const confirmTransfer = async () => {
    setShowConfirmModal(false);
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication required');
      setIsLoading(false);
      router.push('/SignIn');
      return;
    }
    
    try {
      const response = await axios.post(
        'https://datamartbackened.onrender.com/api/v1/transfer',
        {
          recipient: recipient,
          amount: parseFloat(amount),
          description: description || `Transfer to ${recipientInfo.username}`,
          pin: pin
        },
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        setTransferDetails(response.data.data);
        setShowSuccessModal(true);
        
        // Reset form
        setRecipient('');
        setAmount('');
        setDescription('');
        setPin('');
        setRecipientInfo(null);
        
        // Refresh history if on history tab
        if (activeTab === 'history') {
          fetchTransferHistory();
        }
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
        router.push('/SignIn');
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Transfer failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return `GHS ${parseFloat(amount).toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Check if user is authenticated
  if (!isAuthenticated) {
    return <div className="flex justify-center items-center min-h-screen text-gray-800 dark:text-gray-200">Checking authentication...</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto my-10 p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet Transfer</h1>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`pb-2 px-1 ${
              activeTab === 'transfer'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Send size={18} className="inline mr-2" />
            Send Money
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-1 ${
              activeTab === 'history'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Clock size={18} className="inline mr-2" />
            Transfer History
          </button>
        </div>
      </div>
      
      {/* Transfer Form */}
      {activeTab === 'transfer' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
              <AlertCircle size={18} className="inline mr-2" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-4">
              <CheckCircle size={18} className="inline mr-2" />
              {success}
            </div>
          )}
          
          <form onSubmit={handleTransfer}>
            {/* Recipient Input */}
            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                Recipient Email or Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter email or phone number"
                  className="w-full px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
                {isValidating && (
                  <div className="absolute right-3 top-3">
                    <RefreshCw size={18} className="animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Recipient Info Display */}
              {recipientInfo && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle size={18} className="text-green-600 dark:text-green-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        Recipient Found
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        {recipientInfo.username}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                Amount (GHS)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                className="w-full px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            
            {/* Description Input */}
            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this for?"
                className="w-full px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !recipientInfo || !amount}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                isLoading || !recipientInfo || !amount
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <RefreshCw size={18} className="animate-spin mr-2" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Send size={18} className="mr-2" />
                  Send Money
                </span>
              )}
            </button>
          </form>
          
          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start">
              <Info size={18} className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Transfer Information</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Transfers are instant and free</li>
                  <li>You can send to any DataMart user</li>
                  <li>Use email or phone number to identify recipients</li>
                  <li>Minimum transfer amount: GHS 0.01</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Transfer History */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {/* Filter Buttons */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setHistoryFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                historyFilter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setHistoryFilter('sent')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                historyFilter === 'sent'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Sent
            </button>
            <button
              onClick={() => setHistoryFilter('received')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                historyFilter === 'received'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Received
            </button>
          </div>
          
          {/* History List */}
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw size={24} className="animate-spin text-gray-400" />
            </div>
          ) : transferHistory.length > 0 ? (
            <div className="space-y-3">
              {transferHistory.map((transfer) => (
                <div
                  key={transfer.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-full mr-3 ${
                        transfer.type === 'sent'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-green-100 dark:bg-green-900/30'
                      }`}>
                        {transfer.type === 'sent' ? (
                          <ArrowUpRight size={20} className="text-red-600 dark:text-red-400" />
                        ) : (
                          <ArrowDownLeft size={20} className="text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {transfer.type === 'sent' ? 'Sent to' : 'Received from'}{' '}
                          {transfer.metadata?.recipientName || transfer.metadata?.senderName || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {transfer.description || 'No description'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatDate(transfer.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        transfer.type === 'sent'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {transfer.type === 'sent' ? '-' : '+'}{formatCurrency(transfer.amount)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Balance: {formatCurrency(transfer.balanceAfter)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No transfer history found</p>
            </div>
          )}
        </div>
      )}
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Confirm Transfer</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recipient:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {recipientInfo?.username}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(amount)}
                </span>
              </div>
              {description && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Description:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {description}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmTransfer}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Modal */}
      {showSuccessModal && transferDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transfer Successful!</h2>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Reference:</span>
                <span className="font-mono text-sm text-gray-900 dark:text-white">
                  {transferDetails.reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(transferDetails.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recipient:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {transferDetails.recipient.username}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">New Balance:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(transferDetails.sender.newBalance)}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}