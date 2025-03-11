'use client'
import React, { useState } from 'react';
import Head from 'next/head';

export default function ApiDocumentation() {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Unimart API Documentation</title>
        <meta name="description" content="Developer documentation for integrating with the Unimart Data API" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-blue-600 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">Unimart API Documentation</h1>
          <p className="mt-2 text-blue-100">Integrate mobile data purchasing capabilities into your applications</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4 sticky top-4">
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'overview' ? 'bg-blue-100 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}
                  >
                    Overview
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('authentication')}
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'authentication' ? 'bg-blue-100 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}
                  >
                    Authentication
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('endpoints')}
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'endpoints' ? 'bg-blue-100 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}
                  >
                    Endpoints
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('errors')}
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'errors' ? 'bg-blue-100 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}
                  >
                    Error Handling
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('pricing')}
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'pricing' ? 'bg-blue-100 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('examples')}
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'examples' ? 'bg-blue-100 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}
                  >
                    Examples
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('support')}
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'support' ? 'bg-blue-100 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}
                  >
                    Support
                  </button>
                </li>
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-lg shadow p-6">
              {/* Overview Section */}
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
                  <p className="mt-4 text-gray-600">
                    The Unimart API allows developers to integrate mobile data purchase capabilities into their applications. 
                    This API supports purchasing data bundles for MTN, AirtelTigo, and Telecel networks in Ghana.
                  </p>
                  
                  <h3 className="text-xl font-semibold mt-6 text-gray-800">Base URL</h3>
                  <div className="mt-2 bg-gray-800 text-white p-3 rounded font-mono">
                    https://api.unimart.com/v1
                  </div>
                  
                  <h3 className="text-xl font-semibold mt-6 text-gray-800">Network Keys</h3>
                  <p className="mt-2 text-gray-600">Use these network identifiers when making data purchase requests:</p>
                  <ul className="mt-2 list-disc list-inside text-gray-600">
                    <li><span className="font-semibold">MTN</span> = "YELLO"</li>
                    <li><span className="font-semibold">AirtelTigo</span> = "AT_PREMIUM"</li>
                    <li><span className="font-semibold">Telecel</span> = "TELECEL"</li>
                  </ul>
                  
                  <h3 className="text-xl font-semibold mt-6 text-gray-800">Rate Limits</h3>
                  <ul className="mt-2 list-disc list-inside text-gray-600">
                    <li>100 requests per minute per API key</li>
                    <li>2,000 requests per day per API key</li>
                  </ul>
                </div>
              )}

              {/* Authentication Section */}
              {activeTab === 'authentication' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Authentication</h2>
                  <p className="mt-4 text-gray-600">
                    All API requests require authentication using a JWT token. Include the token in the Authorization header of your request.
                  </p>
                  
                  <h3 className="text-xl font-semibold mt-6 text-gray-800">Authorization Header</h3>
                  <div className="mt-2 bg-gray-800 text-white p-3 rounded font-mono">
                    Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                  </div>
                  
                  <h3 className="text-xl font-semibold mt-6 text-gray-800">Getting a Token</h3>
                  <p className="mt-2 text-gray-600">
                    Authentication tokens must be obtained through the Unimart user registration and login system. 
                    Tokens expire after 24 hours.
                  </p>
                  
                  <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 text-blue-700">
                    <p className="font-semibold">Security Note</p>
                    <p className="mt-1">Never expose your JWT token in client-side code. All API requests should be made from your server.</p>
                  </div>
                </div>
              )}

              {/* Endpoints Section */}
              {activeTab === 'endpoints' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">API Endpoints</h2>
                  
                  {/* Purchase Data Bundle */}
                  <div className="mt-6 border-t pt-6">
                    <div className="flex items-center">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-semibold">POST</span>
                      <h3 className="ml-2 text-xl font-semibold text-gray-800">/purchase</h3>
                    </div>
                    <p className="mt-2 text-gray-600">Purchase mobile data for a specific phone number.</p>
                    
                    <h4 className="font-semibold mt-4 text-gray-700">Request Parameters</h4>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="py-2 px-4 text-left border">Parameter</th>
                            <th className="py-2 px-4 text-left border">Type</th>
                            <th className="py-2 px-4 text-left border">Required</th>
                            <th className="py-2 px-4 text-left border">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2 px-4 border">phoneNumber</td>
                            <td className="py-2 px-4 border">String</td>
                            <td className="py-2 px-4 border">Yes</td>
                            <td className="py-2 px-4 border">The recipient's phone number</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4 border">network</td>
                            <td className="py-2 px-4 border">String</td>
                            <td className="py-2 px-4 border">Yes</td>
                            <td className="py-2 px-4 border">Mobile network (see Network Keys)</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4 border">capacity</td>
                            <td className="py-2 px-4 border">Number</td>
                            <td className="py-2 px-4 border">Yes</td>
                            <td className="py-2 px-4 border">Data amount in GB</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4 border">gateway</td>
                            <td className="py-2 px-4 border">String</td>
                            <td className="py-2 px-4 border">Yes</td>
                            <td className="py-2 px-4 border">Payment gateway used</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <h4 className="font-semibold mt-4 text-gray-700">Example Request</h4>
                    <pre className="mt-2 bg-gray-800 text-white p-3 rounded font-mono overflow-x-auto">
{`{
  "phoneNumber": "0200123456",
  "network": "YELLO",
  "capacity": 2,
  "gateway": "wallet"
}`}
                    </pre>
                    
                    <h4 className="font-semibold mt-4 text-gray-700">Example Response</h4>
                    <pre className="mt-2 bg-gray-800 text-white p-3 rounded font-mono overflow-x-auto">
{`{
  "status": "success",
  "data": {
    "purchaseId": "60f8a1e3bc9a7d2e4c8e6f7a",
    "transactionReference": "7e8b9c3d-f45a-41b2-8c7d-9e0f1a2b3c4d",
    "network": "YELLO",
    "capacity": 2,
    "price": 3,
    "remainingBalance": 97
  }
}`}
                    </pre>
                  </div>
                  
                  {/* Get Purchase History */}
                  <div className="mt-6 border-t pt-6">
                    <div className="flex items-center">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold">GET</span>
                      <h3 className="ml-2 text-xl font-semibold text-gray-800">/purchases</h3>
                    </div>
                    <p className="mt-2 text-gray-600">Retrieve the user's data purchase history.</p>
                    
                    <h4 className="font-semibold mt-4 text-gray-700">Query Parameters</h4>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="py-2 px-4 text-left border">Parameter</th>
                            <th className="py-2 px-4 text-left border">Type</th>
                            <th className="py-2 px-4 text-left border">Required</th>
                            <th className="py-2 px-4 text-left border">Default</th>
                            <th className="py-2 px-4 text-left border">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2 px-4 border">page</td>
                            <td className="py-2 px-4 border">Number</td>
                            <td className="py-2 px-4 border">No</td>
                            <td className="py-2 px-4 border">1</td>
                            <td className="py-2 px-4 border">Page number for pagination</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4 border">limit</td>
                            <td className="py-2 px-4 border">Number</td>
                            <td className="py-2 px-4 border">No</td>
                            <td className="py-2 px-4 border">20</td>
                            <td className="py-2 px-4 border">Items per page</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <h4 className="font-semibold mt-4 text-gray-700">Example Response</h4>
                    <pre className="mt-2 bg-gray-800 text-white p-3 rounded font-mono overflow-x-auto">
{`{
  "status": "success",
  "data": {
    "purchases": [
      {
        "_id": "60f8a1e3bc9a7d2e4c8e6f7a",
        "userId": "60f7b2d4ab9a8c3e4d5f6g7h",
        "phoneNumber": "0200123456",
        "network": "YELLO",
        "capacity": 2,
        "gateway": "wallet",
        "method": "api",
        "price": 3,
        "status": "pending",
        "createdAt": "2025-03-05T15:30:45.123Z",
        "updatedAt": "2025-03-05T15:30:45.123Z"
      }
      // Additional purchase records...
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
                  
                  {/* Get Transaction History */}
                  <div className="mt-6 border-t pt-6">
                    <div className="flex items-center">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold">GET</span>
                      <h3 className="ml-2 text-xl font-semibold text-gray-800">/transactions</h3>
                    </div>
                    <p className="mt-2 text-gray-600">Retrieve the user's transaction history.</p>
                    
                    <h4 className="font-semibold mt-4 text-gray-700">Query Parameters</h4>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="py-2 px-4 text-left border">Parameter</th>
                            <th className="py-2 px-4 text-left border">Type</th>
                            <th className="py-2 px-4 text-left border">Required</th>
                            <th className="py-2 px-4 text-left border">Default</th>
                            <th className="py-2 px-4 text-left border">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2 px-4 border">page</td>
                            <td className="py-2 px-4 border">Number</td>
                            <td className="py-2 px-4 border">No</td>
                            <td className="py-2 px-4 border">1</td>
                            <td className="py-2 px-4 border">Page number for pagination</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4 border">limit</td>
                            <td className="py-2 px-4 border">Number</td>
                            <td className="py-2 px-4 border">No</td>
                            <td className="py-2 px-4 border">20</td>
                            <td className="py-2 px-4 border">Items per page</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <h4 className="font-semibold mt-4 text-gray-700">Example Response</h4>
                    <pre className="mt-2 bg-gray-800 text-white p-3 rounded font-mono overflow-x-auto">
{`{
  "status": "success",
  "data": {
    "transactions": [
      {
        "_id": "60f8a1e3bc9a7d2e4c8e6f7b",
        "userId": "60f7b2d4ab9a8c3e4d5f6g7h",
        "type": "purchase",
        "amount": 3,
        "status": "pending",
        "reference": "7e8b9c3d-f45a-41b2-8c7d-9e0f1a2b3c4d",
        "gateway": "wallet",
        "createdAt": "2025-03-05T15:30:45.123Z",
        "updatedAt": "2025-03-05T15:30:45.123Z"
      }
      // Additional transaction records...
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 8,
      "totalItems": 147
    }
  }
}`}
                    </pre>
                  </div>
                  
                  {/* Claim Referral Bonus */}
                  <div className="mt-6 border-t pt-6">
                    <div className="flex items-center">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-semibold">POST</span>
                      <h3 className="ml-2 text-xl font-semibold text-gray-800">/claim-referral-bonus</h3>
                    </div>
                    <p className="mt-2 text-gray-600">Claim pending referral bonuses for the authenticated user.</p>
                    
                    <h4 className="font-semibold mt-4 text-gray-700">Example Response</h4>
                    <pre className="mt-2 bg-gray-800 text-white p-3 rounded font-mono overflow-x-auto">
{`{
  "status": "success",
  "data": {
    "bonusClaimed": 15,
    "processedBonuses": [
      "60f8a1e3bc9a7d2e4c8e6f7c",
      "60f8a1e3bc9a7d2e4c8e6f7d"
    ],
    "newWalletBalance": 112
  }
}`}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error Handling Section */}
              {activeTab === 'errors' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Error Handling</h2>
                  <p className="mt-4 text-gray-600">
                    All endpoints return error responses in the following format:
                  </p>
                  
                  <pre className="mt-4 bg-gray-800 text-white p-3 rounded font-mono">
{`{
  "status": "error",
  "message": "Error description"
}`}
                  </pre>
                  
                  <h3 className="text-xl font-semibold mt-6 text-gray-800">Common Error Messages</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="py-2 px-4 text-left border">Status Code</th>
                          <th className="py-2 px-4 text-left border">Message</th>
                          <th className="py-2 px-4 text-left border">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2 px-4 border">401</td>
                          <td className="py-2 px-4 border">No token provided</td>
                          <td className="py-2 px-4 border">Authentication token is missing</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 border">401</td>
                          <td className="py-2 px-4 border">Invalid token</td>
                          <td className="py-2 px-4 border">Token provided is not valid</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 border">401</td>
                          <td className="py-2 px-4 border">Unauthorized</td>
                          <td className="py-2 px-4 border">Token has expired or is not authorized</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 border">500</td>
                          <td className="py-2 px-4 border">Insufficient wallet balance</td>
                          <td className="py-2 px-4 border">User does not have enough balance for purchase</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pricing Section */}
              {activeTab === 'pricing' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Data Pricing</h2>
                  <p className="mt-4 text-gray-600">
                    Pricing varies by network and capacity. Below are the current rates per GB:
                  </p>
                  
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="py-2 px-4 text-left border">Network</th>
                          <th className="py-2 px-4 text-left border">Network Key</th>
                          <th className="py-2 px-4 text-left border">Price per GB</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2 px-4 border">MTN</td>
                          <td className="py-2 px-4 border">YELLO</td>
                          <td className="py-2 px-4 border">GH₵1.5</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 border">Vodafone</td>
                          <td className="py-2 px-4 border">VODAFONE</td>
                          <td className="py-2 px-4 border">GH₵1.7</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 border">AirtelTigo</td>
                          <td className="py-2 px-4 border">AT_PREMIUM</td>
                          <td className="py-2 px-4 border">GH₵1.6</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 border">Telecel</td>
                          <td className="py-2 px-4 border">TELECEL</td>
                          <td className="py-2 px-4 border">Variable (based on promotions)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 text-yellow-800">
                    <p className="font-semibold">Note</p>
                    <p className="mt-1">Prices are subject to change. Always check the response of the purchase API call for the actual price charged.</p>
                  </div>
                </div>
              )}

              {/* Examples Section */}
              {activeTab === 'examples' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Implementation Examples</h2>
                  
                  <h3 className="text-xl font-semibold mt-6 text-gray-800">JavaScript / Node.js</h3>
                  <pre className="mt-2 bg-gray-800 text-white p-3 rounded font-mono overflow-x-auto">
{`// Example JavaScript implementation
async function purchaseData(phoneNumber, network, capacity) {
  try {
    const response = await fetch('https://api.unimart.com/v1/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'YOUR_JWT_TOKEN'
      },
      body: JSON.stringify({
        phoneNumber,
        network,
        capacity,
        gateway: 'wallet'
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error purchasing data:', error);
    throw error;
  }
}`}
                  </pre>
                  
                  <h3 className="text-xl font-semibold mt-6 text-gray-800">Python</h3>
                  <pre className="mt-2 bg-gray-800 text-white p-3 rounded font-mono overflow-x-auto">
{`# Example Python implementation
import requests
import json

def purchase_data(phone_number, network, capacity, token):
    url = "https://api.unimart.com/v1/purchase"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": token
    }
    
    payload = {
        "phoneNumber": phone_number,
        "network": network,
        "capacity": capacity,
        "gateway": "wallet"
    }
    
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    return response.json()`}
                  </pre>
                  
                  <h3 className="text-xl font-semibold mt-6 text-gray-800">React / Next.js</h3>
                  <pre className="mt-2 bg-gray-800 text-white p-3 rounded font-mono overflow-x-auto">
{`// Example React hook for data purchase
import { useState } from 'react';

export function useDataPurchase() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const purchaseData = async (phoneNumber, network, capacity, token) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://api.unimart.com/v1/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          phoneNumber,
          network,
          capacity,
          gateway: 'wallet'
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.message);
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { purchaseData, isLoading, error };
}`}
                  </pre>
                </div>
              )}

              {/* Support Section */}
              {activeTab === 'support' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Support</h2>
                  <p className="mt-4 text-gray-600">
                    For technical support, please contact us through one of the following channels:
                  </p>
                  
                  <div className="mt-6 grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h3 className="font-semibold text-lg">Developer Portal</h3>
                      <p className="mt-2">
                        <a href="https://developers.unimart.com" className="text-blue-600 hover:underline">
                          https://developers.unimart.com
                        </a>
                      </p>
                      <p className="mt-2 text-gray-600">Access documentation, tutorials, and community forums</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h3 className="font-semibold text-lg">Email Support</h3>
                      <p className="mt-2">
                      <a href="mailto:developers@unimart.com" className="text-blue-600 hover:underline">
                          developers@unimart.com
                        </a>
                      </p>
                      <p className="mt-2 text-gray-600">Our engineering team typically responds within 24 hours</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-gray-800">API Status</h3>
                    <p className="mt-2 text-gray-600">
                      Check our current API status and incident history at:
                    </p>
                    <p className="mt-2">
                      <a href="https://status.unimart.com" className="text-blue-600 hover:underline">
                        https://status.unimart.com
                      </a>
                    </p>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-gray-800">FAQs</h3>
                    
                    <div className="mt-4 space-y-4">
                      <div className="border-b pb-4">
                        <h4 className="font-semibold">How do I get started with the Unimart API?</h4>
                        <p className="mt-1 text-gray-600">
                          Sign up for a developer account at developers.unimart.com, create an application, and obtain your API credentials.
                        </p>
                      </div>
                      
                      <div className="border-b pb-4">
                        <h4 className="font-semibold">What happens if the data purchase fails?</h4>
                        <p className="mt-1 text-gray-600">
                          If a purchase fails, the transaction will be marked as failed and any deducted funds will be returned to your wallet balance.
                        </p>
                      </div>
                      
                      <div className="border-b pb-4">
                        <h4 className="font-semibold">Can I cancel a data purchase?</h4>
                        <p className="mt-1 text-gray-600">
                          Once a data purchase is initiated, it cannot be canceled. If the purchase fails, funds will be automatically refunded.
                        </p>
                      </div>
                      
                      <div className="border-b pb-4">
                        <h4 className="font-semibold">How do I report a bug or suggest a feature?</h4>
                        <p className="mt-1 text-gray-600">
                          Please email our developer support team with detailed information about bugs or feature requests.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">Unimart API</h3>
              <p className="mt-2 text-gray-400">Making mobile data accessible for developers</p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <ul className="flex space-x-4">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>© {new Date().getFullYear()} Unimart. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}