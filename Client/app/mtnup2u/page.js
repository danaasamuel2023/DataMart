'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MTNBundleCards = () => {
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
    { capacity: '1', mb: '1000', price: '4.700', network: 'YELLO' },
    { capacity: '2', mb: '2000', price: '9.500', network: 'YELLO' },
    { capacity: '3', mb: '3000', price: '13.5', network: 'YELLO' },
    { capacity: '4', mb: '4000', price: '18.00', network: 'YELLO' },
    { capacity: '5', mb: '5000', price: '22.50', network: 'YELLO' },
    { capacity: '6', mb: '6000', price: '27.00', network: 'YELLO' },
    { capacity: '8', mb: '8000', price: '35.50', network: 'YELLO' },
    { capacity: '10', mb: '10000', price: '43.50', network: 'YELLO' },
    // { capacity: '12', mb: '15000', price: '55.50', network: 'YELLO' },
    { capacity: '15', mb: '15000', price: '62.50', network: 'YELLO' },
    { capacity: '20', mb: '20000', price: '85.00', network: 'YELLO' },
    { capacity: '25', mb: '25000', price: '105.00', network: 'YELLO' },
    { capacity: '30', mb: '30000', price: '128.00', network: 'YELLO' },
    { capacity: '40', mb: '40000', price: '165.00', network: 'YELLO' },
    { capacity: '50', mb: '50000', price: '206.00', network: 'YELLO' },
    { capacity: '100', mb: '100000', price: '406.00', network: 'YELLO' }
  ];

  // MTN Logo SVG
  const MTNLogo = () => (
    <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill="#ffcc00" stroke="#000" strokeWidth="2"/>
      <path d="M50 80 L80 140 L100 80 L120 140 L150 80" stroke="#000" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="100" y="170" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="28">MTN</text>
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">MTN Non-Expiry Bundles</h1>
      
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
          <div key={index} className="flex flex-col">
            <div 
              className={`flex flex-col bg-yellow-400 overflow-hidden shadow-md cursor-pointer transition-transform duration-300 hover:translate-y-[-5px] ${selectedBundleIndex === index ? 'rounded-t-lg' : 'rounded-lg'}`}
              onClick={() => handleSelectBundle(index)}
            >
              <div className="flex flex-col items-center justify-center p-5 space-y-3">
                <div className="w-20 h-20 flex justify-center items-center">
                  <MTNLogo />
                </div>
                <h3 className="text-xl font-bold">
                  {bundle.capacity} GB
                </h3>
              </div>
              <div className="grid grid-cols-2 text-white bg-black"
                   style={{ borderRadius: selectedBundleIndex === index ? '0' : '0 0 0.5rem 0.5rem' }}>
                <div className="flex flex-col items-center justify-center p-3 text-center border-r border-r-gray-600">
                  <p className="text-lg">GH₵ {bundle.price}</p>
                  <p className="text-sm font-bold">Price</p>
                </div>
                <div className="flex flex-col items-center justify-center p-3 text-center">
                  <p className="text-lg">No-Expiry</p>
                  <p className="text-sm font-bold">Duration</p>
                </div>
              </div>
            </div>
            
            {selectedBundleIndex === index && (
              <div className="bg-yellow-400 p-4 rounded-b-lg shadow-md">
                {bundleMessages[index] && (
                  <div className={`mb-3 p-3 rounded ${bundleMessages[index].type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {bundleMessages[index].text}
                  </div>
                )}
                
                <div className="mb-4">
                  <input
                    type="tel"
                    className="w-full px-4 py-2 rounded bg-yellow-300 text-black placeholder-yellow-700 border border-yellow-500 focus:outline-none focus:border-yellow-600"
                    placeholder="Enter recipient number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => handlePurchase(bundle, index)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed"
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

export default MTNBundleCards;