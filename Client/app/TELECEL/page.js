'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TelecelBundleCards = () => {
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState({ text: '', type: '' });
  const [bundleMessages, setBundleMessages] = useState({});
  const [userData, setUserData] = useState(null);

  // Get user data from localStorage on component mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
  }, []);

  const bundles = [
    // { capacity: '1', mb: '1000', price: '3.65', network: 'TELECEL' },
    // { capacity: '2', mb: '2000', price: '7.30', network: 'TELECEL' },
    // { capacity: '3', mb: '3000', price: '11.20', network: 'TELECEL' },
    // { capacity: '4', mb: '4000', price: '14.00', network: 'TELECEL' },
    { capacity: '5', mb: '5000', price: '1.00', network: 'TELECEL' },
    { capacity: '6', mb: '6000', price: '21.00', network: 'TELECEL' },
    { capacity: '8', mb: '8000', price: '28.00', network: 'TELECEL' },
    { capacity: '10', mb: '10000', price: '35.50', network: 'TELECEL' },
    { capacity: '12', mb: '12000', price: '42.50', network: 'TELECEL' },
    { capacity: '15', mb: '15000', price: '55.50', network: 'TELECEL' },
    { capacity: '20', mb: '20000', price: '75.00', network: 'TELECEL' },
    { capacity: '25', mb: '25000', price: '92.00', network: 'TELECEL' },
    { capacity: '30', mb: '30000', price: '110.00', network: 'TELECEL' },
    { capacity: '40', mb: '40000', price: '145.00', network: 'TELECEL' },
    { capacity: '50', mb: '50000', price: '180.00', network: 'TELECEL' }
  ];

  // Telecel Logo SVG
  const TelecelLogo = () => (
    <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill="#ffffff" stroke="#cc0000" strokeWidth="2"/>
      <text x="100" y="110" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="32" fill="#cc0000">TELECEL</text>
      <path d="M50 125 L150 125" stroke="#cc0000" strokeWidth="5" strokeLinecap="round"/>
      <text x="100" y="150" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="20" fill="#cc0000">PREMIUM</text>
    </svg>
  );

  const handleSelectBundle = (index) => {
    setSelectedBundleIndex(index === selectedBundleIndex ? null : index);
    setPhoneNumber('');
    // Clear any error messages for this bundle
    setBundleMessages(prev => ({ ...prev, [index]: null }));
  };

  const handlePurchase = async (bundle, index) => {
    // Clear previous messages
    setBundleMessages(prev => ({ ...prev, [index]: null }));
    setGlobalMessage({ text: '', type: '' });
    
    if (!phoneNumber || phoneNumber.length < 10) {
      setBundleMessages(prev => ({ 
        ...prev, 
        [index]: { text: 'Please enter a valid phone number', type: 'error' } 
      }));
      return;
    }

    if (!userData || !userData.id) {
      setGlobalMessage({ text: 'User not authenticated. Please login to continue.', type: 'error' });
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('https://datamartbackened.onrender.com/api/v1/data/purchase-data', {
        userId: userData.id,
        phoneNumber: phoneNumber,
        network: bundle.network,
        capacity: bundle.capacity,
        price: parseFloat(bundle.price)
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.status === 'success') {
        setGlobalMessage({ 
          text: `${bundle.capacity}GB data bundle purchased successfully for ${phoneNumber}`, 
          type: 'success' 
        });
        setSelectedBundleIndex(null);
        setPhoneNumber('');
        
        // Auto-scroll to the top to see the success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setBundleMessages(prev => ({ 
        ...prev, 
        [index]: { 
          text: error.response?.data?.message || 'Failed to purchase data bundle', 
          type: 'error' 
        } 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-center text-red-600">Telecel Premium Bundles</h1>
      
      {globalMessage.text && (
        <div className={`mb-6 p-4 rounded-lg shadow ${globalMessage.type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' : 'bg-red-100 text-red-800 border-l-4 border-red-500'}`}>
          <div className="flex items-center">
            <div className="mr-3">
              {globalMessage.type === 'success' ? (
                <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <span className="font-medium">{globalMessage.text}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {bundles.map((bundle, index) => (
          <div key={index} className="flex flex-col shadow-lg rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-105">
            <div 
              className={`flex bg-gradient-to-tr from-red-700 to-red-500 text-white w-full flex-col justify-between cursor-pointer transition-all duration-300 ${selectedBundleIndex === index ? 'rounded-b-none' : 'rounded-b-lg'}`}
              onClick={() => handleSelectBundle(index)}
            >
              <div className="flex flex-col items-center justify-center w-full p-3 space-y-3">
                <div className="w-20 h-20 flex justify-center items-center mt-2">
                  <TelecelLogo />
                </div>
                <h3 className="text-2xl font-bold">
                  {bundle.capacity} GB
                </h3>
              </div>
              <div className="grid grid-cols-2 text-white bg-black/80">
                <div className="flex flex-col items-center justify-center p-3 text-center border-r border-r-red-700">
                  <p className="text-xl">GH₵ {bundle.price}</p>
                  <p className="text-sm font-medium">Price</p>
                </div>
                <div className="flex flex-col items-center justify-center p-3 text-center">
                  <p className="text-xl">No-Expiry</p>
                  <p className="text-sm font-medium">Duration</p>
                </div>
              </div>
            </div>
            
            {selectedBundleIndex === index && (
              <div className="bg-gradient-to-br from-red-600 to-red-700 p-4 rounded-b-lg shadow-md">
                {bundleMessages[index] && (
                  <div className={`mb-3 p-3 rounded-md ${bundleMessages[index].type === 'success' ? 'bg-green-100 text-green-800' : 'bg-white text-red-800 border-l-4 border-yellow-500'}`}>
                    <div className="flex items-center">
                      {bundleMessages[index].type === 'error' && (
                        <svg className="h-5 w-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      {bundleMessages[index].text}
                    </div>
                  </div>
                )}
                
                <div className="mb-4">
                  <input
                    type="tel"
                    className="w-full px-4 py-3 rounded-md bg-white/90 text-red-900 placeholder-red-400 border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                    placeholder="Enter recipient number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => handlePurchase(bundle, index)}
                  className="w-full px-4 py-3 bg-red-900 text-white rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-200 disabled:bg-red-300 disabled:cursor-not-allowed transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : 'Purchase Now'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TelecelBundleCards;