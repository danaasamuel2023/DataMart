'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  QrCode,
  ArrowRight,
  Phone,
  AlertCircle
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

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
  const [showQRCode, setShowQRCode] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [dialCode, setDialCode] = useState('');
  const [depositMethod, setDepositMethod] = useState('direct'); // 'direct' or 'paymentId'
  const [transactionStatus, setTransactionStatus] = useState('');
  const [step, setStep] = useState(1);

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
      const response = await axios.post(`${API_BASE_URL}/deposit`, {
        userId,
        amount: parseFloat(amount),
        phoneNumber,
        network,
        currency: 'GHS' // Default to Ghana Cedis
      });
      
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
        setStep(3);
      } else {
        setError(response.data.message || 'Failed to initiate deposit');
      }
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.response?.data?.error || 'An error occurred while processing your deposit');
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
      const response = await axios.post(`${API_BASE_URL}/verify-otp`, {
        reference,
        otpCode,
        phoneNumber
      });
      
      if (response.data.success) {
        setSuccess('OTP verified successfully. Please check your phone to approve the payment.');
        setOtpRequired(false);
        setStep(3);
      } else {
        setError(response.data.message || 'Invalid OTP code');
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err.response?.data?.error || 'An error occurred during OTP verification');
    } finally {
      setLoading(false);
    }
  };

  // Generate Payment ID for recurring payments
  const handleGeneratePaymentId = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/generate-payment-id`, {
        userId,
        phone: phoneNumber,
        name: localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')).name : ''
      });
      
      if (response.data.success) {
        setPaymentId(response.data.data.paymentId);
        setDialCode(response.data.data.dialCode);
        setShowQRCode(true);
        setSuccess('Payment ID generated successfully!');
        setStep(4);
      } else {
        setError(response.data.message || 'Failed to generate payment ID');
      }
    } catch (err) {
      console.error('Generate payment ID error:', err);
      setError(err.response?.data?.error || 'An error occurred while generating payment ID');
    } finally {
      setLoading(false);
    }
  };

  // Check transaction status
  const checkTransactionStatus = async () => {
    if (!reference) return;
    
    setLoading(true);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/verify-payment?reference=${reference}`);
      
      if (response.data.success) {
        setTransactionStatus(response.data.data.status);
        
        if (response.data.data.status === 'completed') {
          setSuccess('Payment completed successfully!');
          
          // Reset form after successful payment
          setTimeout(() => {
            setAmount('');
            setPhoneNumber('');
            setOtpCode('');
            setReference('');
            setOtpRequired(false);
            setStep(1);
          }, 5000);
        } else if (response.data.data.status === 'failed') {
          setError('Payment failed. Please try again.');
        } else {
          setTransactionStatus('pending');
        }
      } else {
        setError(response.data.message || 'Could not verify payment status');
      }
    } catch (err) {
      console.error('Check status error:', err);
      setError(err.response?.data?.error || 'An error occurred while checking payment status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h2 className="text-xl font-bold flex items-center">
            <CreditCard className="mr-2" size={24} />
            Deposit Funds
          </h2>
          <p className="text-blue-100 mt-1">Add money to your wallet via Mobile Money</p>
        </div>

        <div className="p-6">
          {/* Method Selection */}
          {step === 1 && (
            <div className="mb-6">
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setDepositMethod('direct')}
                  className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center ${
                    depositMethod === 'direct' 
                      ? 'bg-blue-100 border-2 border-blue-500 text-blue-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Smartphone className="mr-2" size={20} />
                  <span>Direct Deposit</span>
                </button>
                <button
                  onClick={() => setDepositMethod('paymentId')}
                  className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center ${
                    depositMethod === 'paymentId' 
                      ? 'bg-blue-100 border-2 border-blue-500 text-blue-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <QrCode className="mr-2" size={20} />
                  <span>Payment ID</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
              <XCircle className="mr-2 flex-shrink-0 mt-0.5" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-start">
              <CheckCircle2 className="mr-2 flex-shrink-0 mt-0.5" size={16} />
              <span>{success}</span>
            </div>
          )}

          {/* Step 1: Direct Deposit Form */}
          {step === 1 && depositMethod === 'direct' && (
            <form onSubmit={handleDepositSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (GHS)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₵</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-8 pr-4 py-2 block w-full rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Money Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={16} className="text-gray-500" />
                    </div>
                    <input
                      type="tel"
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="02XXXXXXXX"
                      className="pl-10 pr-4 py-2 block w-full rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="network" className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Network
                  </label>
                  <select
                    id="network"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="py-2 px-3 block w-full rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="mtn">MTN Mobile Money</option>
                    <option value="vodafone">Vodafone Cash</option>
                    <option value="at">AirtelTigo Money</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
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

          {/* Step 1: Generate Payment ID Form */}
          {step === 1 && depositMethod === 'paymentId' && (
            <div>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Generate a Payment ID to receive multiple payments. Users will dial 
                      <span className="font-mono font-bold"> *203*ID# </span>
                      on their phone to pay you.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="phoneNumberPaymentId" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Phone Number (to receive notifications)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={16} className="text-gray-500" />
                    </div>
                    <input
                      type="tel"
                      id="phoneNumberPaymentId"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="02XXXXXXXX"
                      className="pl-10 pr-4 py-2 block w-full rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGeneratePaymentId}
                  disabled={loading || !phoneNumber}
                  className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Payment ID
                      <QrCode className="ml-2" size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && otpRequired && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-2">
                  <Smartphone size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">OTP Verification</h3>
                <p className="text-sm text-gray-500">
                  We sent a 6-digit code to {phoneNumber}
                </p>
              </div>

              <div>
                <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter 6-digit OTP Code
                </label>
                <input
                  type="text"
                  id="otpCode"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="py-2 px-3 block w-full rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-center tracking-widest text-lg"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                <Smartphone size={32} />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Awaiting Payment Approval
              </h3>
              
              <p className="text-sm text-gray-600 mb-6">
                Please check your phone and follow the instructions to complete the payment.
              </p>
              
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>

              <button
                onClick={checkTransactionStatus}
                disabled={loading}
                className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Checking...
                  </>
                ) : (
                  'Check Payment Status'
                )}
              </button>
              
              {transactionStatus && (
                <div className={`mt-4 p-3 rounded-md ${
                  transactionStatus === 'completed' ? 'bg-green-50 text-green-700' : 
                  transactionStatus === 'failed' ? 'bg-red-50 text-red-700' : 
                  'bg-yellow-50 text-yellow-700'
                }`}>
                  Payment status: <span className="font-bold">{transactionStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Payment ID Generated */}
          {step === 4 && showQRCode && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                <QrCode size={32} />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Payment ID Generated!
              </h3>
              
              <div className="bg-gray-100 p-4 rounded-lg mb-4 font-mono text-center">
                <div className="text-sm text-gray-500 mb-1">Your Payment ID</div>
                <div className="text-2xl font-bold tracking-wide text-gray-800">{paymentId}</div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-blue-800 font-medium">Dial this code to pay:</p>
                <p className="text-xl font-bold text-blue-900 mt-1">{dialCode}</p>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                Share this code with customers to receive payments directly to your wallet.
              </p>
              
              <button
                onClick={() => {
                  // Copy to clipboard functionality
                  navigator.clipboard.writeText(dialCode)
                    .then(() => setSuccess('Copied to clipboard!'))
                    .catch(() => setError('Failed to copy'));
                }}
                className="w-full mb-2 flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Copy Dial Code
              </button>
              
              <button
                onClick={() => setStep(1)}
                className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer with step indicator */}
        {step < 4 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between">
              <div className="text-xs text-gray-500">
                Step {step} of 3
              </div>
              {step > 1 && (
                <button 
                  onClick={() => setStep(step - 1)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Go back
                </button>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
              <div 
                className="bg-blue-600 h-1 rounded-full" 
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoolreDeposit;