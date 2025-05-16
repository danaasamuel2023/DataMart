'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Phone, MessageCircle, RefreshCw, AlertTriangle, Check, X, Search, Moon, Sun, Info, AlertCircle, History, Clock, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerificationServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false); // New state for tracking request loading
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [capability, setCapability] = useState('sms');
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const router = useRouter();
  
  // Check system preference for dark mode on initial load
  useEffect(() => {
    // Check if user has a preference stored in localStorage
    const storedPreference = localStorage.getItem('darkMode');
    
    if (storedPreference !== null) {
      setDarkMode(storedPreference === 'true');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
    
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (localStorage.getItem('darkMode') === null) {
        setDarkMode(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
  };

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    
    if (!user || !user.id) {
      router.push('/login');
      return;
    }
    
    // Fetch available verification services
    fetchServices();
  }, [router]);
  
  const fetchServices = async () => {
    try {
      setLoading(true);
      // Try to fetch from API first
      try {
        const response = await fetch('https://datamartbackened.onrender.com/api/verifications/services');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch services: ${response.status} ${response.statusText}`);
        }
        
        let data = await response.json();
        console.log('Raw API response:', data);
        
        // Transform data to match expected format
        data = data.map((service, index) => {
          // Ensure capability is lowercase for consistent filtering
          const normalizedCapability = service.capability ? service.capability.toLowerCase() : 'sms';
          
          return {
            id: service.serviceName || `svc_${index}`,
            name: service.serviceName,
            capability: normalizedCapability,
            // Create capabilities array from capability string
            capabilities: normalizedCapability ? [normalizedCapability] : ['sms'],
            // Add default values for missing properties
            price: 21, // Fixed price in Ghana Cedis
            success_rate: service.success_rate || 95,
            description: getServiceDescription(service.serviceName)
          };
        });
        
        console.log('Transformed data:', data);
        setServices(data);
        setIsUsingMockData(false);
        setError(null);
      } catch (apiError) {
        console.error('API Error:', apiError);
        // If API fails, use mock data
        throw new Error(`API connection failed: ${apiError.message}`);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(`API connection issue: There appears to be a configuration issue with the TextVerified API. Using mock data for now.`);
      
      // Use mock data
      const mockData = getMockServices();
      console.log('Using mock data:', mockData);
      setServices(mockData);
      setIsUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Get service descriptions based on service name
  const getServiceDescription = (serviceName) => {
    const descriptions = {
      'Gmail': 'Temporary phone number for Google/Gmail account verification.',
      'Facebook': 'Disposable number for Facebook account registration and recovery.',
      'WhatsApp': 'Temp phone verification for WhatsApp messaging platform.',
      'Telegram': 'Single-use number for Telegram messaging verification.',
      'Twitter': 'Temporary verification for Twitter/X social media accounts.',
      'Instagram': 'One-time phone verification for Instagram social accounts.',
      'Tinder': 'Temporary SMS verification for Tinder dating app.',
      'TikTok': 'One-time phone verification for TikTok video platform.',
      'Snapchat': 'Disposable number for Snapchat account registration.',
      'LinkedIn': 'Temporary phone verification for professional networking.',
      'PayPal': 'One-time verification for PayPal financial accounts.',
      'Amazon': 'Temporary number for Amazon account verification.',
      'eBay': 'One-time phone verification for eBay marketplace accounts.',
      'Uber': 'Disposable number for Uber ride-sharing verification.',
      'Airbnb': 'Temporary phone verification for Airbnb rentals.'
    };
    
    // Return description or default
    return descriptions[serviceName] || 'Temporary phone number for one-time verification.';
  };
  
  // Mock data to use when API fails
  const getMockServices = () => {
    return [
      {
        id: 'svc_1',
        name: 'Gmail',
        price: 21, // Fixed price in Ghana Cedis
        capabilities: ['sms', 'voice'],
        success_rate: 95,
        description: 'Temporary phone number for Google/Gmail account verification.'
      },
      {
        id: 'svc_2',
        name: 'Facebook',
        price: 21, // Fixed price in Ghana Cedis
        capabilities: ['sms'],
        success_rate: 92,
        description: 'Disposable number for Facebook account registration and recovery.'
      },
      {
        id: 'svc_3',
        name: 'WhatsApp',
        price: 21, // Fixed price in Ghana Cedis
        capabilities: ['sms', 'voice'],
        success_rate: 98,
        description: 'Temp phone verification for WhatsApp messaging platform.'
      },
      {
        id: 'svc_4',
        name: 'Telegram',
        price: 21, // Fixed price in Ghana Cedis
        capabilities: ['sms'],
        success_rate: 97,
        description: 'Single-use number for Telegram messaging verification.'
      },
      {
        id: 'svc_5',
        name: 'Twitter',
        price: 21, // Fixed price in Ghana Cedis
        capabilities: ['sms', 'voice'],
        success_rate: 91,
        description: 'Temporary verification for Twitter/X social media accounts.'
      },
      {
        id: 'svc_6',
        name: 'Instagram',
        price: 21, // Fixed price in Ghana Cedis
        capabilities: ['sms'],
        success_rate: 93,
        description: 'One-time phone verification for Instagram social accounts.'
      }
    ];
  };
  
  const handleSelectService = (service) => {
    setSelectedService(service);
  };
  
  const handleCapabilityChange = (newCapability) => {
    setCapability(newCapability);
    // Deselect service when changing capability if the current selected service
    // doesn't support the new capability
    if (selectedService && 
        !hasCapability(selectedService, newCapability)) {
      setSelectedService(null);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // Clear selected service if it's filtered out by search
    if (selectedService && !selectedService.name.toLowerCase().includes(e.target.value.toLowerCase())) {
      setSelectedService(null);
    }
  };
  
  const handleRequestVerification = async () => {
    try {
      if (!selectedService) {
        console.error('No service selected');
        setError('Please select a service before requesting verification.');
        return;
      }
      
      // Set loading state to true when starting the request
      setRequestLoading(true);
      setError(null);
      
      const userData = localStorage.getItem('userData');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user || !user.id) {
        router.push('/login');
        return;
      }
      
      // If using mock data, we'll simulate the API response
      if (isUsingMockData) {
        // Create a mock verification response
        const mockVerificationId = 'mock_' + Math.random().toString(36).substring(2, 15);
        console.log('Created mock verification ID:', mockVerificationId);
        
        // Add a delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate redirect after "successful" creation
        router.push(`/verification/${mockVerificationId}`);
        return;
      }
      
      // Otherwise, make a real API request
      console.log('Sending verification request for:', selectedService.name, 'with capability:', capability);
      const response = await fetch('https://datamartbackened.onrender.com/api/verifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceName: selectedService.name,
          capability,
          userId: user.id,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Check for specific error conditions
        if (data.errorCode === 'Unavailable' || 
            (data.message && data.message.includes('Out of stock or unavailable'))) {
          throw new Error(`The service "${selectedService.name}" is temporarily unavailable or out of stock. Please try another service.`);
        }
        
        // Check for insufficient balance
        if (data.error === 'Insufficient wallet balance') {
          throw new Error(`You don't have enough balance for this verification. Required: ${data.required} GH₵, Current balance: ${data.current} GH₵`);
        }
        
        throw new Error(`Failed to initialize verification: ${response.status} ${data.message || data.error || ''}`);
      }
      
      console.log('Verification created:', data);
      
      // Update services to mark this one as potentially unavailable for next time
      if (data.error && data.error === 'Service unavailable') {
        const updatedServices = services.map(service => {
          if (service.name === selectedService.name) {
            return { ...service, availability: false };
          }
          return service;
        });
        setServices(updatedServices);
      }
      
      // Redirect to verification detail page
      router.push(`/verification/${data.verificationId}`);
    } catch (err) {
      console.error('Error requesting verification:', err);
      
      // Specific handling for known error patterns
      if (err.message && err.message.includes('out of stock') || err.message.includes('unavailable')) {
        // Mark the selected service as unavailable
        const updatedServices = services.map(service => {
          if (service.name === selectedService.name) {
            return { ...service, availability: false };
          }
          return service;
        });
        setServices(updatedServices);
        
        // Clear the selected service
        setSelectedService(null);
      }
      
      setError(`${err.message}. Please try again or select a different service.`);
    } finally {
      // Always reset loading state when done
      setRequestLoading(false);
    }
  };
  
  // Check if a service has a specific capability
  const hasCapability = (service, cap) => {
    // First check capabilities array if it exists
    if (service.capabilities && Array.isArray(service.capabilities)) {
      return service.capabilities.map(c => c.toLowerCase()).includes(cap.toLowerCase());
    }
    
    // Fallback to capability property
    if (service.capability) {
      return service.capability.toLowerCase() === cap.toLowerCase();
    }
    
    // Default to false if no capability info
    return false;
  };
  
  // Filter services by capability and search term
  const filterServices = (service) => {
    const matchesCapability = hasCapability(service, capability);
    const matchesSearch = !searchTerm || 
      (service.name && service.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCapability && matchesSearch;
  };
  
  // Get filtered services for display
  const filteredServices = services.filter(filterServices);
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <Head>
        <title>Phone Verification Services</title>
      </Head>
      
      {/* Information Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-lg w-full p-6 shadow-xl relative">
            <button 
              onClick={() => setShowInfoModal(false)} 
              className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Important Information</h3>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                <strong className="text-slate-900 dark:text-white">One-Time Use Only:</strong> The phone numbers provided are for <span className="text-red-600 dark:text-red-400 font-medium">single use only</span>. Once a verification is completed, the number will not be available for any future verification requests.
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Temporary Access:</strong> These are temporary phone numbers intended solely for verification purposes. You will not be able to receive calls or messages on these numbers after the verification period ends.
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Not For Fraudulent Use:</strong> These services are intended for legitimate purposes only, such as protecting personal privacy or testing applications. Do not use for fraudulent activities.
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Verification Period:</strong> Each verification session has a limited active period (typically 15-20 minutes). After this time, the verification will expire automatically.
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Success Rate:</strong> While we strive for high reliability, success rates may vary by service. The displayed percentage indicates the historical success rate for each service.
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Pricing:</strong> All verification services are priced at 21 GH₵ (Ghana Cedis) per verification. This is a one-time fee for each verification request.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowInfoModal(false)} 
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Phone Verification Services</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Select a service to receive a verification code via SMS or voice call
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {/* Verification History Link */}
            <Link
              href="/verification-history"
              className="flex items-center space-x-1 px-3 py-2 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
            >
              <History size={18} />
              <span>View History</span>
            </Link>
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button
              onClick={() => setShowInfoModal(true)}
              className="flex items-center space-x-1 px-3 py-2 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
            >
              <AlertCircle size={16} />
              <span>Important Info</span>
            </button>
          </div>
        </div>
        
        {/* Past Verifications Card */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start sm:items-center">
            <div className="flex-shrink-0">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div className="ml-3 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">View your past verifications</h3>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    Check your previous verification history, codes, and statuses
                  </p>
                </div>
                <Link
                  href="/verification-history"
                  className="mt-3 sm:mt-0 inline-flex items-center px-3 py-1.5 border border-blue-600 dark:border-blue-500 shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                >
                  <History size={16} className="mr-1.5" />
                  Verification History
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Price Banner */}
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Fixed Price: 21 GH₵ per verification</h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>
                  All verification services cost 21 Ghana Cedis (GH₵) per verification, regardless of the service type or capability.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Important Notice */}
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Important: One-time use only</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>
                  These phone numbers are for single use only and become unavailable after verification. You will not be able to use the same number again for any other services.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* API Status Indicator (when using mock data) */}
        {isUsingMockData && (
          <div className="flex items-center justify-between space-x-2 mb-4 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-md border border-amber-200 dark:border-amber-800">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={16} className="mr-2" />
              <span className="text-sm">Using mock data. The TextVerified API may be unavailable.</span>
            </div>
            <button 
              onClick={fetchServices}
              className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900/70 p-1 rounded transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}
        
        {/* Search and Filter Controls */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Capability Toggle */}
          <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleCapabilityChange('sms')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                capability === 'sms' 
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <MessageCircle size={18} />
              <span>SMS</span>
            </button>
            
            <button
              onClick={() => handleCapabilityChange('voice')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                capability === 'voice' 
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Phone size={18} />
              <span>Voice</span>
            </button>
          </div>
          
          {/* Search Box */}
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search services..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X size={16} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" />
              </button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md mb-6 flex items-start">
            <AlertTriangle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : (
          <>
            {filteredServices.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 text-center rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-400">
                  {searchTerm 
                    ? `No services found matching "${searchTerm}" with ${capability} capability.` 
                    : `No services found for ${capability} capability.`}
                </p>
                <div className="mt-4 flex flex-col sm:flex-row justify-center gap-3">
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      Clear Search
                    </button>
                  )}
                  <button 
                    onClick={fetchServices} 
                    className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                  >
                    Refresh Services
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Results count */}
                <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  Showing {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'}
                  {searchTerm && ` matching "${searchTerm}"`}
                </div>
                
                {/* Service Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredServices.map((service) => (
                    <div
                      key={service.id || service.name}
                      onClick={() => handleSelectService(service)}
                      className={`
                        rounded-lg overflow-hidden cursor-pointer transition
                        hover:shadow-md dark:hover:shadow-xl dark:hover:shadow-slate-800
                        ${selectedService?.name === service.name 
                          ? 'border-2 border-indigo-500 dark:border-indigo-400 shadow-md dark:shadow-slate-800' 
                          : 'border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800'}
                      `}
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-medium text-slate-900 dark:text-white">{service.name}</h3>
                          {selectedService?.name === service.name && (
                            <Check size={20} className="text-indigo-600 dark:text-indigo-400" />
                          )}
                        </div>
                        
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          {service.description}
                        </p>
                        
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Price:</span>
                            <span className="ml-2 text-green-700 dark:text-green-400 font-medium">21 GH₵</span>
                          </div>
                          
                          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Capabilities:</span>
                            <div className="ml-2 flex space-x-2">
                              {/* Safely check for capabilities */}
                              {hasCapability(service, 'sms') && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  <MessageCircle size={12} className="mr-1" />
                                  SMS
                                </span>
                              )}
                              {hasCapability(service, 'voice') && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                  <Phone size={12} className="mr-1" />
                                  Voice
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {service.success_rate && (
                            <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                              <span className="font-medium">Success Rate:</span>
                              <span className="ml-2">{service.success_rate}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        
        {/* Bottom Action Area with Verification History Link */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center">
          <Link
            href="/verification-history"
            className="mb-4 sm:mb-0 inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            <History size={16} className="mr-1.5" />
            View your previous verifications
          </Link>
          
          <button
            onClick={handleRequestVerification}
            disabled={!selectedService || requestLoading}
            className={`
              px-6 py-3 rounded-md text-white font-medium transition-colors flex items-center
              ${
                selectedService && !requestLoading
                  ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900'
                  : 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed'
              }
            `}
          >
            {requestLoading ? (
              <>
                <Loader size={20} className="animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Request Verification'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}