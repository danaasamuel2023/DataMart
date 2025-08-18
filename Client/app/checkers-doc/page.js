'use client'
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Key, Package, ShoppingCart, Clock, History, Wallet, CheckCircle, ExternalLink, AlertCircle, MessageSquare, Info, X, Loader2, ArrowRight } from 'lucide-react';

// Simple modal for API key generation
const ApiKeyModal = ({ isOpen, onClose }) => {
  const [keyName, setKeyName] = useState('');
  const [expiresIn, setExpiresIn] = useState('30');
  const [generatedKey, setGeneratedKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!keyName.trim()) {
      setError('Please enter a name for your API key');
      return;
    }

    setIsGenerating(true);
    setError('');

    // Simulate API call - replace with actual API call
    try {
      // const response = await axios.post('/api/developer/generate-api-key', {
      //   name: keyName,
      //   expiresIn
      // });
      // setGeneratedKey(response.data.data.key);
      
      // Simulated response for demo
      setTimeout(() => {
        setGeneratedKey('sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
        setIsGenerating(false);
      }, 1500);
    } catch (err) {
      setError('Failed to generate API key. Please try again.');
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetModal = () => {
    setKeyName('');
    setExpiresIn('30');
    setGeneratedKey('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Generate API Key</h2>
          <button
            onClick={resetModal}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!generatedKey ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Production Key"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expires In
                </label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                  <option value="">Never</option>
                </select>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate API Key'
                )}
              </button>

              <div className="text-center">
                <a
                  href="/api-keys"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
                >
                  Manage all your API keys
                  <ArrowRight className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="text-green-800 dark:text-green-300 font-medium">API Key Generated Successfully!</p>
                    <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                      Make sure to copy this key now. You won't be able to see it again.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your API Key
                </label>
                <div className="relative">
                  <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 pr-12 font-mono text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 break-all">
                    {generatedKey}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors border border-slate-600"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Name:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{keyName}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {expiresIn ? `${expiresIn} days` : 'Never'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={resetModal}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Done
                </button>
                <a
                  href="/api-keys"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center"
                >
                  Manage Keys
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ResultCheckerApiDocs = () => {
  const [copiedCode, setCopiedCode] = useState('');
  const [expandedEndpoint, setExpandedEndpoint] = useState(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const toggleEndpoint = (id) => {
    setExpandedEndpoint(expandedEndpoint === id ? null : id);
  };

  const CodeBlock = ({ code, language = 'json', id }) => (
    <div className="relative">
      <pre className="bg-slate-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm border border-slate-700">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, id)}
        className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors border border-slate-600"
      >
        {copiedCode === id ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-gray-300" />
        )}
      </button>
    </div>
  );

  const endpoints = [
    {
      id: 'get-products',
      method: 'GET',
      path: '/api/checkers/products',
      title: 'Get Available Products',
      description: 'Retrieve list of available result checker products with stock information',
      icon: <Package className="w-5 h-5" />,
      request: {
        headers: `{
  "x-api-key": "YOUR_API_KEY_HERE"
}`,
        body: null
      },
      response: `{
  "status": "success",
  "data": [
    {
      "id": "65f4a2b8c9e77c001c8e4567",
      "name": "WAEC",
      "description": "West African Examination Council Result Checker",
      "price": 20.00,
      "inStock": true,
      "stockCount": 45
    },
    {
      "id": "65f4a2b8c9e77c001c8e4568",
      "name": "BECE",
      "description": "Basic Education Certificate Examination Result Checker",
      "price": 15.00,
      "inStock": true,
      "stockCount": 32
    }
  ]
}`
    },
    {
      id: 'purchase',
      method: 'POST',
      path: '/api/checkers/purchase',
      title: 'Purchase Result Checker',
      description: 'Purchase a WAEC or BECE result checker using wallet balance',
      icon: <ShoppingCart className="w-5 h-5" />,
      requestBodyParams: [
        { name: 'checkerType', type: 'string', required: true, description: 'Type of checker: "WAEC" or "BECE"' },
        { name: 'phoneNumber', type: 'string', required: true, description: 'User phone number for SMS delivery' },
        { name: 'ref', type: 'string', required: false, description: 'Custom reference for the purchase (must be unique)' },
        { name: 'webhookUrl', type: 'string', required: false, description: 'URL to receive webhook notification on completion' },
        { name: 'skipSms', type: 'boolean', required: false, description: 'Set to true to skip SMS sending and handle it yourself (default: false)' }
      ],
      request: {
        headers: `{
  "Content-Type": "application/json",
  "x-api-key": "YOUR_API_KEY_HERE"
}`,
        body: `{
  "checkerType": "WAEC",
  "phoneNumber": "0241234567",
  "ref": "CUSTOM-REF-123",        // Optional: Custom reference
  "webhookUrl": "https://your-app.com/webhook",  // Optional: Webhook URL
  "skipSms": false                // Optional: Set to true if you want to handle SMS yourself
}`
      },
      response: `{
  "status": "success",
  "message": "Result checker purchased successfully",
  "data": {
    "purchaseId": "65f4a3d9c9e77c001c8e4569",
    "reference": "CHKW17345678900001",
    "checkerType": "WAEC",
    "serialNumber": "WEC2024ABC123",
    "pin": "1234567890",
    "phoneNumber": "0241234567",
    "price": 20.00,
    "balanceBefore": 100.00,
    "balanceAfter": 80.00,
    "transactionId": "65f4a3d9c9e77c001c8e456a",
    "createdAt": "2024-03-15T14:30:00.000Z",
    "smsNotification": {
      "sent": true,
      "message": "SMS sent successfully"
    }
  }
}`
    },
    {
      id: 'order-status',
      method: 'GET',
      path: '/api/checkers/order-status/:reference',
      title: 'Check Order Status',
      description: 'Check the status of a purchase using the reference number',
      icon: <Clock className="w-5 h-5" />,
      request: {
        headers: `{
  "x-api-key": "YOUR_API_KEY_HERE"
}`,
        body: null,
        example: 'GET https://api.datamartgh.shop/api/checkers/order-status/CHKW17345678900001'
      },
      response: `{
  "status": "success",
  "data": {
    "purchaseId": "65f4a3d9c9e77c001c8e4569",
    "reference": "CHKW17345678900001",
    "checkerType": "WAEC",
    "serialNumber": "WEC2024ABC123",
    "pin": "1234567890",
    "price": 20.00,
    "orderStatus": "completed",
    "paymentMethod": "wallet",
    "createdAt": "2024-03-15T14:30:00.000Z",
    "updatedAt": "2024-03-15T14:30:00.000Z",
    "transaction": {
      "id": "65f4a3d9c9e77c001c8e456a",
      "balanceBefore": 100.00,
      "balanceAfter": 80.00,
      "status": "completed"
    }
  }
}`
    },
    {
      id: 'purchase-history',
      method: 'GET',
      path: '/api/checkers/purchase-history',
      title: 'Get Purchase History',
      description: 'Retrieve paginated purchase history with optional filters',
      icon: <History className="w-5 h-5" />,
      request: {
        headers: `{
  "x-api-key": "YOUR_API_KEY_HERE"
}`,
        params: `// Query Parameters (all optional)
{
  "page": 1,                    // Page number (default: 1)
  "limit": 20,                  // Items per page (default: 20)
  "checkerType": "WAEC",        // Filter by type (WAEC or BECE)
  "startDate": "2024-03-01",    // Filter by start date
  "endDate": "2024-03-31"       // Filter by end date
}`,
        example: 'GET https://api.datamartgh.shop/api/checkers/purchase-history?page=1&limit=10&checkerType=WAEC'
      },
      response: `{
  "status": "success",
  "data": {
    "purchases": [
      {
        "purchaseId": "65f4a3d9c9e77c001c8e4569",
        "reference": "CHKW17345678900001",
        "checkerType": "WAEC",
        "serialNumber": "WEC2024ABC123",
        "pin": "1234567890",
        "price": 20.00,
        "status": "completed",
        "createdAt": "2024-03-15T14:30:00.000Z",
        "balanceInfo": {
          "balanceBefore": 100.00,
          "balanceAfter": 80.00
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 47,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}`
    },
    {
      id: 'balance',
      method: 'GET',
      path: '/api/checkers/balance',
      title: 'Get Wallet Balance',
      description: 'Check current wallet balance',
      icon: <Wallet className="w-5 h-5" />,
      request: {
        headers: `{
  "x-api-key": "YOUR_API_KEY_HERE"
}`,
        body: null
      },
      response: `{
  "status": "success",
  "data": {
    "walletBalance": 250.50,
    "currency": "GHS"
  }
}`
    },
    {
      id: 'validate-reference',
      method: 'POST',
      path: '/api/checkers/validate-reference',
      title: 'Validate Reference',
      description: 'Check if a reference already exists before creating custom reference',
      icon: <CheckCircle className="w-5 h-5" />,
      request: {
        headers: `{
  "Content-Type": "application/json",
  "x-api-key": "YOUR_API_KEY_HERE"
}`,
        body: `{
  "reference": "CUSTOM-REF-123"
}`
      },
      response: `{
  "status": "success",
  "data": {
    "reference": "CUSTOM-REF-123",
    "exists": false,
    "available": true
  }
}`
    }
  ];

  const webhookInfo = {
    event: 'checker.purchase.completed',
    payload: `{
  "event": "checker.purchase.completed",
  "data": {
    "purchaseId": "65f4a3d9c9e77c001c8e4569",
    "reference": "CHKW17345678900001",
    "checkerType": "WAEC",
    "serialNumber": "WEC2024ABC123",
    "pin": "1234567890",
    "phoneNumber": "0241234567",
    "price": 20.00,
    "balanceBefore": 100.00,
    "balanceAfter": 80.00,
    "transactionId": "65f4a3d9c9e77c001c8e456a",
    "createdAt": "2024-03-15T14:30:00.000Z",
    "smsNotification": {
      "sent": true,
      "message": "SMS sent successfully"
    }
  }
}`
  };

  const errorResponses = [
    { code: 400, message: 'Bad Request - Invalid parameters or insufficient balance' },
    { code: 401, message: 'Unauthorized - Invalid or missing API key' },
    { code: 403, message: 'Forbidden - Account disabled' },
    { code: 404, message: 'Not Found - Resource not found' },
    { code: 500, message: 'Internal Server Error - Try again later' }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* API Key Modal */}
      <ApiKeyModal isOpen={showApiKeyModal} onClose={() => setShowApiKeyModal(false)} />

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">DataMart - Result Checker API Documentation</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">Complete API reference for WAEC & BECE result checker integration</p>
            </div>
            <div className="flex items-center space-x-2 bg-blue-50 dark:bg-slate-700 px-4 py-2 rounded-lg">
              <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Version</span>
              <span className="text-sm font-bold text-blue-900 dark:text-blue-100">v1.0</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Authentication Section */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Key className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Authentication</h2>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-yellow-800 dark:text-yellow-300 font-medium">API Key Required</p>
                <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">All endpoints require an API key to be passed in the request headers.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowApiKeyModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Generate API Key
                  </button>
                  <a
                    href="/api-keys"
                    className="inline-flex items-center px-4 py-2 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 text-yellow-800 dark:text-yellow-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    Manage API Keys
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          <CodeBlock 
            code={`// Include in all requests
{
  "x-api-key": "YOUR_API_KEY_HERE"
}`}
            id="auth-header"
          />
        </section>

        {/* Base URL */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Base URL</h2>
          <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
           https://api.datamartgh.shop
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-3">
            All endpoints should be prefixed with this base URL. For example:
          </p>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mt-2 font-mono text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
           https://api.datamartgh.shop/api/checkers/products
          </div>
        </section>

        {/* SMS Configuration Notice */}
        <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">SMS Notification Options</h3>
              <div className="space-y-3 text-blue-800 dark:text-blue-200">
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Default SMS Behavior</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    By default, DataMart automatically sends SMS notifications to users with the result checker details 
                    using the sender ID <strong>"unimarketgh"</strong>.
                  </p>
                </div>
                
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Skip SMS Option</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    Set <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">"skipSms": true</code> in your 
                    purchase request if you want to handle SMS notifications yourself. This is useful when:
                  </p>
                  <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1 ml-2">
                    <li>You want to use your own SMS provider</li>
                    <li>You want to customize the message format</li>
                    <li>You want to use your own sender ID</li>
                    <li>You want to send via other channels (WhatsApp, email, etc.)</li>
                  </ul>
                </div>

                <p className="text-sm mt-2 text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> When <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">skipSms</code> is 
                  set to <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">true</code>, you'll receive the 
                  serial number and PIN in the API response to send to your users through your preferred channel.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Endpoints Section */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">API Endpoints</h2>
          <div className="space-y-4">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleEndpoint(endpoint.id)}
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-900 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      {endpoint.icon}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          endpoint.method === 'GET' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {endpoint.method}
                        </span>
                        <code className="text-sm font-mono text-slate-700 dark:text-slate-300">{endpoint.path}</code>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{endpoint.description}</p>
                    </div>
                  </div>
                  {expandedEndpoint === endpoint.id ? 
                    <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" /> : 
                    <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  }
                </button>
                
                {expandedEndpoint === endpoint.id && (
                  <div className="px-6 py-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Request Headers</h4>
                      <CodeBlock code={endpoint.request.headers} id={`${endpoint.id}-headers`} />
                    </div>
                    
                    {endpoint.requestBodyParams && (
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Request Body Parameters</h4>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-2 text-slate-700 dark:text-slate-300">Parameter</th>
                                <th className="text-left py-2 text-slate-700 dark:text-slate-300">Type</th>
                                <th className="text-left py-2 text-slate-700 dark:text-slate-300">Required</th>
                                <th className="text-left py-2 text-slate-700 dark:text-slate-300">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {endpoint.requestBodyParams.map((param, idx) => (
                                <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                                  <td className="py-2">
                                    <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                      {param.name}
                                    </code>
                                  </td>
                                  <td className="py-2 text-slate-600 dark:text-slate-400">{param.type}</td>
                                  <td className="py-2">
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      param.required 
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                                    }`}>
                                      {param.required ? 'Required' : 'Optional'}
                                    </span>
                                  </td>
                                  <td className="py-2 text-slate-600 dark:text-slate-400">{param.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {endpoint.request.body && (
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Request Body Example</h4>
                        <CodeBlock code={endpoint.request.body} id={`${endpoint.id}-body`} />
                      </div>
                    )}
                    
                    {endpoint.request.params && (
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Query Parameters</h4>
                        <CodeBlock code={endpoint.request.params} id={`${endpoint.id}-params`} />
                      </div>
                    )}
                    
                    {endpoint.request.example && (
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Example Request</h4>
                        <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 font-mono text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {endpoint.request.example}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Success Response</h4>
                      <CodeBlock code={endpoint.response} id={`${endpoint.id}-response`} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Webhook Section */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ExternalLink className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Webhook Notifications</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            You can optionally provide a webhook URL when making a purchase to receive real-time notifications.
          </p>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Webhook Event</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                When a purchase is completed successfully, we'll send a POST request to your webhook URL with the following payload:
              </p>
              <CodeBlock code={webhookInfo.payload} id="webhook-payload" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Implementation Notes</h4>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 text-sm">
                <li>Webhook calls are made asynchronously after the purchase response is sent</li>
                <li>Failed webhook deliveries don't affect the purchase transaction</li>
                <li>Webhook errors are logged but won't cause the purchase to fail</li>
                <li>Your webhook endpoint should respond with a 2xx status code</li>
                <li>Webhook timeout is set to 10 seconds</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Error Responses */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Error Responses</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            All error responses follow a consistent format:
          </p>
          <CodeBlock 
            code={`{
  "status": "error",
  "message": "Description of the error",
  "details": "Additional error information (if applicable)"
}`}
            id="error-format"
          />
          <div className="mt-6">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Common Error Codes</h4>
            <div className="space-y-2">
              {errorResponses.map((error) => (
                <div key={error.code} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold text-sm rounded">
                    {error.code}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 text-sm">{error.message}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Rate Limiting */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Rate Limiting</h2>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="text-amber-800 dark:text-amber-300 font-medium">API Rate Limits Apply</p>
                <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                  To ensure fair usage and system stability, API calls are subject to rate limiting. 
                  Contact support if you need higher limits for your integration.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Start Example */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 border border-blue-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Quick Start Examples</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Example 1: Purchase with Automatic SMS</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Default behavior - DataMart sends SMS to the user:
            </p>
            <CodeBlock 
              code={`const axios = require('axios');

async function purchaseWithSMS() {
  try {
    const response = await axios.post(
      'https://api.datamartgh.shop/api/checkers/purchase',
      {
        checkerType: 'WAEC',
        phoneNumber: '0241234567',
        ref: 'ORDER-' + Date.now(),
        webhookUrl: 'https://your-app.com/webhook/checker-purchase'
        // skipSms defaults to false - SMS will be sent
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'YOUR_API_KEY_HERE'
        }
      }
    );
    
    console.log('Purchase successful:', response.data);
    console.log('SMS Status:', response.data.data.smsNotification);
    
  } catch (error) {
    console.error('Purchase failed:', error.response?.data || error.message);
  }
}`}
              id="quick-start-sms"
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Example 2: Purchase without SMS (Handle Yourself)</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Skip DataMart SMS and send notifications through your own channel:
            </p>
            <CodeBlock 
              code={`const axios = require('axios');

async function purchaseWithoutSMS() {
  try {
    const response = await axios.post(
      'https://api.datamartgh.shop/api/checkers/purchase',
      {
        checkerType: 'WAEC',
        phoneNumber: '0241234567',
        ref: 'ORDER-' + Date.now(),
        skipSms: true  // Skip SMS - you'll handle notification
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'YOUR_API_KEY_HERE'
        }
      }
    );
    
    // Extract the details to send to user
    const { serialNumber, pin, phoneNumber } = response.data.data;
    
    // Now send SMS/WhatsApp/Email through your own service
    await sendCustomNotification(phoneNumber, {
      serialNumber,
      pin,
      type: 'WAEC'
    });
    
    console.log('Purchase successful, notification sent via custom channel');
    
  } catch (error) {
    console.error('Purchase failed:', error.response?.data || error.message);
  }
}

// Your custom notification function
async function sendCustomNotification(phone, details) {
  // Implement your own SMS/WhatsApp/Email logic here
  console.log(\`Sending to \${phone}:\`, details);
}`}
              id="quick-start-no-sms"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default ResultCheckerApiDocs;