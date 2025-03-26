'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MTNBundleCards = () => {
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [globalMessage, setGlobalMessage] = useState({ text: '', type: '' });
  const [bundleMessages, setBundleMessages] = useState({});
  const [userData, setUserData] = useState(null);
  const [bundles, setBundles] = useState([
    // { capacity: '1', mb: '1000', price: '4.7', network: 'YELLO', inStock: true },
    { capacity: '2', mb: '2000', price: '9.500', network: 'YELLO', inStock: true },
    { capacity: '3', mb: '3000', price: '13.5', network: 'YELLO', inStock: true },
    { capacity: '4', mb: '4000', price: '18.00', network: 'YELLO', inStock: true },
    { capacity: '5', mb: '5000', price: '22.50', network: 'YELLO', inStock: true },
    { capacity: '6', mb: '6000', price: '27.00', network: 'YELLO', inStock: true },
    { capacity: '7', mb: '7000', price: '31.50', network: 'YELLO', inStock: true },
    { capacity: '8', mb: '8000', price: '35.50', network: 'YELLO', inStock: true },
    { capacity: '10', mb: '10000', price: '43.50', network: 'YELLO', inStock: true },
    { capacity: '15', mb: '15000', price: '62.50', network: 'YELLO', inStock: true },
    { capacity: '20', mb: '20000', price: '85.00', network: 'YELLO', inStock: true },
    { capacity: '25', mb: '25000', price: '105.00', network: 'YELLO', inStock: true },
    { capacity: '30', mb: '30000', price: '128.00', network: 'YELLO', inStock: true },
    { capacity: '40', mb: '40000', price: '165.00', network: 'YELLO', inStock: true },
    { capacity: '50', mb: '50000', price: '206.00', network: 'YELLO', inStock: true },
    { capacity: '100', mb: '100000', price: '406.00', network: 'YELLO', inStock: true }
  ]);

  // Get user data from localStorage on component mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
    
    // Fetch inventory status
    fetchInventoryStatus();
  }, []);

  // Function to fetch inventory status from the API using the public check-availability endpoint
  const fetchInventoryStatus = async () => {
    setIsInventoryLoading(true);
    try {
      // Using the public check-availability endpoint that doesn't require auth
      const response = await axios.get(
        'https://datamartbackened.onrender.com/api/check-availability',
        {
          params: { network: 'YELLO' }
        }
      );

      // Update bundles with the inventory status
      if (response.data && response.data.available !== undefined) {
        setBundles(prevBundles => 
          prevBundles.map(bundle => ({
            ...bundle,
            inStock: response.data.available
          }))
        );
        
        // Show status message
        setGlobalMessage({ 
          text: response.data.message,
          type: response.data.available ? 'success' : 'error' 
        });
        
        // Clear message after 3 seconds
        setTimeout(() => setGlobalMessage({ text: '', type: '' }), 3000);
      }
    } catch (error) {
      console.error('Failed to fetch inventory status:', error);
      setGlobalMessage({ 
        text: 'Failed to check inventory status. Please try again later.',
        type: 'error' 
      });
    } finally {
      setIsInventoryLoading(false);
    }
  };

  // MTN Logo SVG
  const MTNLogo = () => (
    <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill="#ffcc00" stroke="#000" strokeWidth="2"/>
      <path d="M50 80 L80 140 L100 80 L120 140 L150 80" stroke="#000" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="100" y="170" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="28">MTN</text>
    </svg>
  );

  const handleSelectBundle = (index) => {
    // Allow selection regardless of stock status
    setSelectedBundleIndex(index === selectedBundleIndex ? null : index);
    setPhoneNumber('');
    // Clear any error messages for this bundle
    setBundleMessages(prev => ({ ...prev, [index]: null }));
  };

  // Function to validate phone number format
  const validatePhoneNumber = (number) => {
    // Remove any spaces or dashes
    const cleanNumber = number.replace(/[\s-]/g, '');
    
    // Check if it starts with 0
    if (cleanNumber.startsWith('0')) {
      // Should be 0 followed by 9 digits (total 10 digits)
      return cleanNumber.length === 10 && /^0\d{9}$/.test(cleanNumber);
    }
    
    // If it doesn't start with 0, it's invalid
    return false;
  };
  
  // Format phone number as user types
  const formatPhoneNumber = (input) => {
    // Remove all non-numeric characters
    let formatted = input.replace(/\D/g, '');
    
    // If it doesn't start with 0, add it
    if (!formatted.startsWith('0') && formatted.length > 0) {
      formatted = '0' + formatted;
    }
    
    // Limit to correct length (0 + 9 digits = 10 digits total)
    if (formatted.length > 10) {
      formatted = formatted.substring(0, 10);
    }
    
    return formatted;
  };

  const handlePhoneNumberChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    setPhoneNumber(formattedNumber);
  };

  const handlePurchase = async (bundle, index) => {
    // Clear previous messages
    setBundleMessages(prev => ({ ...prev, [index]: null }));
    setGlobalMessage({ text: '', type: '' });
    
    // Check if bundle is out of stock first
    if (!bundle.inStock) {
      setBundleMessages(prev => ({ 
        ...prev, 
        [index]: { text: 'Sorry, this bundle is currently out of stock.', type: 'error' } 
      }));
      return;
    }
    
    // Validate phone number
    if (!validatePhoneNumber(phoneNumber)) {
      setBundleMessages(prev => ({ 
        ...prev, 
        [index]: { text: 'Please enter a valid MTN number starting with 0 followed by 9 digits', type: 'error' } 
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
        
        // Refresh inventory status after purchase
        fetchInventoryStatus();
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
      
      {/* Important Disclaimer */}
      <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-bold text-red-800">Important Notice</h3>
            <div className="mt-2 text-sm text-red-700">
              <p className="mb-1">• Please do not place orders for the same number at the same time interval. One will be rejected and <strong>no refund will be provided</strong>.</p>
              <p className="mb-1">• Data bundle delivery is not instant. Some numbers may receive data faster while others take some time .</p>
              <p className="mb-1">• No refunds will be issued for wrong transactions or incorrect phone numbers.</p>
              <p>• Please verify your phone number carefully before making a purchase.</p>
            </div>
          </div>
        </div>
      </div>
      
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

      {isInventoryLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
          <span className="ml-3 text-lg">Checking status...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bundles.map((bundle, index) => (
            <div key={index} className="flex flex-col relative">
              {/* Card shows "OUT OF STOCK" badge but is still clickable */}
              <div 
                className={`flex flex-col bg-yellow-400 overflow-hidden shadow-md transition-transform duration-300 cursor-pointer hover:translate-y-[-5px] ${selectedBundleIndex === index ? 'rounded-t-lg' : 'rounded-lg'}`}
                onClick={() => handleSelectBundle(index)}
              >
                {/* Out of stock badge */}
                {!bundle.inStock && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="bg-red-600 text-white text-xs font-bold py-1 px-2 rounded-full shadow-lg">
                      OUT OF STOCK
                    </span>
                  </div>
                )}
                
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number (must start with 0)
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 rounded bg-yellow-300 text-black placeholder-yellow-700 border border-yellow-500 focus:outline-none focus:border-yellow-600"
                      placeholder="0XXXXXXXXX"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                    />
                    <p className="mt-1 text-xs text-gray-700">Format: 0 followed by 9 digits (10 digits total)</p>
                  </div>
                  <button
                    onClick={() => handlePurchase(bundle, index)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed"
                    disabled={isLoading || !bundle.inStock}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : !bundle.inStock ? 'Out of Stock' : 'Purchase'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Refresh inventory button */}
      <div className="mt-8 text-center">
        <button 
          onClick={fetchInventoryStatus}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          disabled={isInventoryLoading}
        >
          {isInventoryLoading ? 'Refreshing...' : 'Refresh Inventory Status'}
        </button>
      </div>
    </div>
  );
};

export default MTNBundleCards;