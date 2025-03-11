// pages/purchase-data.js
'use client'
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function PurchaseData() {
  // State variables
  const [apiKey, setApiKey] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedCapacity, setSelectedCapacity] = useState('');
  const [dataPackages, setDataPackages] = useState({});
  const [networkPackages, setNetworkPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Fetch data packages on component mount
  useEffect(() => {
    fetchDataPackages();
  }, []);

  // Update available packages when network changes
  useEffect(() => {
    if (selectedNetwork && dataPackages[selectedNetwork]) {
      setNetworkPackages(dataPackages[selectedNetwork]);
      setSelectedCapacity(''); // Reset capacity when network changes
    } else {
      setNetworkPackages([]);
    }
  }, [selectedNetwork, dataPackages]);

  // Fetch available data packages
  const fetchDataPackages = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/developer/data-packages');
      const data = await response.json();
      
      if (data.status === 'success') {
        setDataPackages(data.data);
      } else {
        setError('Failed to load data packages');
      }
    } catch (err) {
      setError('Network error when fetching data packages');
      console.error('Error fetching data packages:', err);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!apiKey || !phoneNumber || !selectedNetwork || !selectedCapacity) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:5000/api/developer/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          phoneNumber,
          network: selectedNetwork,
          capacity: selectedCapacity,
          gateway: 'wallet'
        })
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setResult(data.data);
      } else {
        setError(data.message || 'Failed to purchase data');
      }
    } catch (err) {
      setError('Network error when purchasing data');
      console.error('Error purchasing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Format price for display
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Head>
        <title>DataMart - Purchase Data</title>
        <meta name="description" content="Purchase data with your API key" />
      </Head>
      
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-8">DataMart - Purchase Data</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="text"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your API key"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter recipient phone number"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="network" className="block text-sm font-medium text-gray-700 mb-1">
              Network
            </label>
            <select
              id="network"
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select network</option>
              <option value="TELECEL">TELECEL</option>
              <option value="YELLO">MTN (YELLO)</option>
              <option value="AT_PREMIUM">AirtelTigo (AT_PREMIUM)</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label htmlFor="package" className="block text-sm font-medium text-gray-700 mb-1">
              Data Package
            </label>
            <select
              id="package"
              value={selectedCapacity}
              onChange={(e) => setSelectedCapacity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!selectedNetwork || networkPackages.length === 0}
              required
            >
              <option value="">
                {!selectedNetwork 
                  ? 'Select network first' 
                  : networkPackages.length === 0 
                    ? 'Loading packages...' 
                    : 'Select data package'}
              </option>
              {networkPackages.map((pkg) => (
                <option key={`${pkg.network}-${pkg.capacity}`} value={pkg.capacity}>
                  {pkg.capacity}GB ({pkg.mb}MB) - GHS {formatPrice(pkg.price)}
                </option>
              ))}
            </select>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Purchase Data'}
          </button>
        </form>
        
        {error && (
          <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}
        
        {result && (
          <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Purchase Successful</h3>
                <div className="mt-2 text-sm text-green-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Network: {result.network}</li>
                    <li>Data: {result.capacity}GB ({result.mb}MB)</li>
                    <li>Price: GHS {formatPrice(result.price)}</li>
                    <li>Transaction Reference: {result.transactionReference}</li>
                    <li>Remaining Balance: GHS {formatPrice(result.remainingBalance)}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}