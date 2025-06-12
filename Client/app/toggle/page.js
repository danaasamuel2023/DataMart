'use client'
import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function InventoryPage() {
  // Predefined networks
  const NETWORKS = ["YELLO", "TELECEL", "AT_PREMIUM", "airteltigo", "at"];
  
  const [inventoryStatus, setInventoryStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  // Initialize dark mode
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      setDarkMode(savedMode === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Get token from localStorage on component mount
  useEffect(() => {
    // Get the token from localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      // Load current inventory status when token is available
      loadInventoryStatus(token);
    } else {
      setError('Authentication token not found. Please login first.');
    }
  }, []);

  // Configure axios-like fetch with auth token
  const fetchWithAuth = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-auth-token': authToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  };

  // Load current inventory status from backend
  const loadInventoryStatus = async (token) => {
    try {
      setLoading(true);
      const response = await fetch('https://datamartbackened.onrender.com/api/inventory', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load inventory');
      }
      
      const data = await response.json();
      
      // Convert array to object for easier access
      const statusObj = {};
      data.inventory.forEach(item => {
        statusObj[item.network] = {
          inStock: item.inStock,
          skipGeonettech: item.skipGeonettech,
          updatedAt: item.updatedAt
        };
      });
      
      setInventoryStatus(statusObj);
    } catch (err) {
      console.error('Failed to load inventory status:', err);
      setError('Failed to load inventory status');
    } finally {
      setLoading(false);
    }
  };

  // Toggle inventory item status (in stock / out of stock)
  const toggleItemStatus = async (network) => {
    if (!authToken) {
      setError('Authentication token not found. Please login first.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchWithAuth(
        `https://datamartbackened.onrender.com/api/inventory/${network}/toggle`,
        { method: 'PUT' }
      );
      
      // Update the local state with the response
      setInventoryStatus(prev => ({
        ...prev,
        [network]: {
          ...prev[network],
          inStock: data.inStock,
          updatedAt: data.updatedAt || new Date().toISOString()
        }
      }));
      
      // Show success message
      setSuccessMessage(data.message || `${network} status toggled successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      if (err.message.includes('401')) {
        setError('Your session has expired. Please login again.');
      } else {
        setError(`Failed to toggle status for ${network}: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Geonettech API for specific network
  const toggleGeonettechStatus = async (network) => {
    if (!authToken) {
      setError('Authentication token not found. Please login first.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchWithAuth(
        `https://datamartbackened.onrender.com/api/inventory/${network}/toggle-geonettech`,
        { method: 'PUT' }
      );
      
      // Update the local state with the response
      setInventoryStatus(prev => ({
        ...prev,
        [network]: {
          ...prev[network],
          skipGeonettech: data.skipGeonettech,
          updatedAt: data.updatedAt || new Date().toISOString()
        }
      }));
      
      // Show success message
      setSuccessMessage(data.message || `${network} Geonettech API toggled successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      if (err.message.includes('401')) {
        setError('Your session has expired. Please login again.');
      } else {
        setError(`Failed to toggle Geonettech for ${network}: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Network Inventory Management</h1>
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-4">
              {successMessage}
            </div>
          )}
          
          {!authToken ? (
            <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded mb-4">
              Authentication token not found. Please login to access inventory management.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 font-semibold">Network</th>
                      <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 font-semibold">Stock Status</th>
                      <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 font-semibold">Geonettech API</th>
                      <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 font-semibold">Last Updated</th>
                      <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {NETWORKS.map((network) => {
                      const itemStatus = inventoryStatus[network] || { 
                        inStock: null, 
                        skipGeonettech: null,
                        updatedAt: null 
                      };
                      
                      return (
                        <tr key={network} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="py-3 px-4 border-b dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                            {network}
                          </td>
                          
                          {/* Stock Status Column */}
                          <td className="py-3 px-4 border-b dark:border-gray-700">
                            {itemStatus.inStock === null ? (
                              <span className="text-gray-500 dark:text-gray-400">Unknown</span>
                            ) : (
                              <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                                itemStatus.inStock 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700' 
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
                              }`}>
                                {itemStatus.inStock ? 'In Stock' : 'Out of Stock'}
                              </span>
                            )}
                          </td>
                          
                          {/* Geonettech API Status Column */}
                          <td className="py-3 px-4 border-b dark:border-gray-700">
                            {itemStatus.skipGeonettech === null ? (
                              <span className="text-gray-500 dark:text-gray-400">Unknown</span>
                            ) : (
                              <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                                itemStatus.skipGeonettech 
                                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700' 
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                              }`}>
                                {itemStatus.skipGeonettech ? 'API Disabled' : 'API Enabled'}
                              </span>
                            )}
                          </td>
                          
                          {/* Last Updated Column */}
                          <td className="py-3 px-4 border-b dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm">
                            {itemStatus.updatedAt 
                              ? new Date(itemStatus.updatedAt).toLocaleString() 
                              : 'Never updated'}
                          </td>
                          
                          {/* Actions Column */}
                          <td className="py-3 px-4 border-b dark:border-gray-700">
                            <div className="flex space-x-2">
                              {/* Toggle Stock Status Button */}
                              <button
                                onClick={() => toggleItemStatus(network)}
                                disabled={loading}
                                className={`px-3 py-1 rounded text-white text-sm font-medium transition-colors ${
                                  loading 
                                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                                    : 'bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700'
                                }`}
                              >
                                {loading ? 'Processing...' : 'Toggle Stock'}
                              </button>
                              
                              {/* Toggle Geonettech API Button */}
                              <button
                                onClick={() => toggleGeonettechStatus(network)}
                                disabled={loading}
                                className={`px-3 py-1 rounded text-white text-sm font-medium transition-colors ${
                                  loading 
                                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                                    : 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700'
                                }`}
                              >
                                {loading ? 'Processing...' : 'Toggle API'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Legend */}
              <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Legend:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Stock Status:</span>
                    <ul className="ml-4 mt-2 space-y-2">
                      <li className="flex items-center">
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium border border-green-200 dark:border-green-700 mr-2">In Stock</span>
                        <span className="text-gray-600 dark:text-gray-400">- Available for purchase</span>
                      </li>
                      <li className="flex items-center">
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded-full text-xs font-medium border border-red-200 dark:border-red-700 mr-2">Out of Stock</span>
                        <span className="text-gray-600 dark:text-gray-400">- Not available for purchase</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Geonettech API:</span>
                    <ul className="ml-4 mt-2 space-y-2">
                      <li className="flex items-center">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-700 mr-2">API Enabled</span>
                        <span className="text-gray-600 dark:text-gray-400">- Orders processed automatically</span>
                      </li>
                      <li className="flex items-center">
                        <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded-full text-xs font-medium border border-orange-200 dark:border-orange-700 mr-2">API Disabled</span>
                        <span className="text-gray-600 dark:text-gray-400">- Orders marked as pending</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}