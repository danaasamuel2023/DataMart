'use client'
import React, { useState } from 'react';
import { FaWhatsapp, FaCode, FaNetworkWired, FaMoneyBillWave, FaTable, FaLock, FaPlay } from 'react-icons/fa';
import Head from 'next/head';

const DataMartDocumentation = () => {
  // State for API simulator
  const [apiKey, setApiKey] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState('TELECEL');
  const [capacity, setCapacity] = useState('5');
  const [responseData, setResponseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle form submission for API simulator
  const handleSimulation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponseData(null);

    try {
      // In a real implementation, this would make an actual API request
      // Here we're just simulating the response after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate success response
      setResponseData({
        status: "success",
        data: {
          purchaseId: "60f1e5b3e6b" + Math.floor(Math.random() * 1000000),
          transactionReference: "TRX-a1b2c3d4-" + Math.random().toString(36).substring(2, 10),
          network: network,
          capacity: capacity,
          mb: parseInt(capacity) * 1000,
          price: (Math.random() * 50 + 10).toFixed(2),
          remainingBalance: (Math.random() * 200 + 50).toFixed(2),
          geonetechResponse: { status: "success", message: "Data bundle purchased successfully" }
        }
      });
    } catch (err) {
      setError("An error occurred while simulating the API request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>DataMart API Documentation</title>
        <meta name="description" content="Mobile Data Bundle Purchase API for Ghana Networks" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-md my-8">
          <header className="mb-8 border-b pb-4">
            <h1 className="text-3xl font-bold text-gray-800">DataMart API Documentation</h1>
            <p className="text-gray-600 mt-2">Mobile Data Bundle Purchase API for Ghana Networks</p>
          </header>

          {/* Introduction */}
          <div className="mb-8">
            <p className="text-gray-700 mb-4">
              DataMart provides a simple and reliable API for purchasing mobile data bundles for customers in Ghana. 
              This documentation will help you integrate with our service to programmatically purchase data bundles 
              for any supported network.
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
              <p className="text-blue-800">
                <strong>Join our developer community</strong> for updates, support, and discussions:
              </p>
              <a 
                href="https://chat.whatsapp.com/HfHCT72jm2Z1B14fsJjuhT" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center mt-2 text-green-600 hover:text-green-700 font-medium"
              >
                <FaWhatsapp className="mr-2" size={20} />
                Join Our WhatsApp Group
              </a>
            </div>

            <nav className="my-6 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">Quick Navigation</h3>
              <ul className="flex flex-wrap gap-3">
                <li><a href="#authentication" className="text-blue-600 hover:underline">Authentication</a></li>
                <li><a href="#purchase-endpoint" className="text-blue-600 hover:underline">Purchase Data</a></li>
                <li><a href="#data-packages" className="text-blue-600 hover:underline">Data Packages</a></li>
                <li><a href="#additional-endpoints" className="text-blue-600 hover:underline">Additional Endpoints</a></li>
                <li><a href="#api-simulator" className="text-blue-600 hover:underline">API Simulator</a></li>
                <li><a href="#code-samples" className="text-blue-600 hover:underline">Code Samples</a></li>
              </ul>
            </nav>
          </div>

          {/* Authentication */}
          <div className="mb-8" id="authentication">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <FaLock className="mr-2" /> Authentication
            </h2>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <p className="mb-3">To access the DataMart API, you'll need an API key. Include it in your request headers as:</p>
              <pre className="bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
                X-API-Key: your_api_key_here
              </pre>
              <div className="mt-4">
                <a 
                  href="/api-keys" 
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Get Your API Key
                </a>
              </div>
              
              <h3 className="font-semibold mt-6 text-gray-800">API Key Management</h3>
              <p className="mt-2">You can manage your API keys using the following endpoints:</p>
              
              <div className="mt-3 space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-medium">Generate a new API key:</p>
                  <pre className="bg-gray-800 text-white p-2 rounded mt-1 overflow-x-auto">
                    POST /api/developer/generate-api-key
                  </pre>
                  <p className="mt-1">Body:</p>
                  <pre className="bg-gray-800 text-white p-2 rounded mt-1 overflow-x-auto">
{`{
  "name": "My API Key",
  "expiresIn": 365  // Optional: Days until expiry
}`}
                  </pre>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-medium">List your API keys:</p>
                  <pre className="bg-gray-800 text-white p-2 rounded mt-1 overflow-x-auto">
                    GET /api/developer/api-keys
                  </pre>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-medium">Revoke an API key:</p>
                  <pre className="bg-gray-800 text-white p-2 rounded mt-1 overflow-x-auto">
                    DELETE /api/developer/api-keys/:id
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Data Purchase Endpoint */}
          <div className="mb-8" id="purchase-endpoint">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <FaMoneyBillWave className="mr-2" /> Data Purchase Endpoint
            </h2>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <p className="font-medium text-gray-800">POST  https://datamartbackened.onrender.com/api/developer/purchase</p>
              <p className="text-gray-600 mt-2">Endpoint to purchase mobile data for a phone number</p>
              
              <h3 className="font-semibold mt-4 text-gray-800">Request Body:</h3>
              <pre className="bg-gray-800 text-white p-3 rounded mt-2 overflow-x-auto">
{`{
  "phoneNumber": "0551234567",  // Recipient's phone number
  "network": "TELECEL",         // Network identifier (see options below)
  "capacity": "5",              // Data capacity in GB
  "gateway": "wallet"           // Payment method (default: wallet)
}`}
              </pre>

              <h3 className="font-semibold mt-4 text-gray-800">Supported Networks:</h3>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><code className="bg-gray-200 px-1 rounded">TELECEL</code> - Vodafone Ghana</li>
                <li><code className="bg-gray-200 px-1 rounded">YELLO</code> - MTN Ghana</li>
                <li><code className="bg-gray-200 px-1 rounded">AT_PREMIUM</code> - AirtelTigo Ghana</li>
              </ul>

              <h3 className="font-semibold mt-4 text-gray-800">Success Response (201):</h3>
              <pre className="bg-gray-800 text-green-400 p-3 rounded mt-2 overflow-x-auto">
{`{
  "status": "success",
  "data": {
    "purchaseId": "60f1e5b3e6b39812345678",
    "transactionReference": "TRX-a1b2c3d4-...",
    "network": "TELECEL",
    "capacity": "5",
    "mb": "5000",
    "price": 23.00,
    "remainingBalance": 177.00,
    "geonetechResponse": { ... }
  }
}`}
              </pre>

              <h3 className="font-semibold mt-4 text-gray-800">Error Response:</h3>
              <pre className="bg-gray-800 text-red-400 p-3 rounded mt-2 overflow-x-auto">
{`{
  "status": "error",
  "message": "Error message description",
  "details": { ... }  // Optional additional details
}`}
              </pre>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mt-4">
                <p className="text-yellow-800">
                  <strong>Note:</strong> Ensure your wallet has sufficient balance before making a purchase request. 
                  You can check your wallet balance from your dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Data Packages */}
          <div className="mb-8" id="data-packages">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <FaNetworkWired className="mr-2" /> Available Data Packages
            </h2>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <p className="mb-4">
                To get available data packages for a specific network, use the <code className="bg-gray-200 px-1 rounded">GET /api/developer/data-packages</code> endpoint:
              </p>
              <pre className="bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
                GET /api/developer/data-packages?network=TELECEL
              </pre>
              
              <h3 className="font-semibold mt-4 text-gray-800">Response:</h3>
              <pre className="bg-gray-800 text-green-400 p-3 rounded mt-2 overflow-x-auto">
{`{
  "status": "success",
  "data": [
    {
      "capacity": "5",
      "mb": "5000",
      "price": "23.00",
      "network": "TELECEL"
    },
    {
      "capacity": "10",
      "mb": "10000",
      "price": "35.50", 
      "network": "TELECEL"
    },
    // More packages...
  ]
}`}
              </pre>
              
              <p className="mt-4">
                You can also get packages for all networks at once:
              </p>
              <pre className="bg-gray-800 text-green-400 p-3 rounded mt-2 overflow-x-auto">
                GET /api/developer/data-packages
              </pre>
              
              <h3 className="font-semibold mt-4 text-gray-800">Response (All Networks):</h3>
              <pre className="bg-gray-800 text-green-400 p-3 rounded mt-2 overflow-x-auto">
{`{
  "status": "success",
  "data": {
    "TELECEL": [
      // Vodafone packages
    ],
    "YELLO": [
      // MTN packages
    ],
    "AT_PREMIUM": [
      // AirtelTigo packages
    ]
  }
}`}
              </pre>
            </div>
          </div>

          {/* Additional Endpoints */}
          <div className="mb-8" id="additional-endpoints">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <FaTable className="mr-2" /> Additional Endpoints
            </h2>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              
              {/* Transaction History */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800">Transaction History</h3>
                <p className="mt-2">Retrieve transaction history for your account:</p>
                <pre className="bg-gray-800 text-white p-3 rounded mt-2 overflow-x-auto">
                  GET /api/developer/transactions?page=1&limit=20
                </pre>
                <p className="mt-2">Response:</p>
                <pre className="bg-gray-800 text-green-400 p-3 rounded mt-2 overflow-x-auto">
{`{
  "status": "success",
  "data": {
    "transactions": [
      {
        "_id": "60f1e5b3e6b39812345678",
        "userId": "60f1e5b3e6b39812345679",
        "type": "purchase",
        "amount": 23.00,
        "status": "completed",
        "reference": "TRX-a1b2c3d4-...",
        "gateway": "wallet",
        "createdAt": "2023-01-01T12:00:00.000Z",
        "updatedAt": "2023-01-01T12:00:00.000Z"
      },
      // More transactions...
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 92
    }
  }
}`}
                </pre>
              </div>
              
              {/* Claim Referral Bonus */}
              <div>
                <h3 className="font-semibold text-gray-800">Claim Referral Bonus</h3>
                <p className="mt-2">Claim any pending referral bonuses for your account:</p>
                <pre className="bg-gray-800 text-white p-3 rounded mt-2 overflow-x-auto">
                  POST /api/developer/claim-referral-bonus
                </pre>
                <p className="mt-2">Response:</p>
                <pre className="bg-gray-800 text-green-400 p-3 rounded mt-2 overflow-x-auto">
{`{
  "status": "success",
  "data": {
    "bonusClaimed": 15.00,
    "processedBonuses": ["60f1e5b3e6b39812345680", "60f1e5b3e6b39812345681"],
    "newWalletBalance": 192.00
  }
}`}
                </pre>
              </div>
            </div>
          </div>
          
          {/* API Simulator */}
          <div className="mb-8" id="api-simulator">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <FaPlay className="mr-2" /> API Simulator
            </h2>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <p className="mb-4">Test the Data Purchase API with your own API key:</p>
              
              <form onSubmit={handleSimulation} className="space-y-4">
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">Your API Key</label>
                  <input
                    type="text"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 0551234567"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="network" className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                    <select
                      id="network"
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="TELECEL">Vodafone (TELECEL)</option>
                      <option value="YELLO">MTN (YELLO)</option>
                      <option value="AT_PREMIUM">AirtelTigo (AT_PREMIUM)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">Data Capacity (GB)</label>
                    <select
                      id="capacity"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="2">2 GB</option>
                      <option value="5">5 GB</option>
                      <option value="10">10 GB</option>
                      <option value="15">15 GB</option>
                      <option value="20">20 GB</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Test Purchase API'}
                  </button>
                </div>
              </form>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              
              {responseData && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-800 mb-2">API Response:</h3>
                  <pre className="bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
                    {JSON.stringify(responseData, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="mt-6 text-sm text-gray-600">
                <p><strong>Note:</strong> This is a simulation tool for testing purposes only. No actual API calls are made, 
                and no data bundles are purchased. Use this tool to understand how the API works before integrating it into your application.</p>
              </div>
            </div>
          </div>

          {/* Code Samples */}
          <div className="mb-8" id="code-samples">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <FaCode className="mr-2" /> Code Samples
            </h2>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="font-semibold mb-2 text-gray-800">Next.js Example:</h3>
              <pre className="bg-gray-800 text-white p-3 rounded overflow-x-auto">
{`// pages/api/purchase-data.js
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { phoneNumber, network, capacity } = req.body;
  
  // Validate required fields
  if (!phoneNumber || !network || !capacity) {
    return res.status(400).json({ 
      message: 'Missing required fields' 
    });
  }

  try {
    const response = await axios.post(
      'https://datamartbackened.onrender.com/api/developer/purchase',
      {
        phoneNumber,
        network,
        capacity,
        gateway: 'wallet'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.DATAMART_API_KEY
        }
      }
    );

    return res.status(201).json(response.data);
  } catch (error) {
    console.error('DataMart API Error:', error.response?.data || error.message);
    
    return res.status(error.response?.status || 500).json({
      message: 'Failed to purchase data bundle',
      details: error.response?.data || error.message
    });
  }
}`}
              </pre>
              
              <h3 className="font-semibold mt-6 mb-2 text-gray-800">Node.js Example:</h3>
              <pre className="bg-gray-800 text-white p-3 rounded overflow-x-auto">
{`// data-service.js
const axios = require('axios');

class DataMartService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://datamartbackened.onrender.com/api/developer';
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    });
  }

  async purchaseData(phoneNumber, network, capacity) {
    try {
      const response = await this.httpClient.post('/purchase', {
        phoneNumber,
        network,
        capacity,
        gateway: 'wallet'
      });
      
      return response.data;
    } catch (error) {
      console.error('DataMart API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getDataPackages(network = null) {
    try {
      const url = network ? \`/data-packages?network=\${network}\` : '/data-packages';
      const response = await this.httpClient.get(url);
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch data packages:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = DataMartService;`}
              </pre>
              
              <h3 className="font-semibold mt-6 mb-2 text-gray-800">Python Example:</h3>
              <pre className="bg-gray-800 text-white p-3 rounded overflow-x-auto">
{`# datamart_client.py
import requests

class DataMartClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://datamartbackened.onrender.com/api/developer'
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        }
    
    def purchase_data(self, phone_number, network, capacity):
        """Purchase a data bundle for the specified phone number."""
        url = f"{self.base_url}/purchase"
        payload = {
            'phoneNumber': phone_number,
            'network': network,
            'capacity': capacity,
            'gateway': 'wallet'
        }
        
        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()  # Raise exception for 4XX/5XX responses
        
        return response.json()
    
    def get_data_packages(self, network=None):
        """Get available data packages, optionally filtered by network."""
        url = f"{self.base_url}/data-packages"
        if network:
            url += f"?network={network}"
        
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        
        return response.json()

# Usage example
if __name__ == "__main__":
    client = DataMartClient("your_api_key_here")
    
    # Get MTN data packages
    mtn_packages = client.get_data_packages("YELLO")
    print(mtn_packages)
    
    # Purchase data bundle
    result = client.purchase_data("0551234567", "TELECEL", "5")
    print(result)`}
              </pre>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t text-gray-600">
            <p className="mb-2">For more help or support:</p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <FaWhatsapp className="text-green-600 mr-2" /> 
                WhatsApp: 0597760914
              </li>
              <li>
                <a href="https://chat.whatsapp.com/HfHCT72jm2Z1B14fsJjuhT" className="text-blue-600 hover:underline">
                  Join our WhatsApp Developer Community
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default DataMartDocumentation;