'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import axios from 'axios';
import { toast } from 'react-toastify';

const SMMSettings = () => {
  const router = useRouter();
  
  // State
  const [settings, setSettings] = useState({
    japApiUrl: 'https://justanotherpanel.com/api/v2',
    japApiKey: '',
    profitMargin: 20,
    minProfit: 0.01,
    autoSyncServices: true,
    syncInterval: 3600,
    autoCheckOrderStatus: true,
    statusCheckInterval: 300,
    maxOrdersPerUser: 10,
    minOrderAmount: 0.5,
    maxOrderAmount: 1000
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [japBalance, setJapBalance] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [stats, setStats] = useState({
    totalServices: 0,
    activeServices: 0,
    lastSync: null,
    totalOrders: 0,
    pendingOrders: 0
  });

  // Check for dark mode preference
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Fetch settings on mount
  useEffect(() => {
    checkAuth();
    fetchSettings();
    fetchStats();
  }, []);

  // Check authentication
  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login?redirect=/admin/smm-settings');
      return;
    }
  };

  // Fetch current settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(
        'http://localhost:5000/api/smm/admin/settings',
        {
          headers: { 'x-auth-token': token }
        }
      );
      
      if (response.data.success && response.data.settings) {
        setSettings({
          ...settings,
          ...response.data.settings
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      if (err.response?.status === 403) {
        toast.error('Admin access only');
        router.push('/');
      } else if (err.response?.status === 401) {
        localStorage.removeItem('authToken');
        router.push('/login?redirect=/admin/smm-settings');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch SMM stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // This would be a separate endpoint to get SMM statistics
      // For now, we'll just set some default values
      setStats({
        totalServices: 0,
        activeServices: 0,
        lastSync: null,
        totalOrders: 0,
        pendingOrders: 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Save settings
  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!settings.japApiKey) {
      toast.error('Please enter JAP API Key');
      return;
    }
    
    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.put(
        'http://localhost:5000/api/smm/admin/settings',
        settings,
        {
          headers: { 'x-auth-token': token }
        }
      );
      
      if (response.data.success) {
        toast.success('Settings saved successfully');
        setSettings(response.data.settings);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Test JAP connection
  const testConnection = async () => {
    if (!settings.japApiKey) {
      toast.error('Please enter JAP API Key first');
      return;
    }
    
    try {
      setTestingConnection(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(
        'http://localhost:5000/api/smm/admin/jap-balance',
        {
          headers: { 'x-auth-token': token }
        }
      );
      
      if (response.data.success) {
        setJapBalance(response.data.balance);
        toast.success(`Connection successful! Balance: ${response.data.currency} ${response.data.balance}`);
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      toast.error('Connection failed. Please check your API key');
      setJapBalance(null);
    } finally {
      setTestingConnection(false);
    }
  };

  // Sync services
  const syncServices = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.post(
        'https://datamartbackened.onrender.com/api/smm/admin/sync-services',
        {},
        {
          headers: { 'x-auth-token': token }
        }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        fetchStats(); // Refresh stats
      }
    } catch (err) {
      console.error('Error syncing services:', err);
      toast.error(err.response?.data?.error || 'Failed to sync services');
    } finally {
      setSyncing(false);
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Head>
          <title>SMM Panel Settings - Admin</title>
        </Head>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">SMM Panel Settings</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-colors duration-200 ${
                darkMode 
                  ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' 
                  : 'bg-gray-700 text-white hover:bg-gray-800'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button 
              onClick={() => router.push('/admin/dashboard')}
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
            <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>JAP Balance</h3>
            <p className="text-2xl font-bold mt-2">
              {japBalance !== null ? `$${japBalance}` : '---'}
            </p>
            <button
              onClick={testConnection}
              className="text-sm text-blue-500 hover:text-blue-600 mt-2"
              disabled={testingConnection}
            >
              {testingConnection ? 'Checking...' : 'Check Balance'}
            </button>
          </div>
          
          <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
            <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Services</h3>
            <p className="text-2xl font-bold mt-2">{stats.totalServices}</p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {stats.activeServices} active
            </p>
          </div>
          
          <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
            <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Orders</h3>
            <p className="text-2xl font-bold mt-2">{stats.totalOrders}</p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {stats.pendingOrders} pending
            </p>
          </div>
          
          <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
            <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last Sync</h3>
            <p className="text-lg font-medium mt-2">
              {stats.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'}
            </p>
            <button
              onClick={syncServices}
              className="text-sm text-green-500 hover:text-green-600 mt-2"
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {/* API Configuration */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
              API Configuration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  JAP API URL
                </label>
                <input
                  type="text"
                  name="japApiUrl"
                  value={settings.japApiUrl}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  JAP API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    name="japApiKey"
                    value={settings.japApiKey}
                    onChange={handleChange}
                    className={`w-full p-2 pr-10 border rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'border-gray-300'
                    }`}
                    placeholder="Enter your JAP API key"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Get your API key from your Just Another Panel account
                </p>
              </div>
            </div>
          </div>

          {/* Profit Settings */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
              Profit Settings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Profit Margin (%)
                </label>
                <input
                  type="number"
                  name="profitMargin"
                  value={settings.profitMargin}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  required
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Percentage markup on all services
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Minimum Profit ($)
                </label>
                <input
                  type="number"
                  name="minProfit"
                  value={settings.minProfit}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  required
                />
              </div>
            </div>
          </div>

          {/* Automation Settings */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
              Automation Settings
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Auto Sync Services
                  </label>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Automatically sync services from JAP
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoSyncServices"
                    checked={settings.autoSyncServices}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
                </label>
              </div>
              
              {settings.autoSyncServices && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Sync Interval (seconds)
                  </label>
                  <input
                    type="number"
                    name="syncInterval"
                    value={settings.syncInterval}
                    onChange={handleChange}
                    min="300"
                    className={`w-full p-2 border rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'border-gray-300'
                    }`}
                    required
                  />
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Minimum 300 seconds (5 minutes)
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <label className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Auto Check Order Status
                  </label>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Automatically update order statuses
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoCheckOrderStatus"
                    checked={settings.autoCheckOrderStatus}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
                </label>
              </div>
              
              {settings.autoCheckOrderStatus && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status Check Interval (seconds)
                  </label>
                  <input
                    type="number"
                    name="statusCheckInterval"
                    value={settings.statusCheckInterval}
                    onChange={handleChange}
                    min="60"
                    className={`w-full p-2 border rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'border-gray-300'
                    }`}
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Order Limits */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
              Order Limits
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Max Orders Per User (per day)
                </label>
                <input
                  type="number"
                  name="maxOrdersPerUser"
                  value={settings.maxOrdersPerUser}
                  onChange={handleChange}
                  min="1"
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Minimum Order Amount ($)
                </label>
                <input
                  type="number"
                  name="minOrderAmount"
                  value={settings.minOrderAmount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Maximum Order Amount ($)
                </label>
                <input
                  type="number"
                  name="maxOrderAmount"
                  value={settings.maxOrderAmount}
                  onChange={handleChange}
                  min="1"
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  required
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={testConnection}
              className={`px-6 py-2 rounded-md font-medium transition-colors duration-200 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
              disabled={testingConnection || !settings.japApiKey}
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            
            <button
              type="button"
              onClick={syncServices}
              className="px-6 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors duration-200"
              disabled={syncing || !settings.japApiKey}
            >
              {syncing ? 'Syncing...' : 'Sync Services'}
            </button>
            
            <button
              type="submit"
              className="px-6 py-2 bg-green-500 text-white rounded-md font-medium hover:bg-green-600 transition-colors duration-200"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Quick Actions */}
        <div className={`mt-8 rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/admin/smm-services')}
              className={`p-4 rounded-lg text-center transition-colors duration-200 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="font-medium">Manage Services</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                View and edit service prices
              </div>
            </button>
            
            <button
              onClick={() => router.push('/admin/smm-orders')}
              className={`p-4 rounded-lg text-center transition-colors duration-200 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <div className="text-2xl mb-2">📋</div>
              <div className="font-medium">View Orders</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Monitor all SMM orders
              </div>
            </button>
            
            <button
              onClick={() => router.push('/admin/smm-analytics')}
              className={`p-4 rounded-lg text-center transition-colors duration-200 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium">Analytics</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                View profit and performance
              </div>
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .dark-mode {
          background-color: #111827;
          color: #f3f4f6;
        }
      `}</style>
    </div>
  );
};

export default SMMSettings;