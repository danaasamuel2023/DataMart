'use client'
import React, { useState, useEffect } from 'react';
import { Moon, Sun, Globe, Code } from 'lucide-react';

export default function InventoryPage() {
  const NETWORKS = ["YELLO", "TELECEL", "AT_PREMIUM", "airteltigo", "at"];
  
  const [inventoryStatus, setInventoryStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('web'); // 'web' or 'api'

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      setDarkMode(savedMode === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      loadInventoryStatus(token);
    } else {
      setError('Authentication token not found. Please login first.');
    }
  }, []);

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
      
      const statusObj = {};
      data.inventory.forEach(item => {
        statusObj[item.network] = {
          // Web settings
          webInStock: item.webInStock !== undefined ? item.webInStock : item.inStock,
          webSkipGeonettech: item.webSkipGeonettech !== undefined ? item.webSkipGeonettech : item.skipGeonettech,
          // API settings
          apiInStock: item.apiInStock !== undefined ? item.apiInStock : item.inStock,
          apiSkipGeonettech: item.apiSkipGeonettech !== undefined ? item.apiSkipGeonettech : item.skipGeonettech,
          // Legacy fields
          inStock: item.inStock,
          skipGeonettech: item.skipGeonettech,
          // Timestamps
          updatedAt: item.updatedAt,
          webLastUpdatedAt: item.webLastUpdatedAt,
          apiLastUpdatedAt: item.apiLastUpdatedAt
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

  const toggleItemStatus = async (network, type) => {
    if (!authToken) {
      setError('Authentication token not found. Please login first.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = type === 'web' 
        ? `https://datamartbackened.onrender.com/api/inventory/${network}/toggle-web`
        : `https://datamartbackened.onrender.com/api/inventory/${network}/toggle-api`;
      
      const data = await fetchWithAuth(endpoint, { method: 'PUT' });
      
      setInventoryStatus(prev => ({
        ...prev,
        [network]: {
          ...prev[network],
          ...(type === 'web' 
            ? { webInStock: data.webInStock, webLastUpdatedAt: data.webLastUpdatedAt }
            : { apiInStock: data.apiInStock, apiLastUpdatedAt: data.apiLastUpdatedAt }
          )
        }
      }));
      
      setSuccessMessage(`${network} ${type.toUpperCase()} status toggled successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      if (err.message.includes('401')) {
        setError('Your session has expired. Please login again.');
      } else {
        setError(`Failed to toggle ${type} status for ${network}: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGeonettechStatus = async (network, type) => {
    if (!authToken) {
      setError('Authentication token not found. Please login first.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = type === 'web'
        ? `https://datamartbackened.onrender.com/api/inventory/${network}/toggle-geonettech-web`
        : `https://datamartbackened.onrender.com/api/inventory/${network}/toggle-geonettech-api`;
      
      const data = await fetchWithAuth(endpoint, { method: 'PUT' });
      
      setInventoryStatus(prev => ({
        ...prev,
        [network]: {
          ...prev[network],
          ...(type === 'web'
            ? { webSkipGeonettech: data.webSkipGeonettech, webLastUpdatedAt: data.webLastUpdatedAt }
            : { apiSkipGeonettech: data.apiSkipGeonettech, apiLastUpdatedAt: data.apiLastUpdatedAt }
          )
        }
      }));
      
      setSuccessMessage(`${network} ${type.toUpperCase()} Geonettech API toggled successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      if (err.message.includes('401')) {
        setError('Your session has expired. Please login again.');
      } else {
        setError(`Failed to toggle ${type} Geonettech for ${network}: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Migration function
  const runMigration = async () => {
    if (!authToken) {
      setError('Authentication token not found. Please login first.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchWithAuth(
        'https://datamartbackened.onrender.com/api/inventory/migrate',
        { method: 'POST' }
      );
      
      setSuccessMessage(data.message || 'Migration completed successfully');
      // Reload inventory after migration
      await loadInventoryStatus(authToken);
      
    } catch (err) {
      setError(`Migration failed: ${err.message}`);
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
            <div className="flex items-center space-x-4">
              <button 
                onClick={runMigration}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                title="Run migration to update existing records"
              >
                Run Migration
              </button>
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
            <>
              {/* Tab Navigation */}
              <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('web')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === 'web'
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Web Users</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('api')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === 'api'
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Code className="w-4 h-4" />
                    <span>API Developers</span>
                  </button>
                </nav>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 font-semibold">
                          Network
                        </th>
                        <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 font-semibold">
                          Stock Status ({activeTab === 'web' ? 'Web' : 'API'})
                        </th>
                        <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 font-semibold">
                          Geonettech API ({activeTab === 'web' ? 'Web' : 'API'})
                        </th>
                        <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 font-semibold">
                          Last Updated
                        </th>
                        <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {NETWORKS.map((network) => {
                        const itemStatus = inventoryStatus[network] || {};
                        const inStock = activeTab === 'web' ? itemStatus.webInStock : itemStatus.apiInStock;
                        const skipGeonettech = activeTab === 'web' ? itemStatus.webSkipGeonettech : itemStatus.apiSkipGeonettech;
                        const lastUpdated = activeTab === 'web' ? itemStatus.webLastUpdatedAt : itemStatus.apiLastUpdatedAt;
                        
                        return (
                          <tr key={network} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="py-3 px-4 border-b dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
                              {network}
                            </td>
                            
                            <td className="py-3 px-4 border-b dark:border-gray-700">
                              {inStock === undefined ? (
                                <span className="text-gray-500 dark:text-gray-400">Unknown</span>
                              ) : (
                                <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                                  inStock 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700' 
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
                                }`}>
                                  {inStock ? 'In Stock' : 'Out of Stock'}
                                </span>
                              )}
                            </td>
                            
                            <td className="py-3 px-4 border-b dark:border-gray-700">
                              {skipGeonettech === undefined ? (
                                <span className="text-gray-500 dark:text-gray-400">Unknown</span>
                              ) : (
                                <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                                  skipGeonettech 
                                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700' 
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                                }`}>
                                  {skipGeonettech ? 'API Disabled' : 'API Enabled'}
                                </span>
                              )}
                            </td>
                            
                            <td className="py-3 px-4 border-b dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm">
                              {lastUpdated 
                                ? new Date(lastUpdated).toLocaleString() 
                                : itemStatus.updatedAt 
                                  ? new Date(itemStatus.updatedAt).toLocaleString()
                                  : 'Never updated'}
                            </td>
                            
                            <td className="py-3 px-4 border-b dark:border-gray-700">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => toggleItemStatus(network, activeTab)}
                                  disabled={loading}
                                  className={`px-3 py-1 rounded text-white text-sm font-medium transition-colors ${
                                    loading 
                                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                                      : 'bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700'
                                  }`}
                                >
                                  {loading ? 'Processing...' : 'Toggle Stock'}
                                </button>
                                
                                <button
                                  onClick={() => toggleGeonettechStatus(network, activeTab)}
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
                
                {/* Info Box */}
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-t dark:border-gray-700">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Separate Controls for Web & API</p>
                      <p>You are currently managing inventory for <span className="font-semibold">{activeTab === 'web' ? 'Web Users' : 'API Developers'}</span>. 
                      Changes made here will only affect {activeTab === 'web' ? 'users accessing through the web interface' : 'developers using the API'}.</p>
                    </div>
                  </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}