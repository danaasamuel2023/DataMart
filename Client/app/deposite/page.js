'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ArrowRight,
  Phone,
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://datamartbackened.onrender.com/api/v1';

const MoolreDeposit = () => {
  // States
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState('mtn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [reference, setReference] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [userId, setUserId] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');
  const [step, setStep] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [checkReminder, setCheckReminder] = useState(false);

  // Detect dark mode preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
    
    const handleChange = (e) => {
      setIsDarkMode(e.matches);
    };
    
    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Get user data from localStorage on component mount
  useEffect(() => {
    try {
      const userDataString = localStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setUserId(userData.id);
        
        // Also try to get user's phone number if available
        if (userData.phone) {
          setPhoneNumber(userData.phone);
        }
      } else {
        setError('You need to be logged in to make a deposit');
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
      setError('Error retrieving user information');
    }
  }, []);

  // Form validation
  const isFormValid = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return false;
    }
    
    if (!network) {
      setError('Please select a network');
      return false;
    }
    
    if (!userId) {
      setError('User ID not found. Please log in again');
      return false;
    }
    
    setError('');
    return true;
  };

  // Handle deposit submission
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid()) return;
    
    setLoading(true);
    setSuccess('');
    setError('');
    
    try {
      // Update the endpoint to match the backend route
      const response = await axios.post(`${API_BASE_URL}/depositsmoolre`, {
        userId,
        amount: parseFloat(amount),
        phoneNumber,
        network,
        currency: 'GHS' // Default to Ghana Cedis
      });
      
      console.log('Deposit response:', response.data);
      
      if (response.data.success && response.data.requiresOtp) {
        // OTP verification is required
        setOtpRequired(true);
        setReference(response.data.reference);
        setExternalRef(response.data.externalRef);
        setSuccess('OTP code has been sent to your phone. Please enter it below.');
        setStep(2);
      } else if (response.data.success) {
        // Direct payment request was sent
        setSuccess('Deposit initiated! Please check your phone to approve the payment.');
        setReference(response.data.reference);
        setCheckReminder(true);
        setStep(3);
      } else {
        setError(response.data.message || 'Failed to initiate deposit');
      }
    } catch (err) {
      console.error('Deposit error:', err);
      if (err.response && err.response.data) {
        console.error('Error response:', err.response.data);
        setError(err.response.data.error || 'An error occurred while processing your deposit');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Prepare the request payload exactly as expected by the backend
      const payload = {
        reference: reference,
        otpCode: otpCode, // This must match the backend parameter name
        phoneNumber: phoneNumber
      };
      
      console.log('Sending OTP verification with:', payload);
      
      const response = await axios.post(`${API_BASE_URL}/verify-otp`, payload, {
        headers: {
          'Content-Type': 'application/json',
          // Ensure headers match what backend expects
        }
      });
      
      console.log('OTP verification response:', response.data);
      
      if (response.data.success) {
        setSuccess('OTP verified successfully. Please check your phone to approve the payment.');
        setOtpRequired(false);
        setCheckReminder(true);
        setStep(3);
      } else {
        setError(response.data.message || 'Invalid OTP code');
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      
      // Detailed error analysis
      if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        console.error('Error response headers:', err.response.headers);
        
        if (err.response.status === 400) {
          // Get specific error message from response if available
          const errorMsg = err.response.data.error || 'Invalid OTP code or format';
          setError(`Verification failed: ${errorMsg}. Please check the code and try again.`);
        } else if (err.response.status === 404) {
          setError('Transaction not found. Please start a new deposit.');
        } else {
          setError(err.response.data.error || 'OTP verification failed');
        }
      } else if (err.request) {
        // Request was made but no response received
        console.error('No response received:', err.request);
        setError('No response from server. Please check your connection and try again.');
      } else {
        // Something else caused the error
        console.error('Error setting up request:', err.message);
        setError('Error preparing verification request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Check transaction status
  const checkTransactionStatus = async () => {
    if (!reference) {
      setError('Reference ID is missing. Cannot check status.');
      return;
    }
    
    setLoading(true);
    setCheckReminder(false);
    
    try {
      console.log('Checking transaction status for reference:', reference);
      
      const response = await axios.get(`${API_BASE_URL}/verify-payments?reference=${encodeURIComponent(reference)}`);
      
      console.log('Transaction status response:', response.data);
      
      if (response.data.success) {
        setTransactionStatus(response.data.data.status);
        
        if (response.data.data.status === 'completed') {
          setSuccess(`Payment of GHS ${response.data.data.amount.toFixed(2)} completed successfully!`);
          
          // Reset form after successful payment
          setTimeout(() => {
            setAmount('');
            setPhoneNumber('');
            setOtpCode('');
            setReference('');
            setExternalRef('');
            setOtpRequired(false);
            setStep(1);
          }, 5000);
        } else if (response.data.data.status === 'failed') {
          setError('Payment failed. Please try again with a new deposit.');
        } else {
          setTransactionStatus('pending');
          setSuccess('Your payment is still being processed. Please complete the payment on your phone.');
          setCheckReminder(true);
        }
      } else {
        setError(response.data.message || 'Could not verify payment status');
      }
    } catch (err) {
      console.error('Check status error:', err);
      
      if (err.response) {
        console.error('Error response:', err.response.data);
        if (err.response.status === 404) {
          setError('Transaction not found. The reference may be invalid.');
        } else {
          setError(err.response.data.error || 'Failed to check payment status');
        }
      } else {
        setError('Network error while checking payment status. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Dynamic class based on dark mode
  const getThemeClass = (lightClass, darkClass) => {
    return isDarkMode ? darkClass : lightClass;
  };

  return (
    <div className={`w-full max-w-md mx-auto p-4 ${getThemeClass('', 'dark')}`}>
      <div className={getThemeClass(
        'bg-white rounded-lg shadow-lg overflow-hidden',
        'bg-gray-800 rounded-lg shadow-lg overflow-hidden'
      )}>
        <div className="bg-blue-600 p-6 text-white">
          <h2 className="text-xl font-bold flex items-center">
            <CreditCard className="mr-2" size={24} />
            Deposit Funds
          </h2>
          <p className="text-blue-100 mt-1">Add money to your wallet via Mobile Money</p>
        </div>

        <div className={getThemeClass('p-6', 'p-6 text-white')}>
          {/* Error Display */}
          {error && (
            <div className={`mb-4 px-4 py-3 rounded-md flex items-start ${getThemeClass('bg-red-50 border border-red-200 text-red-700', 'bg-red-900/30 border border-red-800 text-red-200')}`}>
              <XCircle className="mr-2 flex-shrink-0 mt-0.5" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className={`mb-4 px-4 py-3 rounded-md flex items-start ${getThemeClass('bg-green-50 border border-green-200 text-green-700', 'bg-green-900/30 border border-green-800 text-green-200')}`}>
              <CheckCircle2 className="mr-2 flex-shrink-0 mt-0.5" size={16} />
              <span>{success}</span>
            </div>
          )}

          {/* Step 1: Direct Deposit Form */}
          {step === 1 && (
            <form onSubmit={handleDepositSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="amount" className={`block text-sm font-medium mb-1 ${getThemeClass('text-gray-700', 'text-gray-200')}`}>
                    Amount (GHS)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className={getThemeClass('text-gray-500', 'text-gray-400')}>₵</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className={`pl-8 pr-4 py-2 block w-full rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        getThemeClass('border border-gray-300 bg-white text-gray-900', 'border border-gray-600 bg-gray-700 text-white')
                      }`}
                      step="0.01"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phoneNumber" className={`block text-sm font-medium mb-1 ${getThemeClass('text-gray-700', 'text-gray-200')}`}>
                    Mobile Money Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={16} className={getThemeClass('text-gray-500', 'text-gray-400')} />
                    </div>
                    <input
                      type="tel"
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="02XXXXXXXX"
                      className={`pl-10 pr-4 py-2 block w-full rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        getThemeClass('border border-gray-300 bg-white text-gray-900', 'border border-gray-600 bg-gray-700 text-white')
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="network" className={`block text-sm font-medium mb-1 ${getThemeClass('text-gray-700', 'text-gray-200')}`}>
                    Mobile Network
                  </label>
                  <select
                    id="network"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className={`py-2 px-3 block w-full rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      getThemeClass('border border-gray-300 bg-white text-gray-900', 'border border-gray-600 bg-gray-700 text-white')
                    }`}
                  >
                    <option value="mtn">MTN Mobile Money</option>
                    <option value="vodafone">Vodafone Cash</option>
                    <option value="at">AirtelTigo Money</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <div className="mr-2 animate-spin">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Deposit Now
                      <ArrowRight className="ml-2" size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && otpRequired && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-2 ${
                  getThemeClass('bg-blue-100 text-blue-600', 'bg-blue-900 text-blue-300')
                }`}>
                  <Smartphone size={32} />
                </div>
                <h3 className={`text-lg font-medium ${getThemeClass('text-gray-900', 'text-white')}`}>OTP Verification</h3>
                <p className={getThemeClass('text-sm text-gray-500', 'text-sm text-gray-300')}>
                  We sent a 6-digit code to {phoneNumber}
                </p>
              </div>

              <div>
                <label htmlFor="otpCode" className={`block text-sm font-medium mb-1 ${getThemeClass('text-gray-700', 'text-gray-200')}`}>
                  Enter 6-digit OTP Code
                </label>
                <input
                  type="text"
                  id="otpCode"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className={`py-2 px-3 block w-full rounded-md focus:ring-blue-500 focus:border-blue-500 text-center tracking-widest text-lg ${
                    getThemeClass('border border-gray-300 bg-white text-gray-900', 'border border-gray-600 bg-gray-700 text-white')
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="mr-2 animate-spin">
                      <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>
            </form>
          )}

          {/* Step 3: Awaiting Payment Approval */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                getThemeClass('bg-blue-100 text-blue-600', 'bg-blue-900 text-blue-300')
              }`}>
                <Smartphone size={32} />
              </div>
              
              <h3 className={`text-lg font-medium mb-2 ${getThemeClass('text-gray-900', 'text-white')}`}>
                Awaiting Payment Approval
              </h3>
              
              <p className={`text-sm mb-6 ${getThemeClass('text-gray-600', 'text-gray-300')}`}>
                Please check your phone and follow the instructions to complete the payment.
              </p>
              
              {checkReminder && (
                <div className={`p-4 rounded-md mb-4 flex items-start ${
                  getThemeClass('bg-blue-50 text-blue-700 border border-blue-200', 'bg-blue-900/30 text-blue-200 border border-blue-800')
                }`}>
                  <Info className="mr-2 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm font-medium">
                    Important: After approving on your phone, click "Check Payment Status" below to complete the transaction.
                  </p>
                </div>
              )}
              
              <div className="mb-4">
                <div className={getThemeClass('w-full bg-gray-200 rounded-full h-2.5', 'w-full bg-gray-700 rounded-full h-2.5')}>
                  <div className="bg-blue-600 h-2.5 rounded-full w-full animate-pulse"></div>
                </div>
              </div>

              <button
                onClick={checkTransactionStatus}
                disabled={loading}
                className={`w-full flex items-center justify-center py-3 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 mb-2 ${
                  loading 
                    ? 'opacity-75' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <div className="mr-2 animate-spin">
                      <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2" size={18} />
                    Check Payment Status
                  </>
                )}
              </button>
              
              {transactionStatus && (
                <div className={`mt-4 p-3 rounded-md ${
                  transactionStatus === 'completed' 
                    ? getThemeClass('bg-green-50 text-green-700', 'bg-green-900/30 text-green-200') 
                    : transactionStatus === 'failed' 
                      ? getThemeClass('bg-red-50 text-red-700', 'bg-red-900/30 text-red-200') 
                      : getThemeClass('bg-yellow-50 text-yellow-700', 'bg-yellow-900/30 text-yellow-200')
                }`}>
                  Payment status: <span className="font-bold">{transactionStatus}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with step indicator */}
        {step < 4 && (
          <div className={`px-6 py-4 border-t ${
            getThemeClass('bg-gray-50 border-gray-200', 'bg-gray-800 border-gray-700')
          }`}>
            <div className="flex justify-between">
              <div className={getThemeClass('text-xs text-gray-500', 'text-xs text-gray-400')}>
                Step {step} of 3
              </div>
              {step > 1 && (
                <button 
                  onClick={() => setStep(step - 1)}
                  className={getThemeClass('text-xs text-blue-600 hover:text-blue-800', 'text-xs text-blue-400 hover:text-blue-300')}
                >
                  Go back
                </button>
              )}
            </div>
            <div className={getThemeClass('w-full bg-gray-200 rounded-full h-1 mt-1', 'w-full bg-gray-700 rounded-full h-1 mt-1')}>
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Footer with help information */}
        <div className={`p-4 ${getThemeClass('bg-gray-50 border-t border-gray-100', 'bg-gray-900 border-t border-gray-700')}`}>
          <div className="flex items-start">
            <AlertCircle className={`mr-2 flex-shrink-0 ${getThemeClass('text-gray-400', 'text-gray-500')}`} size={16} />
            <div className={`text-xs ${getThemeClass('text-gray-500', 'text-gray-400')}`}>
              <p>
                If you encounter any issues with your deposit, please contact our support team
                at <a href="mailto:support@moolre.com" className={`${getThemeClass('text-blue-600 hover:text-blue-800', 'text-blue-400 hover:text-blue-300')} font-medium`}>support@moolre.com</a> or call
                <span className="font-medium"> +233 20 000 0000</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoolreDeposit;