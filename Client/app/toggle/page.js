// pages/inventory.js
'use client'
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function InventoryPage() {
  // Predefined networks
  const NETWORKS = ["YELLO", "TELECEL", "AT_PREMIUM", "airteltigo", "at"];
  
  const [inventoryStatus, setInventoryStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [authToken, setAuthToken] = useState('');

  // Get token from localStorage on component mount
  useEffect(() => {
    // Get the token from localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
    } else {
      setError('Authentication token not found. Please login first.');
    }
  }, []);

  // Configure axios with auth token
  const getAuthHeaders = () => {
    return {
      headers: {
        'x-auth-token': authToken
      }
    };
  };

  // Toggle inventory item status
  const toggleItemStatus = async (network) => {
    if (!authToken) {
      setError('Authentication token not found. Please login first.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put(
        `https://datamartbackened.onrender.com/api/inventory/${network}/toggle`, 
        {}, // empty body
        getAuthHeaders() // pass the auth headers
      );
      
      // Update the local state with the response
      setInventoryStatus(prev => ({
        ...prev,
        [network]: {
          inStock: response.data.inStock,
          updatedAt: response.data.updatedAt || new Date().toISOString()
        }
      }));
      
      // Show success message
      setSuccessMessage(response.data.message || `${network} status toggled successfully`);
      setTimeout(() => setSuccessMessage(''), 3000); // Clear after 3 seconds
      
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Your session has expired. Please login again.');
      } else {
        setError(`Failed to toggle status for ${network}: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Network Inventory Management</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      {!authToken ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Authentication token not found. Please login to access inventory management.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 border-b text-left">Network</th>
                <th className="py-3 px-4 border-b text-left">Status</th>
                <th className="py-3 px-4 border-b text-left">Last Updated</th>
                <th className="py-3 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {NETWORKS.map((network) => {
                const itemStatus = inventoryStatus[network] || { inStock: null, updatedAt: null };
                
                return (
                  <tr key={network}>
                    <td className="py-3 px-4 border-b font-medium">{network}</td>
                    <td className="py-3 px-4 border-b">
                      {itemStatus.inStock === null ? (
                        <span className="text-gray-500">Unknown</span>
                      ) : (
                        <span className={`inline-block rounded-full px-3 py-1 text-sm ${
                          itemStatus.inStock 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {itemStatus.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 border-b">
                      {itemStatus.updatedAt 
                        ? new Date(itemStatus.updatedAt).toLocaleString() 
                        : 'Never updated'}
                    </td>
                    <td className="py-3 px-4 border-b">
                      <button
                        onClick={() => toggleItemStatus(network)}
                        disabled={loading}
                        className={`px-3 py-1 rounded text-white ${
                          loading 
                            ? 'bg-gray-400' 
                            : 'bg-purple-500 hover:bg-purple-600'
                        }`}
                      >
                        {loading ? 'Processing...' : 'Toggle Status'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}