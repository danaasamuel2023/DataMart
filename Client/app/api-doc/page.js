import React from 'react';

const DataMartDocumentation = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">DataMart API Documentation</h1>
        <p className="text-gray-600 mt-2">Mobile Data Bundle Purchase API</p>
      </header>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Authentication</h2>
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
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Purchase Endpoint</h2>
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
    "price": 35.5,
    "remainingBalance": 164.5,
    "geonetechResponse": { ... }
  }
}`}
          </pre>

          <h3 className="font-semibold mt-4 text-gray-800">Error Response (400/401/500):</h3>
          <pre className="bg-gray-800 text-red-400 p-3 rounded mt-2 overflow-x-auto">
{`{
  "status": "error",
  "message": "Error message description",
  "details": { ... }  // Optional additional details
}`}
          </pre>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Sample Code</h2>
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
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Available Data Packages</h2>
        <p className="mb-4">
          To get available data packages for a specific network, use the <code className="bg-gray-200 px-1 rounded">GET /data-packages</code> endpoint:
        </p>
        <pre className="bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
          GET /data-packages?network=TELECEL
        </pre>
      </div>

      <div className="mt-8 pt-4 border-t text-gray-600 text-sm">
        <p>For more help or support, contact us at  0597760914</p>
      </div>
    </div>
  );
};

export default DataMartDocumentation;