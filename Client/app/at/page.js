'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HubnetBundleCards = () => {
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referrerNumber, setReferrerNumber] = useState(''); 
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

  // Only include AirtelTigo bundles
  const bundles = [
    { capacity: '1', price: '0.10', network: 'at' },
    { capacity: '2', price: '12.00', network: 'at' },
    { capacity: '5', price: '28.00', network: 'at' },
    { capacity: '10', price: '55.00', network: 'at' }
  ];

  // Network Logo Component for AirtelTigo
  const NetworkLogo = () => {
    return (
      <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="85" fill="#ffffff" stroke="#1e40af" strokeWidth="2"/>
        <text x="100" y="115" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="65" fill="#1e40af">AT</text>
        <path d="M70 130 L130 130" stroke="#1e40af" strokeWidth="5" strokeLinecap="round"/>
      </svg>
    );
  };

  const getNetworkColor = () => {
    return 'bg-blue-700'; // AirtelTigo color
  };

  const handleSelectBundle = (index) => {
    setSelectedBundleIndex(index === selectedBundleIndex ? null : index);
    setPhoneNumber('');
    setReferrerNumber('');
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
      const response = await axios.post('http://localhost:5000/api/v1/purchase-hubnet-data', {
        userId: userData.id,
        phoneNumber: phoneNumber,
        network: bundle.network,
        dataAmountGB: bundle.capacity,
        price: parseFloat(bundle.price),
        referrerNumber: referrerNumber || null
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
        setReferrerNumber('');
        
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">AirtelTigo Data Bundles</h1>
      
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
          <div key={`airteltigo-${index}`} className="flex flex-col">
            <div 
              className={`flex ${getNetworkColor()} text-white w-full rounded-t-lg flex-col justify-between cursor-pointer transition-transform duration-300 hover:translate-y-[-5px] ${selectedBundleIndex === index ? 'rounded-b-none' : 'rounded-b-lg'}`}
              onClick={() => handleSelectBundle(index)}
            >
              <div className="flex flex-col items-center justify-center w-full p-3 space-y-3">
                <div className="w-20 h-20 flex justify-center items-center">
                  <NetworkLogo />
                </div>
                <h3 className="text-xl font-bold">
                  {bundle.capacity} GB
                </h3>
              </div>
              <div className="grid grid-cols-2 text-white bg-black" 
                   style={{ borderRadius: selectedBundleIndex === index ? '0' : '0 0 0.5rem 0.5rem' }}>
                <div className="flex flex-col items-center justify-center p-3 text-center border-r border-r-white">
                  <p className="text-lg">GH₵ {bundle.price}</p>
                  <p className="text-sm font-bold">Price</p>
                </div>
                <div className="flex flex-col items-center justify-center p-3 text-center">
                  <p className="text-lg">30 Days</p>
                  <p className="text-sm font-bold">Duration</p>
                </div>
              </div>
            </div>
            
            {selectedBundleIndex === index && (
              <div className={`${getNetworkColor()} p-4 rounded-b-lg shadow-md`}>
                {bundleMessages[index] && (
                  <div className={`mb-3 p-3 rounded ${bundleMessages[index].type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800 border-l-4 border-red-500'}`}>
                    <div className="flex items-center">
                      {bundleMessages[index].type === 'error' && (
                        <svg className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    className="w-full px-4 py-2 mb-2 rounded bg-opacity-90 bg-white text-gray-800 placeholder-gray-500 border focus:outline-none focus:border-blue-300"
                    placeholder="Enter recipient number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  
                  <input
                    type="tel"
                    className="w-full px-4 py-2 rounded bg-opacity-90 bg-white text-gray-800 placeholder-gray-500 border focus:outline-none focus:border-blue-300"
                    placeholder="Reseller number (optional)"
                    value={referrerNumber}
                    onChange={(e) => setReferrerNumber(e.target.value)}
                  />
                  <p className="text-xs text-white mt-1">For SMS updates about this purchase</p>
                </div>
                
                <button
                  onClick={() => handlePurchase(bundle, index)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
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
                  ) : 'Purchase'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HubnetBundleCards;