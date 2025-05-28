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
  Info,
  Zap,
  Star,
  Flame,
  Shield,
  Target,
  TrendingUp
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://datamartbackened.onrender.com/api/v1';

const DataHustleDeposit = () => {
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
  const [checkReminder, setCheckReminder] = useState(false);

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
    if (!amount || parseFloat(amount) <= 9) {
      setError('Please enter a valid amount greater than GHS 9');
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
      const response = await axios.post(`${API_BASE_URL}/depositsmoolre`, {
        userId,
        amount: parseFloat(amount),
        phoneNumber,
        network,
        currency: 'GHS'
      });
      
      console.log('Deposit response:', response.data);
      
      if (response.data.success && response.data.requiresOtp) {
        setOtpRequired(true);
        setReference(response.data.reference);
        setExternalRef(response.data.externalRef);
        setSuccess('OTP code has been sent to your phone. Please enter it below.');
        setStep(2);
      } else if (response.data.success) {
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
      const payload = {
        reference: reference,
        otpCode: otpCode,
        phoneNumber: phoneNumber
      };
      
      console.log('Sending OTP verification with:', payload);
      
      const response = await axios.post(`${API_BASE_URL}/verify-otp`, payload, {
        headers: {
          'Content-Type': 'application/json',
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
      
      if (err.response) {
        console.error('Error response data:', err.response.data);
        
        if (err.response.status === 400) {
          const errorMsg = err.response.data.error || 'Invalid OTP code or format';
          setError(`Verification failed: ${errorMsg}. Please check the code and try again.`);
        } else if (err.response.status === 404) {
          setError('Transaction not found. Please start a new deposit.');
        } else {
          setError(err.response.data.error || 'OTP verification failed');
        }
      } else if (err.request) {
        console.error('No response received:', err.request);
        setError('No response from server. Please check your connection and try again.');
      } else {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-400/10 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/10 to-pink-400/10 blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl">
                <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-transparent bg-clip-text">
                DATAHUSTLE
              </h1>
            </div>
            <p className="text-white/80 text-lg font-medium">Power Up Your Hustle</p>
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
                    <CreditCard className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white">Deposit Funds</h2>
                    <p className="text-white/90 text-lg font-medium">Fuel your success</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 rounded-2xl flex items-start bg-gradient-to-r from-red-100/10 to-red-200/10 border border-red-500/30 backdrop-blur-sm">
                  <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <XCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-red-200 font-medium">{error}</span>
                </div>
              )}

              {/* Success Display */}
              {success && (
                <div className="mb-6 p-4 rounded-2xl flex items-start bg-gradient-to-r from-emerald-100/10 to-emerald-200/10 border border-emerald-500/30 backdrop-blur-sm">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-emerald-200 font-medium">{success}</span>
                </div>
              )}

              {/* Step 1: Deposit Form */}
              {step === 1 && (
                <form onSubmit={handleDepositSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="amount" className="block text-lg font-bold mb-3 text-white">
                      Amount (GHS)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-emerald-400 text-xl font-bold">₵</span>
                      </div>
                      <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-12 pr-4 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold text-lg"
                        step="0.01"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phoneNumber" className="block text-lg font-bold mb-3 text-white">
                      Mobile Money Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone size={20} className="text-emerald-400" />
                      </div>
                      <input
                        type="tel"
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="02XXXXXXXX"
                        className="pl-12 pr-4 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="network" className="block text-lg font-bold mb-3 text-white">
                      Mobile Network
                    </label>
                    <select
                      id="network"
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      className="py-4 px-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                    >
                      <option value="mtn" className="bg-gray-800 text-white">MTN Mobile Money</option>
                      <option value="vodafone" className="bg-gray-800 text-white">Vodafone Cash</option>
                      <option value="at" className="bg-gray-800 text-white">AirtelTigo Money</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center py-4 px-6 rounded-2xl shadow-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 font-bold text-lg"
                  >
                    {loading ? (
                      <>
                        <div className="mr-3 animate-spin">
                          <Loader2 className="w-6 h-6" />
                        </div>
                        Processing Hustle...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-3 w-6 h-6" />
                        Power Up Now
                        <ArrowRight className="ml-3 w-6 h-6" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {step === 2 && otpRequired && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                      <Smartphone size={40} className="text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">OTP Verification</h3>
                    <p className="text-white/70 font-medium">
                      We sent a 6-digit code to {phoneNumber}
                    </p>
                  </div>

                  <form onSubmit={handleOtpSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="otpCode" className="block text-lg font-bold mb-3 text-white">
                        Enter 6-digit OTP Code
                      </label>
                      <input
                        type="text"
                        id="otpCode"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                        placeholder="XXXXXX"
                        maxLength={6}
                        className="py-4 px-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center tracking-widest text-2xl font-bold"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="w-full flex items-center justify-center py-4 px-6 rounded-2xl shadow-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 font-bold text-lg"
                    >
                      {loading ? (
                        <>
                          <div className="mr-3 animate-spin">
                            <Loader2 className="w-6 h-6" />
                          </div>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-3 w-6 h-6" />
                          Verify Code
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Step 3: Awaiting Payment */}
              {step === 3 && (
                <div className="text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                    <Target size={40} className="text-emerald-400 animate-pulse" />
                  </div>
                  
                  <h3 className="text-2xl font-black text-white mb-2">
                    Awaiting Payment Approval
                  </h3>
                  
                  <p className="text-white/70 font-medium mb-6">
                    Please check your phone and follow the instructions to complete the payment.
                  </p>
                  
                  {checkReminder && (
                    <div className="p-6 rounded-2xl mb-6 flex items-start bg-gradient-to-r from-emerald-100/10 to-teal-100/10 border border-emerald-500/30 backdrop-blur-sm">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                        <Info className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-emerald-200 font-bold">
                        Important: After approving on your phone, click "Check Payment Status" below to complete the transaction.
                      </p>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <div className="w-full bg-white/10 rounded-full h-3 backdrop-blur-sm">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full w-full animate-pulse shadow-lg"></div>
                    </div>
                  </div>

                  <button
                    onClick={checkTransactionStatus}
                    disabled={loading}
                    className="w-full flex items-center justify-center py-4 px-6 rounded-2xl shadow-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 font-bold text-lg mb-4"
                  >
                    {loading ? (
                      <>
                        <div className="mr-3 animate-spin">
                          <Loader2 className="w-6 h-6" />
                        </div>
                        Checking Status...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-3 w-6 h-6" />
                        Check Payment Status
                      </>
                    )}
                  </button>
                  
                  {transactionStatus && (
                    <div className={`p-4 rounded-2xl backdrop-blur-sm border font-bold ${
                      transactionStatus === 'completed' 
                        ? 'bg-gradient-to-r from-emerald-100/10 to-emerald-200/10 border-emerald-500/30 text-emerald-200' 
                        : transactionStatus === 'failed' 
                          ? 'bg-gradient-to-r from-red-100/10 to-red-200/10 border-red-500/30 text-red-200' 
                          : 'bg-gradient-to-r from-yellow-100/10 to-yellow-200/10 border-yellow-500/30 text-yellow-200'
                    }`}>
                      Payment status: <span className="font-black">{transactionStatus}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Progress Footer */}
            <div className="px-8 py-6 border-t border-white/10 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm font-bold text-white/70">
                  Step {step} of 3
                </div>
                {step > 1 && (
                  <button 
                    onClick={() => setStep(step - 1)}
                    className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    ← Go back
                  </button>
                )}
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 backdrop-blur-sm">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-500 shadow-lg" 
                  style={{ width: `${(step / 3) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Support Footer */}
            <div className="p-6 bg-white/5 backdrop-blur-sm border-t border-white/10">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-sm text-white/70 font-medium">
                  <p>
                    Need help with your deposit? Contact DATAHUSTLE support at{' '}
                    <a href="mailto:support@datahustle.com" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
                      support@datahustle.com
                    </a>{' '}
                    or call <span className="font-bold text-white">+233 20 000 0000</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataHustleDeposit;