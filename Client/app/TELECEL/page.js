'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Service Information Modal Component - Fully Responsive
const ServiceInfoModal = ({ isOpen, onClose, onConfirm }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Check for dark mode preference on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for system preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      // Check for stored preference
      const storedTheme = localStorage.getItem('theme');
      setIsDarkMode(storedTheme === 'dark' || (!storedTheme && prefersDark));
    }
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg w-full max-w-md mx-auto overflow-hidden shadow-xl`}>
        {/* Modal header */}
        <div className="bg-red-600 px-4 py-3 flex justify-between items-center">
          <h3 className="text-lg md:text-xl font-bold text-white flex items-center">
            <svg className="w-5 h-5 md:w-6 md:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Important Service Notice
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Modal content */}
        <div className="px-4 py-3 md:px-6 md:py-4 max-h-[60vh] md:max-h-[70vh] overflow-y-auto">
          <div className="flex items-start mb-4">
            <div className="mt-1 mr-2 md:mr-3 flex-shrink-0">
              <svg className="h-5 w-5 md:h-6 md:w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-base md:text-lg font-semibold mb-2">Please Note Before Proceeding:</h4>
              <ul className={`space-y-2 list-disc pl-4 md:pl-5 text-sm md:text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <li>This is <strong>not an instant service</strong>. Data delivery times vary between customers.</li>
                <li>We are working diligently to process all orders, but there may be delays.</li>
                <li>For urgent matters requiring immediate data, please consider other options.</li>
                <li>Once ordered, please be patient as we process your request.</li>
                <li>For instant bundles, this service is not suitable.</li>
              </ul>
            </div>
          </div>
          
          <div className={`${isDarkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'} p-3 rounded-lg border mt-4`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className={`h-4 w-4 md:h-5 md:w-5 ${isDarkMode ? 'text-blue-300' : 'text-blue-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <span className={`text-xs md:text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  We value your business and are committed to delivering quality service. Thank you for your understanding and patience.
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Modal footer */}
        <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} px-4 py-3 md:px-6 md:py-4 flex justify-end`}>
          <button
            onClick={onClose}
            className={`mr-2 px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base ${isDarkMode ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-300 text-gray-800 hover:bg-gray-400'} rounded focus:outline-none`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none"
          >
            I Understand, Continue
          </button>
        </div>
      </div>
    </div>
  );
};

// Global Loading Overlay Component
const LoadingOverlay = ({ isLoading }) => {
  if (!isLoading) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-auto text-center">
        <div className="flex justify-center mb-4">
          <svg className="animate-spin h-16 w-16 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h4 className="text-xl font-bold text-red-600 mb-2">Processing Your Order...</h4>
        <p className="text-gray-700">Your data bundle request is being processed. Please do not close this page.</p>
      </div>
    </div>
  );
};

const TelecelBundleCards = () => {
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState({ text: '', type: '' });
  const [bundleMessages, setBundleMessages] = useState({});
  const [userData, setUserData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Manual inventory control - set this to false if you want bundles to be out of stock
  const inventoryAvailable = true; 
  
  const [bundles, setBundles] = useState([
    { capacity: '5', mb: '5000', price: '23.00', network: 'TELECEL', inStock: true},
    // { capacity: '6', mb: '6000', price: '28.00', network: 'TELECEL', inStock: inventoryAvailable },
    // { capacity: '8', mb: '8000', price: '28.00', network: 'TELECEL', inStock: inventoryAvailable },
    { capacity: '10', mb: '10000', price: '40.50', network: 'TELECEL', inStock: inventoryAvailable },
    // { capacity: '12', mb: '12000', price: '42.50', network: 'TELECEL', inStock: inventoryAvailable },
    { capacity: '15', mb: '15000', price: '60.50', network: 'TELECEL', inStock: inventoryAvailable },
    { capacity: '20', mb: '20000', price: '81.00', network: 'TELECEL', inStock: inventoryAvailable },
    { capacity: '25', mb: '25000', price: '99.00', network: 'TELECEL', inStock: inventoryAvailable },
    { capacity: '30', mb: '30000', price: '118.00', network: 'TELECEL', inStock: inventoryAvailable },
    { capacity: '40', mb: '40000', price: '155.00', network: 'TELECEL', inStock: inventoryAvailable },
    { capacity: '50', mb: '50000', price: '195.00', network: 'TELECEL', inStock: inventoryAvailable }
  ]);

  // Get user data from localStorage on component mount 
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
    
    // Show service modal on first load
    const hasSeenModal = localStorage.getItem('hasSeenTelecelServiceModal');
    if (!hasSeenModal) {
      setIsModalOpen(true);
      localStorage.setItem('hasSeenTelecelServiceModal', 'true');
    }
    
    // Check for dark mode preference
    if (typeof window !== 'undefined') {
      // Check for system preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      // Check for stored preference
      const storedTheme = localStorage.getItem('theme');
      setIsDarkMode(storedTheme === 'dark' || (!storedTheme && prefersDark));
    }
  }, []);

  // Telecel Logo SVG
  const TelecelLogo = () => (
    <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill="#ffffff" stroke="#cc0000" strokeWidth="2"/>
      <text x="100" y="110" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="32" fill="#cc0000">TELECEL</text>
      <path d="M50 125 L150 125" stroke="#cc0000" strokeWidth="5" strokeLinecap="round"/>
      <text x="100" y="150" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="20" fill="#cc0000">PREMIUM</text>
    </svg>
  );

  // Telecel number validation function
  const validatePhoneNumber = (number) => {
    // Trim the number first to remove any whitespace
    const trimmedNumber = number.trim();
    
    // Specific Telecel Ghana number validation (starts with 020 or 050)
    // Check both the format and the prefix for Telecel numbers
    const telecelPattern = /^(020|050)\d{7}$/;
    
    return telecelPattern.test(trimmedNumber);
  };
  
  // Handle phone number input change with automatic trimming
  const handlePhoneNumberChange = (e) => {
    // Automatically trim the input value as it's entered
    setPhoneNumber(e.target.value.trim());
  };

  const handleSelectBundle = (index) => {
    // Allow selection regardless of stock status
    setSelectedBundleIndex(index === selectedBundleIndex ? null : index);
    setPhoneNumber('');
    // Clear any error messages for this bundle
    setBundleMessages(prev => ({ ...prev, [index]: null }));
  };

  // Format phone number as user types
  const formatPhoneNumber = (input) => {
    // Remove all non-numeric characters
    let formatted = input.replace(/\D/g, '');
    
    // Limit to 10 digits
    if (formatted.length > 10) {
      formatted = formatted.substring(0, 10);
    }
    
    return formatted;
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
    
    // Validate Telecel number specifically
    if (!validatePhoneNumber(phoneNumber)) {
      setBundleMessages(prev => ({ 
        ...prev, 
        [index]: { 
          text: 'Please enter a valid Telecel number (starting with 020 or 050)', 
          type: 'error' 
        } 
      }));
      return;
    }

    if (!userData || !userData.id) {
      setGlobalMessage({ text: 'User not authenticated. Please login to continue.', type: 'error' });
      return;
    }

    // Store pending purchase and open modal
    setPendingPurchase({ bundle, index });
    setIsModalOpen(true);
  };

  // Process the actual purchase after modal confirmation
  const processPurchase = async () => {
    if (!pendingPurchase) return;
    
    const { bundle, index } = pendingPurchase;
    setIsLoading(true); // Show the global loading overlay
    
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
      setIsLoading(false); // Hide the global loading overlay
      setPendingPurchase(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50">
      {/* Global Loading Overlay */}
      <LoadingOverlay isLoading={isLoading} />
      
      {/* Service Info Modal */}
      <ServiceInfoModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => {
          setIsModalOpen(false);
          processPurchase();
        }}
      />
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center text-red-600">Telecel Premium Bundles</h1>
        
        {/* Service info button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Service Information
        </button>
      </div>
      
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
              <div className="mb-1">• Data bundle delivery is not instant. Some numbers may receive data faster while others take some time.</div>
              <div className="mb-1">• No refunds will be issued for wrong transactions or incorrect phone numbers.</div>
              <div>• Please verify your phone number carefully before making a purchase.</div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {bundles.map((bundle, index) => (
          <div key={index} className="flex flex-col relative">
            {/* Out of stock badge */}
            {!bundle.inStock && (
              <div className="absolute top-2 right-2 z-10">
                <span className="bg-red-600 text-white text-xs font-bold py-1 px-2 rounded-full shadow-lg">
                  OUT OF STOCK
                </span>
              </div> 
            )}
            
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
                      <span>{bundleMessages[index].text}</span>
                    </div>
                  </div>
                )}
                
                <div className="mb-4">
                  <input
                    type="tel"
                    className="w-full px-4 py-3 rounded-md bg-white/90 text-red-900 placeholder-red-400 border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                    placeholder="Enter Telecel number (020, 050)"
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                  />
                  <div className="mt-1 text-xs text-white">Format: 020/050 followed by remaining digits</div>
                </div>
                <button
                  onClick={() => handlePurchase(bundle, index)}
                  className="w-full px-4 py-3 bg-red-900 text-white rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-200 disabled:bg-red-300 disabled:cursor-not-allowed transition-all duration-300"
                  disabled={!bundle.inStock}
                >
                  {!bundle.inStock ? 'Out of Stock' : 'Purchase Now'}
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