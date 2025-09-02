// CreateStorePage.jsx
'use client';
import { useState } from 'react';
import { Store, ArrowRight, Check, MapPin, Phone, Mail, Clock, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// API utility function
const API_BASE = 'http://localhost:5000/api/v1';

const apiCall = async (endpoint, method = 'GET', body = null) => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const config = {
    method,
    headers: {
      'x-auth-token': token,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    throw new Error('Session expired. Please login again.');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.msg || 'Request failed');
  }
  
  return data;
};

export default function CreateStorePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    storeName: '',
    storeDescription: '',
    contactInfo: {
      phoneNumber: '',
      whatsappNumber: '',
      email: '',
      address: {
        street: '',
        city: '',
        region: ''
      }
    },
    whatsappSettings: {
      groupLink: '',
      communityLink: '',
      autoSendReceipt: true,
      orderNotification: true,
      welcomeMessage: ''
    },
    businessHours: {
      monday: { open: '08:00', close: '20:00', isOpen: true },
      tuesday: { open: '08:00', close: '20:00', isOpen: true },
      wednesday: { open: '08:00', close: '20:00', isOpen: true },
      thursday: { open: '08:00', close: '20:00', isOpen: true },
      friday: { open: '08:00', close: '20:00', isOpen: true },
      saturday: { open: '09:00', close: '18:00', isOpen: true },
      sunday: { open: '10:00', close: '16:00', isOpen: false }
    }
  });

  // Validate current step
  const validateStep = () => {
    setError('');
    
    if (step === 1) {
      if (!formData.storeName.trim()) {
        setError('Store name is required');
        return false;
      }
      if (!formData.storeDescription.trim()) {
        setError('Store description is required');
        return false;
      }
      if (formData.storeDescription.length < 20) {
        setError('Store description should be at least 20 characters');
        return false;
      }
    }
    
    if (step === 2) {
      if (!formData.contactInfo.phoneNumber) {
        setError('Phone number is required');
        return false;
      }
      if (!formData.contactInfo.whatsappNumber) {
        setError('WhatsApp number is required');
        return false;
      }
      if (!formData.contactInfo.email) {
        setError('Email is required');
        return false;
      }
      if (!formData.contactInfo.address.city) {
        setError('City is required');
        return false;
      }
      if (!formData.contactInfo.address.region) {
        setError('Region is required');
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // Call API - no need to send agentId
      const response = await apiCall('/agent-stores/stores/create', 'POST', formData);
      
      // Success
      alert('Store created successfully! Your store is pending admin approval.');
      router.push('/store');
      
    } catch (error) {
      console.error('Store creation error:', error);
      
      // Handle specific error cases
      if (error.message.includes('already have a store')) {
        setError('You already have a store. You can only create one store per account.');
        setTimeout(() => {
          router.push('/store/dashboard');
        }, 3000);
      } else if (error.message.includes('Session expired')) {
        setError(error.message);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(error.message || 'Failed to create store. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info' },
    { number: 2, title: 'Contact Details' },
    { number: 3, title: 'WhatsApp Setup' },
    { number: 4, title: 'Business Hours' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <Store className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create Your Agent Store</h1>
          <p className="text-gray-600 dark:text-gray-400">Start selling data bundles with your own branded store</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => (
              <div key={s.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step > s.number ? 'bg-green-600 dark:bg-green-500 text-white' :
                  step === s.number ? 'bg-blue-600 dark:bg-blue-500 text-white' :
                  'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {step > s.number ? <Check className="w-5 h-5" /> : s.number}
                </div>
                <div className={`ml-2 ${
                  step === s.number 
                    ? 'text-blue-600 dark:text-blue-400 font-medium' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {s.title}
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-4 w-16 h-1 ${
                    step > s.number 
                      ? 'bg-green-600 dark:bg-green-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
          </div>
        )}

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Store Name *</label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Enter your store name"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">This will be your store's display name</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Store Description *</label>
                <textarea
                  value={formData.storeDescription}
                  onChange={(e) => setFormData({...formData, storeDescription: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows="4"
                  placeholder="Describe your store and services..."
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Tell customers what makes your store special (minimum 20 characters)
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Contact Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    <Phone className="inline w-4 h-4 mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactInfo.phoneNumber}
                    onChange={(e) => setFormData({
                      ...formData,
                      contactInfo: {...formData.contactInfo, phoneNumber: e.target.value}
                    })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0244123456"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactInfo.whatsappNumber}
                    onChange={(e) => setFormData({
                      ...formData,
                      contactInfo: {...formData.contactInfo, whatsappNumber: e.target.value}
                    })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0244123456"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.contactInfo.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    contactInfo: {...formData.contactInfo, email: e.target.value}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="your@email.com"
                  required
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium flex items-center text-gray-900 dark:text-gray-100">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location
                </h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Street Address</label>
                  <input
                    type="text"
                    value={formData.contactInfo.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      contactInfo: {
                        ...formData.contactInfo,
                        address: {...formData.contactInfo.address, street: e.target.value}
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="123 Main Street"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">City *</label>
                    <input
                      type="text"
                      value={formData.contactInfo.address.city}
                      onChange={(e) => setFormData({
                        ...formData,
                        contactInfo: {
                          ...formData.contactInfo,
                          address: {...formData.contactInfo.address, city: e.target.value}
                        }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Accra"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Region *</label>
                    <select
                      value={formData.contactInfo.address.region}
                      onChange={(e) => setFormData({
                        ...formData,
                        contactInfo: {
                          ...formData.contactInfo,
                          address: {...formData.contactInfo.address, region: e.target.value}
                        }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select Region</option>
                      <option value="Greater Accra">Greater Accra</option>
                      <option value="Ashanti">Ashanti</option>
                      <option value="Western">Western</option>
                      <option value="Eastern">Eastern</option>
                      <option value="Central">Central</option>
                      <option value="Northern">Northern</option>
                      <option value="Volta">Volta</option>
                      <option value="Upper East">Upper East</option>
                      <option value="Upper West">Upper West</option>
                      <option value="Brong Ahafo">Brong Ahafo</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: WhatsApp Setup */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">WhatsApp Integration</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">WhatsApp Group Link (Optional)</label>
                <input
                  type="url"
                  value={formData.whatsappSettings.groupLink}
                  onChange={(e) => setFormData({
                    ...formData,
                    whatsappSettings: {...formData.whatsappSettings, groupLink: e.target.value}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="https://chat.whatsapp.com/..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Share your WhatsApp group for customers</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Community Link (Optional)</label>
                <input
                  type="url"
                  value={formData.whatsappSettings.communityLink}
                  onChange={(e) => setFormData({
                    ...formData,
                    whatsappSettings: {...formData.whatsappSettings, communityLink: e.target.value}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="https://chat.whatsapp.com/..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Welcome Message</label>
                <textarea
                  value={formData.whatsappSettings.welcomeMessage}
                  onChange={(e) => setFormData({
                    ...formData,
                    whatsappSettings: {...formData.whatsappSettings, welcomeMessage: e.target.value}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows="3"
                  placeholder="Welcome to my store! How can I help you today?"
                />
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.whatsappSettings.autoSendReceipt}
                    onChange={(e) => setFormData({
                      ...formData,
                      whatsappSettings: {...formData.whatsappSettings, autoSendReceipt: e.target.checked}
                    })}
                    className="mr-2 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <span className="text-sm">Auto-send receipts via WhatsApp</span>
                </label>
                
                <label className="flex items-center text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.whatsappSettings.orderNotification}
                    onChange={(e) => setFormData({
                      ...formData,
                      whatsappSettings: {...formData.whatsappSettings, orderNotification: e.target.checked}
                    })}
                    className="mr-2 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <span className="text-sm">Receive order notifications on WhatsApp</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Business Hours */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
                <Clock className="w-5 h-5 mr-2" />
                Business Hours
              </h2>
              
              <div className="space-y-3">
                {Object.entries(formData.businessHours).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <label className="flex items-center flex-1 text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={hours.isOpen}
                        onChange={(e) => setFormData({
                          ...formData,
                          businessHours: {
                            ...formData.businessHours,
                            [day]: {...hours, isOpen: e.target.checked}
                          }
                        })}
                        className="mr-3 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                      <span className="font-medium capitalize w-24">{day}</span>
                    </label>
                    
                    {hours.isOpen && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => setFormData({
                            ...formData,
                            businessHours: {
                              ...formData.businessHours,
                              [day]: {...hours, open: e.target.value}
                            }
                          })}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">to</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => setFormData({
                            ...formData,
                            businessHours: {
                              ...formData.businessHours,
                              [day]: {...hours, close: e.target.value}
                            }
                          })}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 && (
              <button
                onClick={() => {
                  setError('');
                  setStep(step - 1);
                }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
            )}
            
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="ml-auto px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2 transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="ml-auto px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Store...
                  </>
                ) : (
                  'Create Store'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}