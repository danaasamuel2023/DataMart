'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Star, Flame, AlertTriangle, CheckCircle, X, Info, Shield, Target, Award, Phone, CreditCard } from 'lucide-react';

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
      <div className={`p-4 rounded-2xl shadow-2xl flex items-center backdrop-blur-xl border ${
        type === 'success' 
          ? 'bg-gradient-to-r from-emerald-500/90 to-teal-600/90 text-white border-emerald-400/50' 
          : type === 'error' 
            ? 'bg-gradient-to-r from-red-500/90 to-red-600/90 text-white border-red-400/50' 
            : 'bg-gradient-to-r from-yellow-500/90 to-orange-600/90 text-white border-yellow-400/50'
      }`}>
        <div className="mr-3">
          {type === 'success' ? (
            <CheckCircle className="h-6 w-6" />
          ) : type === 'error' ? (
            <X className="h-6 w-6" />
          ) : (
            <Info className="h-6 w-6" />
          )}
        </div>
        <div className="flex-grow">
          <p className="font-bold">{message}</p>
        </div>
        <button onClick={onClose} className="ml-4 hover:scale-110 transition-transform">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

// Service Information Modal Component
const ServiceInfoModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 w-full max-w-lg shadow-2xl">
        {/* Modal header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-600 px-8 py-6 rounded-t-3xl flex justify-between items-center">
          <h3 className="text-2xl font-black text-white flex items-center">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mr-3">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            Important Service Notice
          </h3>
          <button onClick={onClose} className="text-white hover:text-white/70 p-2 rounded-xl hover:bg-white/10 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Modal content */}
        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
          <div className="flex items-start mb-6">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/20 flex items-center justify-center mr-4 flex-shrink-0 mt-1">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h4 className="text-xl font-black text-white mb-4">Please Note Before Proceeding:</h4>
              <ul className="space-y-3 text-white/80 font-medium">
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mr-3 mt-2 flex-shrink-0"></div>
                  This is <strong className="text-white">not an instant service</strong>. Data delivery times vary between customers.
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mr-3 mt-2 flex-shrink-0"></div>
                  We are working diligently to process all orders, but there may be delays.
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mr-3 mt-2 flex-shrink-0"></div>
                  If you need immediate data for urgent matters, please dial <strong className="text-white">*138#</strong> on your MTN line instead.
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mr-3 mt-2 flex-shrink-0"></div>
                  Once ordered, please be patient as we process your request.
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mr-3 mt-2 flex-shrink-0"></div>
                  For instant bundles, this service is not suitable.
                </li>
              </ul>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 p-6 rounded-2xl backdrop-blur-sm">
            <div className="flex items-start">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3 flex-shrink-0">
                <Info className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-emerald-200 font-medium">
                We value your business and are committed to delivering quality service. Thank you for your understanding and patience.
              </p>
            </div>
          </div>
        </div>
        
        {/* Modal footer */}
        <div className="px-8 py-6 border-t border-white/10 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all border border-white/20"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-2xl transition-all transform hover:scale-105"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 max-w-sm w-full mx-auto text-center shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-200/20"></div>
            <div className="absolute top-0 w-20 h-20 rounded-full border-4 border-transparent border-t-emerald-400 border-r-teal-400 animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse flex items-center justify-center">
              <Zap className="w-8 h-8 text-white animate-bounce" strokeWidth={2.5} />
            </div>
          </div>
        </div>
        <h4 className="text-2xl font-black text-white mb-3">Processing Your Order...</h4>
        <p className="text-white/80 font-medium">Your data bundle request is being processed. Please do not close this page.</p>
      </div>
    </div>
  );
};

const MTNBundleSelect = () => {
  const [selectedBundle, setSelectedBundle] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState(null);
  
  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success'
  });
  
  // Manual inventory control
  const inventoryAvailable = true;
  
  const bundles = [
    { value: '1', label: '1GB - GH₵4.40', capacity: '1', price: '4.40', network: 'YELLO', inStock: inventoryAvailable },
    { value: '2', label: '2GB - GH₵9.20', capacity: '2', price: '9.2', network: 'YELLO', inStock: inventoryAvailable },
    { value: '3', label: '3GB - GH₵13.50', capacity: '3', price: '13.5', network: 'YELLO', inStock: inventoryAvailable },
    { value: '4', label: '4GB - GH₵18.50', capacity: '4', price: '18.50', network: 'YELLO', inStock: inventoryAvailable },
    { value: '5', label: '5GB - GH₵23.50', capacity: '5', price: '23.50', network: 'YELLO', inStock: inventoryAvailable },
    { value: '6', label: '6GB - GH₵27.00', capacity: '6', price: '27.00', network: 'YELLO', inStock: inventoryAvailable },
    { value: '8', label: '8GB - GH₵35.50', capacity: '8', price: '35.50', network: 'YELLO', inStock: inventoryAvailable },
    { value: '10', label: '10GB - GH₵43.50', capacity: '10', price: '43.50', network: 'YELLO', inStock: inventoryAvailable },
    { value: '15', label: '15GB - GH₵62.50', capacity: '15', price: '62.50', network: 'YELLO', inStock: inventoryAvailable },
    { value: '20', label: '20GB - GH₵83.00', capacity: '20', price: '83.00', network: 'YELLO', inStock: inventoryAvailable },
    { value: '25', label: '25GB - GH₵105.00', capacity: '25', price: '105.00', network: 'YELLO', inStock: inventoryAvailable },
    { value: '30', label: '30GB - GH₵129.00', capacity: '30', price: '129.00', network: 'YELLO', inStock: inventoryAvailable },
    { value: '40', label: '40GB - GH₵166.00', capacity: '40', price: '166.00', network: 'YELLO', inStock: inventoryAvailable },
    { value: '50', label: '50GB - GH₵207.00', capacity: '50', price: '207.00', network: 'YELLO', inStock: inventoryAvailable },
    { value: '100', label: '100GB - GH₵407.00 (Out of Stock)', capacity: '100', price: '407.00', network: 'YELLO', inStock: false }
  ];

  // Get user data from localStorage on component mount
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
  }, []);

  // Add CSS for toast animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translate3d(0, -20px, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }
      .animate-fade-in-down {
        animation: fadeInDown 0.5s ease-out;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Function to validate phone number format
  const validatePhoneNumber = (number) => {
    const cleanNumber = number.replace(/[\s-]/g, '');
    
    if (cleanNumber.startsWith('0')) {
      return cleanNumber.length === 10 && /^0\d{9}$/.test(cleanNumber);
    }
    
    return false;
  };
  
  // Format phone number as user types
  const formatPhoneNumber = (input) => {
    let formatted = input.replace(/\D/g, '');
    
    if (!formatted.startsWith('0') && formatted.length > 0) {
      formatted = '0' + formatted;
    }
    
    if (formatted.length > 10) {
      formatted = formatted.substring(0, 10);
    }
    
    return formatted;
  };

  const handlePhoneNumberChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    setPhoneNumber(formattedNumber);
  };

  // Function to show toast
  const showToast = (message, type = 'success') => {
    setToast({
      visible: true,
      message,
      type
    });
  };

  // Function to hide toast
  const hideToast = () => {
    setToast(prev => ({
      ...prev,
      visible: false
    }));
  };

  // Get selected bundle details
  const getSelectedBundleDetails = () => {
    return bundles.find(bundle => bundle.value === selectedBundle);
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!selectedBundle) {
      setError('Please select a data bundle');
      return;
    }
    
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid MTN number starting with 0 followed by 9 digits');
      return;
    }

    const bundle = getSelectedBundleDetails();
    
    if (!bundle.inStock) {
      setError('Sorry, this bundle is currently out of stock.');
      return;
    }

    if (!userData || !userData.id) {
      showToast('User not authenticated. Please login to continue.', 'error');
      return;
    }

    setPendingPurchase(bundle);
    setIsModalOpen(true);
  };

  // Process the actual purchase after modal confirmation
  const processPurchase = async () => {
    if (!pendingPurchase) return; 
    
    setIsLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('https://datamartbackened.onrender.com/api/v1/data/purchase-data', {
        userId: userData.id,
        phoneNumber: phoneNumber,
        network: pendingPurchase.network,
        capacity: pendingPurchase.capacity, 
        price: parseFloat(pendingPurchase.price)
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.status === 'success') {
        showToast(`${pendingPurchase.capacity}GB data bundle purchased successfully for ${phoneNumber}. It will be delivered soon.`, 'success');
        setSelectedBundle('');
        setPhoneNumber('');
        setError('');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setError(error.response?.data?.message || 'Failed to purchase data bundle');
      showToast(error.response?.data?.message || 'Failed to purchase data bundle', 'error');
    } finally {
      setIsLoading(false);
      setPendingPurchase(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-400/10 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/10 to-pink-400/10 blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-400/5 to-blue-400/5 blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Toast Notification */}
      {toast.visible && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
      
      {/* Global Loading Overlay */}
      <LoadingOverlay isLoading={isLoading} />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <ServiceInfoModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={() => {
              setIsModalOpen(false);
              processPurchase();
            }}
          />
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-xl">
                <span className="text-3xl font-black text-white">MTN</span>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-transparent bg-clip-text">
                  DATAHUSTLE
                </h1>
                <p className="text-white/80 text-lg font-medium">MTN Non-Expiry Bundles</p>
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div className="absolute bottom-4 left-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Flame className="w-4 h-4 text-white animate-bounce" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Target className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white">Select Your Bundle</h2>
                    <p className="text-white/90 text-lg font-medium">Choose data size & complete purchase</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="p-8">
              {/* Service info button */}
              <div className="mb-6 flex justify-center">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl hover:bg-gradient-to-r hover:from-emerald-500/30 hover:to-teal-500/30 transition-all"
                >
                  <Info className="h-5 w-5" />
                  <span>Service Information</span>
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 rounded-2xl flex items-start bg-gradient-to-r from-red-100/10 to-red-200/10 border border-red-500/30 backdrop-blur-sm">
                  <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <X className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-red-200 font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handlePurchase} className="space-y-6">
                {/* Bundle Selection */}
                <div>
                  <label className="block text-lg font-bold mb-3 text-white">
                    Select Data Bundle
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBundle}
                      onChange={(e) => setSelectedBundle(e.target.value)}
                      className="w-full px-4 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium appearance-none cursor-pointer"
                      required
                    >
                      <option value="" className="bg-gray-800 text-gray-300">Choose your data bundle...</option>
                      {bundles.map((bundle) => (
                        <option 
                          key={bundle.value} 
                          value={bundle.value}
                          className={`bg-gray-800 ${bundle.inStock ? 'text-white' : 'text-gray-500'}`}
                          disabled={!bundle.inStock}
                        >
                          {bundle.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Phone Number Input */}
                <div>
                  <label className="block text-lg font-bold mb-3 text-white">
                    MTN Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="w-5 h-5 text-emerald-400" />
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                      className="pl-12 pr-4 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                      placeholder="0XXXXXXXXX"
                      required
                    />
                  </div>
                  <p className="mt-2 text-sm text-white/70 font-medium">Format: 0 followed by 9 digits (10 digits total)</p>
                </div>

                {/* Selected Bundle Summary */}
                {selectedBundle && (
                  <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2 text-emerald-400" />
                      Order Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-white/90">
                        <span className="font-medium">Data Bundle:</span>
                        <span className="font-bold">{getSelectedBundleDetails()?.capacity}GB</span>
                      </div>
                      <div className="flex justify-between text-white/90">
                        <span className="font-medium">Duration:</span>
                        <span className="font-bold text-emerald-400">No-Expiry</span>
                      </div>
                      <div className="border-t border-white/20 pt-3 mt-3">
                        <div className="flex justify-between text-white font-black text-xl">
                          <span>Total:</span>
                          <span className="text-emerald-400">GH₵{getSelectedBundleDetails()?.price}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Purchase Button */}
                <button
                  type="submit"
                  disabled={isLoading || !selectedBundle || !phoneNumber}
                  className="w-full flex items-center justify-center py-4 px-6 rounded-2xl shadow-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-bold text-lg"
                >
                  <Zap className="mr-3 w-6 h-6" />
                  Purchase Data Bundle
                </button>
              </form>

              {/* Important Notice */}
              <div className="mt-8 p-6 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 rounded-2xl backdrop-blur-sm">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center mr-4 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-red-400 mb-2">Important Notice</h4>
                    <div className="space-y-2 text-white/80 text-sm font-medium">
                      <p>• Turbonet and Broadband Sim Cards are not eligible</p>
                      <p>• Data delivery is not instant - please be patient</p>
                      <p>• No refunds for wrong numbers or duplicate orders</p>
                      <p>• Verify your phone number carefully before purchase</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MTNBundleSelect;