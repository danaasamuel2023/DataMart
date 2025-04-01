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
        <div className="bg-yellow-400 px-4 py-3 flex justify-between items-center">
          <h3 className="text-lg md:text-xl font-bold text-black flex items-center">
            <svg className="w-5 h-5 md:w-6 md:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Important Service Notice
          </h3>
          <button onClick={onClose} className="text-black hover:text-gray-700">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Modal content */}
        <div className="px-4 py-3 md:px-6 md:py-4 max-h-[60vh] md:max-h-[70vh] overflow-y-auto">
          <div className="flex items-start mb-4">
            <div className="mt-1 mr-2 md:mr-3 flex-shrink-0">
              <svg className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-base md:text-lg font-semibold mb-2">Please Note Before Proceeding:</h4>
              <ul className={`space-y-2 list-disc pl-4 md:pl-5 text-sm md:text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <li>This is <strong>not an instant service</strong>. Data delivery times vary between customers.</li>
                <li>We are working diligently to process all orders, but there may be delays.</li>
                <li>If you need immediate data for urgent matters, please dial <strong>*138#</strong> on your MTN line instead.</li>
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
                <p className={`text-xs md:text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  We value your business and are committed to delivering quality service. Thank you for your understanding and patience.
                </p>
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
            className="px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:outline-none"
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
          <svg className="animate-spin h-16 w-16 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h4 className="text-xl font-bold text-green-600 mb-2">Processing Your Order...</h4>
        <p className="text-gray-700">Your data bundle request is being processed. Please do not close this page.</p>
      </div>
    </div>
  );
};

const MTNBundleCards = () => {
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
     { capacity: '1', mb: '1000', price: '4.7', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '2', mb: '2000', price: '9.500', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '3', mb: '3000', price: '13.5', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '4', mb: '4000', price: '18.50', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '5', mb: '5000', price: '23.50', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '6', mb: '6000', price: '28.00', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '7', mb: '7000', price: '32.50', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '8', mb: '8000', price: '36.50', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '10', mb: '10000', price: '44.50', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '15', mb: '15000', price: '63.50', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '20', mb: '20000', price: '86.00', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '25', mb: '25000', price: '106.00', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '30', mb: '30000', price: '129.00', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '40', mb: '40000', price: '166.00', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '50', mb: '50000', price: '207.00', network: 'YELLO', inStock: inventoryAvailable },
    { capacity: '100', mb: '100000', price: '407.00', network: 'YELLO', inStock: inventoryAvailable }
  ]);

  // Get user data from localStorage and detect dark mode on component mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
    
    // Show service modal on first load
    const hasSeenModal = localStorage.getItem('hasSeenServiceModal');
    if (!hasSeenModal) {
      setIsModalOpen(true);
      localStorage.setItem('hasSeenServiceModal', 'true');
    }
    
    // Check for dark mode preference
    if (typeof window !== 'undefined') {
      // Check for system preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      // Check for stored preference
      const storedTheme = localStorage.getItem('theme');
      setIsDarkMode(storedTheme === 'dark' || (!storedTheme && prefersDark));
      
      // Listen for changes in system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        if (!localStorage.getItem('theme')) {
          setIsDarkMode(e.matches);
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

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
          text: `${bundle.capacity}GB data bundle purchased successfully for ${phoneNumber}. It will be delivered soon.`, 
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

  // Toggle dark mode function
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'} min-h-screen transition-colors duration-200`}>
      {/* Global Loading Overlay */}
      <LoadingOverlay isLoading={isLoading} />
      
      <div className="container mx-auto px-4 py-8">
        <ServiceInfoModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={() => {
            setIsModalOpen(false);
            processPurchase();
          }}
        />
        
        {/* Header with dark mode toggle */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-center">MTN Non-Expiry Bundles</h1>
          <button 
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-200 text-gray-800'}`}
          >
            {isDarkMode ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Service info button */}
        <div className="mb-4 flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center px-4 py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Service Information
          </button>
        </div>
        
        {/* Important Disclaimer */}
        <div className={`mb-8 p-4 ${isDarkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-500'} border-l-4 rounded-lg shadow`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className={`h-5 w-5 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>Important Notice</h3>
              <div className={`mt-2 text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                <p className="mb-1">Turbonet and Broadband Sim Cards are <strong>not eligible for this offer</strong>.</p>
                <p className="mb-1">• Please do not place orders for the same number at the same time interval. One will be rejected and <strong>no refund will be provided</strong>.</p>
                <p className="mb-1">• Data bundle delivery is not instant. Some numbers may receive data faster while others take some time.</p>
                <p className="mb-1">• No refunds will be issued for wrong transactions or incorrect phone numbers.</p>
                <p>• Please verify your phone number carefully before making a purchase.</p>
              </div>
            </div>
          </div>
        </div>
        
        {globalMessage.text && (
          <div className={`mb-6 p-4 rounded-lg shadow ${
            globalMessage.type === 'success' 
              ? isDarkMode ? 'bg-green-900 text-green-300 border-l-4 border-green-600' : 'bg-green-100 text-green-800 border-l-4 border-green-500' 
              : isDarkMode ? 'bg-red-900 text-red-300 border-l-4 border-red-600' : 'bg-red-100 text-red-800 border-l-4 border-red-500'
          }`}>
            <div className="flex items-center">
              <div className="mr-3">
                {globalMessage.type === 'success' ? (
                  <svg className={`h-6 w-6 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className={`h-6 w-6 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <div className={`${isDarkMode ? 'bg-yellow-500' : 'bg-yellow-400'} p-4 rounded-b-lg shadow-md`}>
                  {bundleMessages[index] && (
                    <div className={`mb-3 p-3 rounded ${
                      bundleMessages[index].type === 'success' 
                        ? isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800' 
                        : isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-800'
                    }`}>
                      {bundleMessages[index].text}
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-black mb-1">
                      Phone Number (must start with 0)
                    </label>
                    <input
                      type="tel"
                      className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-yellow-400' : 'bg-yellow-300'} text-black placeholder-yellow-700 border border-yellow-500 focus:outline-none focus:border-yellow-600`}
                      placeholder="0XXXXXXXXX"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                    />
                    <p className="mt-1 text-xs text-black">Format: 0 followed by 9 digits (10 digits total)</p>
                  </div>
                  
                  <button
                    onClick={() => handlePurchase(bundle, index)}
                    className={`w-full px-4 py-2 ${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed`}
                    disabled={!bundle.inStock}
                  >
                    {!bundle.inStock ? 'Out of Stock' : 'Purchase'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MTNBundleCards;