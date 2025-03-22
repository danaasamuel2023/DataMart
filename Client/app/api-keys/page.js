'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Copy, AlertCircle, Check, Moon, Sun } from 'lucide-react';

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
  const [darkMode, setDarkMode] = useState(false);

  // Check system preference for dark mode on mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);

    // Listen for changes in system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

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
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>API Key Management</h1>
          <button 
            onClick={toggleDarkMode} 
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        {error && (
          <div className={`flex items-center border px-4 py-3 rounded mb-4 ${darkMode ? 'bg-red-900 border-red-800 text-red-200' : 'bg-red-100 border-red-400 text-red-700'}`}>
            <AlertCircle className="mr-2" size={18} />
            {error}
          </div>
        )}

        {/* Generate new API key */}
        <div className={`shadow-md rounded-lg p-6 mb-6 transition-colors duration-200 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Generate New API Key</h2>
          
          <form onSubmit={generateApiKey} className="space-y-4">
            <div>
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Key Name</label>
              <input
                type="text"
                className={`w-full p-2 border rounded transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="e.g., Development Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Expires In (Days)</label>
              <select
                className={`w-full p-2 border rounded transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
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
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Generate API Key'}
            </button>
          </form>
        </div>

        {/* Newly generated key */}
        {newKey && (
          <div className={`border rounded-lg p-6 mb-6 transition-colors ${
            darkMode 
              ? 'bg-green-900 border-green-800 text-green-100' 
              : 'bg-green-50 border-green-200 text-gray-800'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-green-100' : 'text-green-800'}`}>API Key Generated</h2>
            <p className={`mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Your new API key has been generated. Save this key as it will not be displayed again.
            </p>
            
            <div className={`p-3 rounded flex justify-between items-center mb-4 break-all ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <code className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{newKey.key}</code>
              <button 
                onClick={() => copyToClipboard(newKey.key)}
                className={`ml-2 px-3 py-1 rounded text-sm flex items-center ${
                  darkMode 
                    ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                {isCopied ? <Check size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                <span className="font-medium">Name:</span> {newKey.name}
              </div>
              <div className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                <span className="font-medium">Expires:</span> {formatDate(newKey.expiresAt)}
              </div>
            </div>
            
            <button 
              onClick={() => setNewKey(null)} 
              className="mt-4 text-blue-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* API key list */}
        <div className={`shadow-md rounded-lg p-6 transition-colors duration-200 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Your API Keys</h2>
          
          {loading && !newKey ? (
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Loading API keys...</p>
          ) : apiKeys.length === 0 ? (
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>You don't have any API keys yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={`min-w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <thead>
                  <tr className={darkMode ? 'border-gray-700' : 'border-gray-200'}>
                    <th className={`py-2 px-4 border-b text-left ${darkMode ? 'text-gray-300 border-gray-700' : 'text-gray-700 border-gray-200'}`}>Name</th>
                    <th className={`py-2 px-4 border-b text-left ${darkMode ? 'text-gray-300 border-gray-700' : 'text-gray-700 border-gray-200'}`}>Created</th>
                    <th className={`py-2 px-4 border-b text-left ${darkMode ? 'text-gray-300 border-gray-700' : 'text-gray-700 border-gray-200'}`}>Expires</th>
                    <th className={`py-2 px-4 border-b text-left ${darkMode ? 'text-gray-300 border-gray-700' : 'text-gray-700 border-gray-200'}`}>Last Used</th>
                    <th className={`py-2 px-4 border-b text-left ${darkMode ? 'text-gray-300 border-gray-700' : 'text-gray-700 border-gray-200'}`}>Status</th>
                    <th className={`py-2 px-4 border-b text-left ${darkMode ? 'text-gray-300 border-gray-700' : 'text-gray-700 border-gray-200'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => (
                    <tr key={key._id} className={darkMode ? 'border-gray-700' : 'border-gray-200'}>
                      <td className={`py-2 px-4 border-b ${darkMode ? 'text-gray-300 border-gray-700' : 'text-gray-800 border-gray-200'}`}>{key.name}</td>
                      <td className={`py-2 px-4 border-b ${darkMode ? 'text-gray-300 border-gray-700' : 'text-gray-800 border-gray-200'}`}>{new Date(key.createdAt).toLocaleDateString()}</td>
                      <td className={`py-2 px-4 border-b ${darkMode ? 'text-gray-300 border-gray-700' : 'text-gray-800 border-gray-200'}`}>{formatDate(key.expiresAt)}</td>
                      <td className={`py-2 px-4 border-b ${darkMode ? 'text-gray-300 border-gray-700' : 'text-gray-800 border-gray-200'}`}>{key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</td>
                      <td className={`py-2 px-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <span className={`px-2 py-1 rounded text-xs ${
                          key.isActive 
                            ? (darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800')
                            : (darkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800')
                        }`}>
                          {key.isActive ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className={`py-2 px-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        {key.isActive && (
                          <button
                            onClick={() => revokeApiKey(key._id)}
                            className={`hover:underline ${darkMode ? 'text-red-400' : 'text-red-500'}`}
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
    </div>
  );
};

export default ApiKeyManagement;