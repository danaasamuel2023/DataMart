// pages/verification-services.js
'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Phone, MessageCircle, RefreshCw, AlertTriangle, Check, X, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VerificationServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [capability, setCapability] = useState('sms');
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  
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
        const response = await fetch('http://localhost:5000/api/verifications/services');
        
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
            price: service.price || 1.25,
            success_rate: service.success_rate || 95
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
  
  // Mock data to use when API fails
  const getMockServices = () => {
    return [
      {
        id: 'svc_1',
        name: 'Gmail',
        price: 1.25,
        capabilities: ['sms', 'voice'],
        success_rate: 95
      },
      {
        id: 'svc_2',
        name: 'Facebook',
        price: 0.95,
        capabilities: ['sms'],
        success_rate: 92
      },
      {
        id: 'svc_3',
        name: 'WhatsApp',
        price: 1.50,
        capabilities: ['sms', 'voice'],
        success_rate: 98
      },
      {
        id: 'svc_4',
        name: 'Telegram',
        price: 0.85,
        capabilities: ['sms'],
        success_rate: 97
      },
      {
        id: 'svc_5',
        name: 'Twitter',
        price: 1.10,
        capabilities: ['sms', 'voice'],
        success_rate: 91
      },
      {
        id: 'svc_6',
        name: 'Instagram',
        price: 1.35,
        capabilities: ['sms'],
        success_rate: 93
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
        
        // Simulate redirect after "successful" creation
        router.push(`/verification/${mockVerificationId}`);
        return;
      }
      
      // Otherwise, make a real API request
      console.log('Sending verification request for:', selectedService.name, 'with capability:', capability);
      const response = await fetch('http://localhost:5000/api/verifications', {
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to initialize verification: ${response.status} ${errorData.message || ''}`);
      }
      
      const data = await response.json();
      console.log('Verification created:', data);
      
      // Redirect to verification detail page
      router.push(`/verification/${data.verificationId}`);
    } catch (err) {
      console.error('Error requesting verification:', err);
      setError(`Failed to request verification: ${err.message}. Please try again.`);
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
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Phone Verification Services</title>
      </Head>
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Phone Verification Services</h1>
          <p className="mt-2 text-slate-600">
            Select a service to receive a verification code via SMS or voice call
          </p>
        </div>
        
        {/* API Status Indicator (when using mock data) */}
        {isUsingMockData && (
          <div className="flex items-center justify-between space-x-2 mb-4 text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={16} className="mr-2" />
              <span className="text-sm">Using mock data. The TextVerified API may be unavailable.</span>
            </div>
            <button 
              onClick={fetchServices}
              className="text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 p-1 rounded"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}
        
        {/* Search and Filter Controls */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Capability Toggle */}
          <div className="flex items-center space-x-4 bg-white p-2 rounded-lg shadow-sm">
            <button
              onClick={() => handleCapabilityChange('sms')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                capability === 'sms' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageCircle size={18} />
              <span>SMS</span>
            </button>
            
            <button
              onClick={() => handleCapabilityChange('voice')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                capability === 'voice' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Phone size={18} />
              <span>Voice</span>
            </button>
          </div>
          
          {/* Search Box */}
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search services..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X size={16} className="text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-start">
            <AlertTriangle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {filteredServices.length === 0 ? (
              <div className="bg-slate-50 p-8 text-center rounded-lg border border-slate-200">
                <p className="text-slate-600">
                  {searchTerm 
                    ? `No services found matching "${searchTerm}" with ${capability} capability.` 
                    : `No services found for ${capability} capability.`}
                </p>
                <div className="mt-4 flex flex-col sm:flex-row justify-center gap-3">
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                    >
                      Clear Search
                    </button>
                  )}
                  <button 
                    onClick={fetchServices} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Refresh Services
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Results count */}
                <div className="mb-4 text-sm text-slate-500">
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
                        border rounded-lg bg-white shadow-sm overflow-hidden cursor-pointer
                        transition hover:shadow-md hover:border-indigo-200
                        ${selectedService?.name === service.name ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'}
                      `}
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-medium text-slate-900">{service.name}</h3>
                          {selectedService?.name === service.name && (
                            <Check size={20} className="text-indigo-600" />
                          )}
                        </div>
                        
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm text-slate-600">
                            <span className="font-medium">Price:</span>
                            <span className="ml-2">${typeof service.price === 'number' ? service.price.toFixed(2) : '1.25'}</span>
                          </div>
                          
                          <div className="flex items-center text-sm text-slate-600">
                            <span className="font-medium">Capabilities:</span>
                            <div className="ml-2 flex space-x-2">
                              {/* Safely check for capabilities */}
                              {hasCapability(service, 'sms') && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <MessageCircle size={12} className="mr-1" />
                                  SMS
                                </span>
                              )}
                              {hasCapability(service, 'voice') && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  <Phone size={12} className="mr-1" />
                                  Voice
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {service.success_rate && (
                            <div className="flex items-center text-sm text-slate-600">
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
        
        {/* Action Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleRequestVerification}
            disabled={!selectedService}
            className={`
              px-6 py-3 rounded-md text-white font-medium
              ${
                selectedService
                  ? 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  : 'bg-slate-300 cursor-not-allowed'
              }
            `}
          >
            Request Verification
          </button>
        </div>
      </div>
    </div>
  );
}