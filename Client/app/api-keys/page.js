'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// API URL - Replace with your actual API URL
const API_URL = process.env.REACT_APP_API_URL || 'https://datamartbackened.onrender.com/api/developer';

const ApiKeyManagement = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [expiresIn, setExpiresIn] = useState('30'); // Default 30 days
  const [newKey, setNewKey] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  // Get auth token from localStorage
  const getAuthHeader = () => {
   
    const token = localStorage.getItem('authToken');

    return { Authorization: `Bearer ${token}` };
  };

  // Fetch API keys
  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('Request headers:', headers);
  
      const response = await axios.get(`${API_URL}/api-keys`, { headers });
      setApiKeys(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error details:', err);
      setError('Failed to load API keys: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Generate new API key
  const generateApiKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      setError('API key name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/generate-api-key`,
        { name: newKeyName, expiresIn },
        { headers: getAuthHeader() }
      );
      
      setNewKey(response.data.data);
      setNewKeyName('');
      fetchApiKeys(); // Refresh the list
    } catch (err) {
      setError('Failed to generate API key: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Revoke API key
  const revokeApiKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API_URL}/api-keys/${keyId}`, {
        headers: getAuthHeader()
      });
      setApiKeys(apiKeys.map(key => 
        key._id === keyId ? { ...key, isActive: false } : key
      ));
    } catch (err) {
      setError('Failed to revoke API key: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Copy API key to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Load API keys on component mount
  useEffect(() => {
    fetchApiKeys();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never expires';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">API Key Management</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Generate new API key */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Generate New API Key</h2>
        
        <form onSubmit={generateApiKey} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Key Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="e.g., Development Key"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Expires In (Days)</label>
            <select
              className="w-full p-2 border rounded"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="">Never</option>
            </select>
          </div>
          
          <button
            type="submit"
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Generate API Key'}
          </button>
        </form>
      </div>

      {/* Newly generated key */}
      {newKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-green-800">API Key Generated</h2>
          <p className="mb-2 text-gray-700">Your new API key has been generated. Save this key as it will not be displayed again.</p>
          
          <div className="bg-gray-100 p-3 rounded flex justify-between items-center mb-4">
            <code className="text-sm break-all">{newKey.key}</code>
            <button 
              onClick={() => copyToClipboard(newKey.key)}
              className="ml-2 bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm"
            >
              {isCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Name:</span> {newKey.name}
            </div>
            <div>
              <span className="font-medium">Expires:</span> {formatDate(newKey.expiresAt)}
            </div>
          </div>
          
          <button 
            onClick={() => setNewKey(null)} 
            className="mt-4 text-blue-500 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* API key list */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your API Keys</h2>
        
        {loading && !newKey ? (
          <p className="text-gray-500">Loading API keys...</p>
        ) : apiKeys.length === 0 ? (
          <p className="text-gray-500">You don't have any API keys yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Name</th>
                  <th className="py-2 px-4 border-b text-left">Created</th>
                  <th className="py-2 px-4 border-b text-left">Expires</th>
                  <th className="py-2 px-4 border-b text-left">Last Used</th>
                  <th className="py-2 px-4 border-b text-left">Status</th>
                  <th className="py-2 px-4 border-b text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key._id}>
                    <td className="py-2 px-4 border-b">{key.name}</td>
                    <td className="py-2 px-4 border-b">{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 px-4 border-b">{formatDate(key.expiresAt)}</td>
                    <td className="py-2 px-4 border-b">{key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</td>
                    <td className="py-2 px-4 border-b">
                      <span className={`px-2 py-1 rounded text-xs ${key.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b">
                      {key.isActive && (
                        <button
                          onClick={() => revokeApiKey(key._id)}
                          className="text-red-500 hover:underline"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeyManagement;