// pages/bulk-purchase.jsx
'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { 
  FiPlus, 
  FiTrash2, 
  FiShoppingCart, 
  FiCheckCircle, 
  FiXCircle,
  FiAlertCircle,
  FiSun,
  FiMoon,
  FiCopy,
  FiDownload,
  FiRefreshCw,
  FiInfo,
  FiCheck
} from 'react-icons/fi';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// Network Configuration with pricing
const NETWORKS = {
  YELLO: {
    name: 'MTN',
    color: 'yellow',
    prefixes: ['024', '054', '055', '059', '026', '025', '053', '027', '057', '023', '020', '050'],
    capacities: [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50, 100],
    prices: {
      1: 4.50, 2: 9.20, 3: 13.50, 4: 18.50, 5: 23.50,
      6: 27.00, 8: 35.50, 10: 43.50, 15: 62.50, 20: 83.00,
      25: 105.00, 30: 129.00, 40: 166.00, 50: 207.00, 100: 407.00
    }
  },
  at: {
    name: 'AirtelTigo',
    color: 'red',
    prefixes: ['026', '056', '027', '057', '023', '053'],
    capacities: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 25, 30, 40, 50],
    prices: {
      1: 3.95, 2: 8.35, 3: 13.25, 4: 16.50, 5: 19.50,
      6: 23.50, 8: 30.50, 10: 38.50, 12: 45.50, 15: 57.50,
      25: 95.00, 30: 115.00, 40: 151.00, 50: 190.00
    }
  },
  AT_PREMIUM: {
    name: 'AirtelTigo Premium',
    color: 'purple',
    prefixes: ['026', '056', '027', '057', '023', '053'],
    capacities: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 25, 30, 40, 50],
    prices: {
      1: 3.95, 2: 8.35, 3: 13.25, 4: 16.50, 5: 19.50,
      6: 23.50, 8: 30.50, 10: 38.50, 12: 45.50, 15: 57.50,
      25: 95.00, 30: 115.00, 40: 151.00, 50: 190.00
    }
  },
  TELECEL: {
    name: 'Telecel',
    color: 'blue',
    prefixes: ['020', '050'],
    capacities: [5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 100],
    prices: {
      5: 19.50, 8: 34.64, 10: 36.50, 12: 43.70, 15: 52.85,
      20: 69.80, 25: 86.75, 30: 103.70, 35: 120.65, 40: 137.60,
      45: 154.55, 50: 171.50, 100: 341.00
    }
  }
};

// Dark Mode Toggle Component
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="fixed top-4 right-4 p-3 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors z-50"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <FiSun className="w-5 h-5 text-yellow-500" />
      ) : (
        <FiMoon className="w-5 h-5 text-gray-700" />
      )}
    </button>
  );
};

// Main Bulk Purchase Component
export default function BulkPurchase() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [parsedPurchases, setParsedPurchases] = useState([]);
  const [validating, setValidating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Get user data from localStorage on component mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    const authToken = localStorage.getItem('authToken');
    
    if (!storedUserData || !authToken) {
      toast.error('User not authenticated. Please login to continue.');
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/SignUp');
      }, 2000);
      return;
    }
    
    try {
      const parsed = JSON.parse(storedUserData);
      setUserData(parsed);
      fetchWalletBalance(parsed.id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      toast.error('Invalid user data. Please login again.');
      setTimeout(() => {
        router.push('/SignUp');
      }, 2000);
    }
  }, [router]);

  // Fetch user wallet balance - using the dashboard endpoint
  const fetchWalletBalance = async (userId) => {
    if (!userId) return;
    
    setLoadingBalance(true);
    try {
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
        // Get the user balance from the dashboard data
        const { userBalance } = responseData.data;
        setWalletBalance(userBalance || 0);
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      toast.error('Failed to fetch wallet balance');
    } finally {
      setLoadingBalance(false);
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Detect network from phone number
  const detectNetwork = (phoneNumber) => {
    const cleanNumber = phoneNumber.replace(/[\s-]/g, '');
    if (cleanNumber.length < 3) return null;
    
    const prefix = cleanNumber.substring(0, 3);
    
    for (const [networkKey, network] of Object.entries(NETWORKS)) {
      if (network.prefixes.includes(prefix)) {
        return networkKey;
      }
    }
    return null;
  };

  // Parse bulk input
  const parseBulkInput = () => {
    if (!bulkInput.trim()) {
      toast.error('Please enter purchase data');
      return;
    }

    if (!selectedNetwork) {
      toast.error('Please select a network');
      return;
    }

    const lines = bulkInput.trim().split('\n');
    const purchases = [];
    const errors = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return; // Skip empty lines

      // Expected format: "phoneNumber capacity" or "phoneNumber,capacity"
      const parts = trimmedLine.split(/[\s,]+/);
      
      if (parts.length !== 2) {
        errors.push(`Line ${index + 1}: Invalid format. Use "phoneNumber capacity" (e.g., "0241234567 5")`);
        return;
      }

      const [phoneNumber, capacityStr] = parts;
      const capacity = parseInt(capacityStr);

      // Validate phone number
      if (!phoneNumber.match(/^0\d{9}$/)) {
        errors.push(`Line ${index + 1}: Invalid phone number format (${phoneNumber})`);
        return;
      }

      // Check if phone number matches selected network
      const detectedNetwork = detectNetwork(phoneNumber);
      if (detectedNetwork !== selectedNetwork && selectedNetwork !== 'AT_PREMIUM') {
        // AT_PREMIUM can use same prefixes as 'at'
        if (!(selectedNetwork === 'AT_PREMIUM' && detectedNetwork === 'at')) {
          errors.push(`Line ${index + 1}: Phone number ${phoneNumber} doesn't match selected network ${NETWORKS[selectedNetwork].name}`);
          return;
        }
      }

      // Validate capacity
      if (!NETWORKS[selectedNetwork].capacities.includes(capacity)) {
        errors.push(`Line ${index + 1}: Invalid capacity ${capacity}GB for ${NETWORKS[selectedNetwork].name}`);
        return;
      }

      // Get price
      const price = NETWORKS[selectedNetwork].prices[capacity];

      purchases.push({
        id: Date.now() + index,
        lineNumber: index + 1,
        phoneNumber,
        network: selectedNetwork,
        capacity,
        price,
        valid: true
      });
    });

    if (errors.length > 0) {
      toast.error(
        <div>
          <strong>Validation Errors:</strong>
          <ul className="mt-2 text-sm">
            {errors.slice(0, 3).map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
            {errors.length > 3 && <li>... and {errors.length - 3} more errors</li>}
          </ul>
        </div>,
        { duration: 6000 }
      );
      return;
    }

    if (purchases.length === 0) {
      toast.error('No valid purchases found');
      return;
    }

    setParsedPurchases(purchases);
    setShowPreview(true);
    toast.success(`Parsed ${purchases.length} valid purchases`);
  };

  // Validate purchases with backend
  const handleValidate = async () => {
    if (!userData || !userData.id) {
      toast.error('User not authenticated');
      return;
    }

    if (parsedPurchases.length === 0) {
      toast.error('No purchases to validate');
      return;
    }

    setValidating(true);
    
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await axios.post(`http://localhost:5000/api/validate-bulk-purchase`, {
        userId: userData.id,
        purchases: parsedPurchases.map(p => ({
          phoneNumber: p.phoneNumber,
          network: p.network,
          capacity: p.capacity,
          price: p.price
        }))
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      setValidationResults(response.data.data);
      
      if (response.data.data.summary.invalidPurchases > 0) {
        toast.error(`${response.data.data.summary.invalidPurchases} invalid purchases found`);
      } else if (!response.data.data.summary.hasSufficientBalance) {
        toast.error(`Insufficient balance. Need ${formatCurrency(response.data.data.summary.balanceShortfall)} more`);
      } else {
        toast.success('All purchases validated successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  // Process bulk purchase
  const handleBulkPurchase = async () => {
    if (!userData || !userData.id) {
      toast.error('User not authenticated');
      return;
    }

    if (parsedPurchases.length === 0) {
      toast.error('No purchases to process');
      return;
    }

    // Check if validation passed
    if (validationResults && !validationResults.summary.hasSufficientBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }
    
    setProcessing(true);
    
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await axios.post(`http://localhost:5000/api/bulk-purchase-data`, {
        userId: userData.id,
        purchases: parsedPurchases.map(p => ({
          phoneNumber: p.phoneNumber,
          network: p.network,
          capacity: p.capacity,
          price: p.price
        }))
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const data = response.data.data;
      
      if (response.data.status === 'success') {
        toast.success(
          `✅ All ${data.summary.successfulPurchases} purchases completed successfully!`,
          { duration: 5000 }
        );
        
        // Reset form
        setBulkInput('');
        setParsedPurchases([]);
        setValidationResults(null);
        setShowPreview(false);
        
        // Refresh wallet balance
        fetchWalletBalance(userData.id);
        
      } else if (response.data.status === 'partial_success') {
        toast.custom((t) => (
          <div className="bg-orange-100 dark:bg-orange-900 p-4 rounded-lg">
            <div className="flex items-start">
              <FiAlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-300 mt-0.5" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Partial Success
                </p>
                <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                  ✅ {data.summary.successfulPurchases} successful<br />
                  ❌ {data.summary.failedPurchases} failed
                </p>
              </div>
            </div>
          </div>
        ), { duration: 6000 });
      }
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk purchase failed');
    } finally {
      setProcessing(false);
    }
  };

  // Copy example format
  const copyExampleFormat = () => {
    const example = `0241234567 5
0551234567 10
0261234567 2
0201234567 15`;
    navigator.clipboard.writeText(example);
    toast.success('Example format copied to clipboard!');
  };

  // Export parsed purchases as CSV
  const exportAsCSV = () => {
    if (parsedPurchases.length === 0) {
      toast.error('No purchases to export');
      return;
    }

    const headers = ['Phone Number', 'Network', 'Capacity (GB)', 'Price (GHS)'];
    const rows = parsedPurchases.map(p => [p.phoneNumber, NETWORKS[p.network].name, p.capacity, p.price]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_purchase_${Date.now()}.csv`;
    a.click();
    
    toast.success('CSV exported successfully!');
  };

  // Calculate total cost
  const totalCost = parsedPurchases.reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Toaster position="top-right" />
      <ThemeToggle />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {userData?.name || userData?.email || 'User'}
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            Bulk Data Purchase
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400">
            Purchase multiple data bundles in a single transaction
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User
              </label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {userData ? userData.name || userData.email : 'Not logged in'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wallet Balance
              </label>
              <div className="flex items-center">
                {loadingBalance ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    <span className="ml-2 text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(walletBalance)}
                    </span>
                    <button
                      onClick={() => fetchWalletBalance(userData?.id)}
                      disabled={loadingBalance}
                      className="ml-3 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                    >
                      <FiRefreshCw className={`w-4 h-4 ${loadingBalance ? 'animate-spin' : ''}`} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Network
              </label>
              <select
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Network</option>
                {Object.entries(NETWORKS).map(([key, network]) => (
                  <option key={key} value={key}>
                    {network.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Instructions Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
          <div className="flex items-start">
            <FiInfo className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
                How to Use Bulk Purchase
              </h3>
              <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>1. Select your network from the dropdown above</li>
                <li>2. Enter each purchase on a new line using format: <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">phoneNumber capacity</code></li>
                <li>3. Example: <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">0241234567 5</code> for 5GB to 0241234567</li>
                <li>4. Click "Parse & Preview" to validate your input</li>
                <li>5. Review the preview and click "Process Bulk Purchase"</li>
              </ol>
              <button
                onClick={copyExampleFormat}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <FiCopy className="w-4 h-4" />
                Copy example format
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Input Area */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bulk Purchase Input
            </label>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={`Enter purchases (one per line):
0241234567 5
0551234567 10
0261234567 2`}
              className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
              spellCheck={false}
            />
            <div className="mt-2 flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Enter each purchase as: phoneNumber capacity</span>
              <span>{bulkInput.split('\n').filter(l => l.trim()).length} lines</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={parseBulkInput}
              disabled={!bulkInput.trim() || !selectedNetwork}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2 transition-colors disabled:cursor-not-allowed"
            >
              <FiCheck /> Parse & Preview
            </button>
            
            <button
              onClick={() => {
                setBulkInput('');
                setParsedPurchases([]);
                setShowPreview(false);
                setValidationResults(null);
              }}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && parsedPurchases.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Purchase Preview ({parsedPurchases.length} items)
              </h3>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Network
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Capacity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {parsedPurchases.map((purchase, index) => (
                    <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-300">
                        {purchase.phoneNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                        {NETWORKS[purchase.network].name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                        {purchase.capacity} GB
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                        {formatCurrency(purchase.price)}
                      </td>
                      <td className="px-6 py-4">
                        <FiCheckCircle className="w-5 h-5 text-green-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {parsedPurchases.length}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalCost)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Results */}
        {validationResults && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Validation Results
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Valid</p>
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {validationResults.summary.validPurchases}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Invalid</p>
                <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                  {validationResults.summary.invalidPurchases}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Balance</p>
                <p className={`text-xl font-semibold ${
                  validationResults.summary.hasSufficientBalance 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {validationResults.summary.hasSufficientBalance ? 'Sufficient' : 'Insufficient'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Shortfall</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(validationResults.summary.balanceShortfall)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showPreview && parsedPurchases.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleValidate}
                disabled={validating || processing}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
              >
                <FiCheckCircle />
                {validating ? 'Validating...' : 'Validate Purchases'}
              </button>
              
              <button
                onClick={exportAsCSV}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FiDownload /> Export CSV
              </button>
              
              <button
                onClick={handleBulkPurchase}
                disabled={processing || totalCost === 0 || totalCost > walletBalance || !validationResults?.summary.hasSufficientBalance}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
              >
                <FiShoppingCart />
                {processing ? 'Processing...' : `Process Bulk Purchase (${formatCurrency(totalCost)})`}
              </button>
            </div>
            
            {totalCost > walletBalance && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center">
                  <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                  <span className="text-sm text-red-800 dark:text-red-200">
                    Insufficient balance. You need {formatCurrency(totalCost - walletBalance)} more.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}