'use client'
import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

const FGMallATBundleCards = () => {
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState({ text: '', type: '' });
  const [bundleMessages, setBundleMessages] = useState({});
  const [userData, setUserData] = useState(null);
  const [numberConfirmed, setNumberConfirmed] = useState(false);

  // Get user data from localStorage on component mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
  }, []);

  // Only include AirtelTigo bundles - same as original but with FGMall pricing/network code
  const bundles = [
    { capacity: '1', mb: '1000', price: '3.95', network: 'AT_PREMIUM' },
    { capacity: '2', mb: '2000', price: '8.35', network: 'AT_PREMIUM' },
    { capacity: '3', mb: '3000', price: '13.25', network: 'AT_PREMIUM' },
    { capacity: '4', mb: '4000', price: '16.50', network: 'AT_PREMIUM' },
    { capacity: '5', mb: '5000', price: '19.50', network: 'AT_PREMIUM' },
    { capacity: '6', mb: '6000', price: '23.50', network: 'AT_PREMIUM' },
    { capacity: '8', mb: '8000', price: '30.50', network: 'AT_PREMIUM' },
    { capacity: '10', mb: '10000', price: '38.50', network: 'AT_PREMIUM' },
    { capacity: '12', mb: '12000', price: '45.50', network: 'AT_PREMIUM' },
    { capacity: '15', mb: '15000', price: '57.50', network: 'AT_PREMIUM' },
    { capacity: '25', mb: '25000', price: '95.00', network: 'AT_PREMIUM' },
    { capacity: '30', mb: '30000', price: '115.00', network: 'AT_PREMIUM' },
    { capacity: '40', mb: '40000', price: '151.00', network: 'AT_PREMIUM' },
    { capacity: '50', mb: '50000', price: '190.00', network: 'AT_PREMIUM' }
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
    setNumberConfirmed(false);
    // Clear any error messages for this bundle
    setBundleMessages(prev => ({ ...prev, [index]: null }));
  };

  // Validate if the number is an AirtelTigo number
  const isAirtelTigoNumber = (number) => {
    // AirtelTigo prefixes
    const airtelTigoPrefixes = ['026', '056', '027', '057', '023', '053'];
    
    // Clean the number (remove any spaces or hyphens)
    const cleanNumber = number.replace(/[\s-]/g, '');
    
    // Check if it's a valid Ghana number with an AirtelTigo prefix
    if (cleanNumber.length === 10) {
      const prefix = cleanNumber.substring(0, 3);
      return airtelTigoPrefixes.includes(prefix);
    }
    return false;
  };

  const validatePhoneNumber = () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      setBundleMessages(prev => ({ 
        ...prev, 
        [selectedBundleIndex]: { 
          text: 'Please enter a valid 10-digit number', 
          type: 'error' 
        } 
      }));
      return false;
    }
    
    if (!isAirtelTigoNumber(phoneNumber)) {
      setBundleMessages(prev => ({ 
        ...prev, 
        [selectedBundleIndex]: { 
          text: 'Please enter a valid AirtelTigo number (026, 056, 027, 057, 023, 053)', 
          type: 'error' 
        } 
      }));
      return false;
    }
    
    return true;
  };

  const handleConfirmNumber = () => {
    if (validatePhoneNumber()) {
      setNumberConfirmed(true);
      setBundleMessages(prev => ({ 
        ...prev, 
        [selectedBundleIndex]: null
      }));
    }
  };

  const handlePurchase = async (bundle, index) => {
    // Clear previous messages
    setBundleMessages(prev => ({ ...prev, [index]: null }));
    setGlobalMessage({ text: '', type: '' });
    
    if (!validatePhoneNumber()) {
      return;
    }

    if (!userData || !userData.id) {
      setGlobalMessage({ text: 'User not authenticated. Please login to continue.', type: 'error' });
      return;
    }

    if (!numberConfirmed) {
      setBundleMessages(prev => ({ 
        ...prev, 
        [index]: { 
          text: 'Please confirm the phone number first', 
          type: 'error' 
        } 
      }));
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      // Use the FGMall purchase-data endpoint
      const response = await fetch('https://datamartbackened.onrender.com/api/foster/purchase-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userData.id,
          phoneNumber: phoneNumber,
          network: bundle.network, // 'AT_PREMIUM' for FGMall
          capacity: parseFloat(bundle.capacity),
          price: parseFloat(bundle.price)
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        setGlobalMessage({ 
          text: `${bundle.capacity}GB data bundle purchased successfully for ${phoneNumber}`, 
          type: 'success' 
        });
        setSelectedBundleIndex(null);
        setPhoneNumber('');
        setNumberConfirmed(false);
        
        // Auto-scroll to the top to see the success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(data.message || 'Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setBundleMessages(prev => ({ 
        ...prev, 
        [index]: { 
          text: error.message || 'Failed to purchase data bundle', 
          type: 'error' 
        } 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4 text-center">AirtelTigo Data Bundles (Premium)</h1>
      
      {/* Important Notice Box */}
      <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm md:text-base font-medium text-yellow-800">IMPORTANT: Please Read Before Purchase</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Instant Delivery:</strong> All data purchases are processed instantly upon payment.</li>
                <li><strong>No Refunds:</strong> We do not offer refunds for wrong phone number entries.</li>
                <li><strong>AirtelTigo Numbers Only:</strong> This bundle works only with valid AirtelTigo numbers (026, 056, 027, 057, 023, 053).</li>
                <li><strong>Double-Check:</strong> Please verify the recipient's number before confirming your purchase.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {globalMessage.text && (
        <div className={`mb-6 p-4 rounded-lg shadow ${globalMessage.type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' : 'bg-red-100 text-red-800 border-l-4 border-red-500'}`}>
          <div className="flex items-center">
            <div className="mr-3">
              {globalMessage.type === 'success' ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-500" />
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
                        <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                      )}
                      <span className="text-sm">{bundleMessages[index].text}</span>
                    </div>
                  </div>
                )}
                
                <div className="mb-4">
                  <label className="block text-white text-sm font-bold mb-2">
                    Enter AirtelTigo Number
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="tel"
                      className="w-full px-4 py-2 rounded bg-opacity-90 bg-white text-gray-800 placeholder-gray-500 border focus:outline-none focus:border-blue-300"
                      placeholder="e.g., 0270000000"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setNumberConfirmed(false);
                      }}
                      disabled={numberConfirmed}
                      maxLength={10}
                    />
                    {!numberConfirmed && (
                      <button
                        onClick={handleConfirmNumber}
                        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:outline-none whitespace-nowrap"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                  {numberConfirmed && (
                    <div className="mt-2 p-2 bg-green-100 text-green-800 rounded-md flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span className="text-xs">Number confirmed! Please proceed with purchase.</span>
                    </div>
                  )}
                  <p className="text-xs text-white mt-1">Enter AirtelTigo number only (026, 056, 027, 057, 023, 053)</p>
                </div>
                
                <div className="p-3 bg-black bg-opacity-30 rounded-md mb-4">
                  <p className="text-xs text-white font-semibold">
                    ⚠️ WARNING: This purchase is INSTANT and FINAL. No refunds for wrong numbers.
                  </p>
                </div>
                
                <button
                  onClick={() => handlePurchase(bundle, index)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
                  disabled={isLoading || !numberConfirmed}
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

export default FGMallATBundleCards;