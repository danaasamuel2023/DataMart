'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { Info, AlertCircle, X, Copy, AlertTriangle, Zap, Star, Flame, Shield, CreditCard, TrendingUp, Sparkles } from 'lucide-react';

export default function DepositPage() {
  const [amount, setAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [fee, setFee] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [accountStatus, setAccountStatus] = useState('');
  const [disableReason, setDisableReason] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [showPaystackWarningModal, setShowPaystackWarningModal] = useState(false);
  
  const router = useRouter();
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem('userData');
      
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.id);
        setUserEmail(user.email);
        setIsAuthenticated(true);
        
        if (user.isDisabled) {
          setAccountStatus('disabled');
          setDisableReason(user.disableReason || 'No reason provided');
        } else if (user.approvalStatus === 'pending') {
          setAccountStatus('pending');
        } else if (user.approvalStatus === 'rejected') {
          setAccountStatus('not-approved');
          setDisableReason(user.rejectionReason || 'Your account has not been approved.');
        }
      } else {
        router.push('/SignIn');
      }
    };
    
    checkAuth();
  }, [router]);
  
  // Calculate fee and total amount when deposit amount changes
  useEffect(() => {
    if (amount && amount > 0) {
      const feeAmount = parseFloat(amount) * 0.03; // 3% fee
      const total = parseFloat(amount) + feeAmount;
      setFee(feeAmount.toFixed(2));
      setTotalAmount(total.toFixed(2));
    } else {
      setFee('');
      setTotalAmount('');
    }
  }, [amount]);
  
  const handleDeposit = async (e) => {
    e.preventDefault();
    
    if (!amount || amount <= 9) {
      setError('Please enter a valid amount greater than 9 GHS.');
      return;
    }
    
    setShowPaystackWarningModal(true);
  };
  
  // Function to proceed with the deposit after warning
  const proceedWithDeposit = async () => {
    setShowPaystackWarningModal(false);
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post('https://datamartbackened.onrender.com/api/v1/deposit', {
        userId,
        amount: parseFloat(amount),
        totalAmountWithFee: parseFloat(totalAmount),
        email: userEmail
      });
      
      if (response.data.paystackUrl) {
        setSuccess('Redirecting to payment gateway...');
        window.location.href = response.data.paystackUrl;
      }
    } catch (error) {
      console.error('Deposit error:', error);
      
      if (error.response?.data?.error === 'Account is disabled') {
        setAccountStatus('disabled');
        setDisableReason(error.response.data.disableReason || 'No reason provided');
        setShowApprovalModal(true);
      } else if (error.response?.data?.error === 'Account not approved') {
        if (error.response.data.approvalStatus === 'pending') {
          setAccountStatus('pending');
        } else {
          setAccountStatus('not-approved');
          setDisableReason(error.response.data.reason || 'Your account has not been approved.');
        }
        setShowApprovalModal(true);
      } else {
        setError(error.response?.data?.error || 'Failed to process deposit. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const useAlternativePayment = () => {
    setShowPaystackWarningModal(false);
    router.push('/deposite?method=alternative');
  };
  
  // Function to copy mobile money number to clipboard
  const copyMomoNumber = () => {
    navigator.clipboard.writeText('0597760914');
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  };
  
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-100/20"></div>
            <div className="absolute top-0 w-20 h-20 rounded-full border-4 border-transparent border-t-emerald-400 border-r-teal-400 animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse flex items-center justify-center">
              <Zap className="w-6 h-6 text-white animate-bounce" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2 text-emerald-300">
            <Sparkles className="w-5 h-5 animate-spin" />
            <span className="text-lg font-bold">Checking authentication...</span>
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-400/10 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/10 to-pink-400/10 blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
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
            <p className="text-white/80 text-lg font-medium">Fuel Your Success</p>
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
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <CreditCard className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white">Deposit Funds</h2>
                    <p className="text-white/90 text-lg font-medium">Power up your hustle</p>
                  </div>
                </div>
                
                <Link 
                  href="/howtodeposite" 
                  className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white font-bold rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-300 transform hover:scale-105"
                >
                  <Info size={16} />
                  <span>Help</span>
                </Link>
              </div>
            </div>

            <div className="p-8">
              {/* Info Banner */}
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-100/10 to-teal-100/10 border border-emerald-500/30 backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Info className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-emerald-200 font-medium">
                    Need help? <Link href="/howtodeposite" className="text-emerald-400 hover:text-emerald-300 underline font-bold">View deposit guide</Link>
                  </p>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 rounded-2xl flex items-start bg-gradient-to-r from-red-100/10 to-red-200/10 border border-red-500/30 backdrop-blur-sm">
                  <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-red-200 font-medium">{error}</span>
                </div>
              )}

              {/* Success Display */}
              {success && (
                <div className="mb-6 p-4 rounded-2xl flex items-start bg-gradient-to-r from-emerald-100/10 to-emerald-200/10 border border-emerald-500/30 backdrop-blur-sm">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-emerald-200 font-medium">{success}</span>
                </div>
              )}

              {/* Deposit Form */}
              <form onSubmit={handleDeposit} className="space-y-6">
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
                      className="pl-12 pr-4 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold text-lg"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="1"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                
                {/* Amount Breakdown */}
                {amount && amount > 0 && (
                  <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />
                      Breakdown
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-white/90">
                        <span className="font-medium">Amount:</span>
                        <span className="font-bold">GHS {parseFloat(amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/90">
                        <span className="font-medium">Processing Fee (3%):</span>
                        <span className="font-bold">GHS {fee}</span>
                      </div>
                      <div className="border-t border-white/20 pt-3 mt-3">
                        <div className="flex justify-between text-white font-black text-xl">
                          <span>Total:</span>
                          <span className="text-emerald-400">GHS {totalAmount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center py-4 px-6 rounded-2xl shadow-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 font-bold text-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-3 animate-spin">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"></div>
                      </div>
                      Processing Hustle...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-3 w-6 h-6" />
                      Deposit Now
                    </>
                  )}
                </button>
              </form>

              {/* Footer Info */}
              <div className="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                <div className="space-y-2 text-sm text-white/70">
                  <p className="flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-emerald-400" />
                    3% processing fee applies to all deposits
                  </p>
                  <p className="flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-emerald-400" />
                    Payments processed securely via Paystack
                  </p>
                  <Link 
                    href="/myorders" 
                    className="flex items-center text-emerald-400 hover:text-emerald-300 font-bold transition-colors mt-3"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View deposit history
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paystack Warning Modal */}
      {showPaystackWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                </div>
                <h2 className="text-xl font-black text-white">Payment Notice</h2>
              </div>
              <button 
                onClick={() => setShowPaystackWarningModal(false)}
                className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-white/80 font-medium mb-6">
              ⚠️ If Paystack doesn't prompt for your PIN or payment fails, use our alternative method.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={proceedWithDeposit}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-2xl transition-all transform hover:scale-105"
              >
                Continue with Paystack
              </button>
              
              <button
                onClick={useAlternativePayment}
                className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold rounded-2xl transition-all transform hover:scale-105"
                disabled
              >
                Use Alternative Method
              </button>
              
              <button
                onClick={() => setShowPaystackWarningModal(false)}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all border border-white/20"
              >
                Cancel
              </button>
            </div>
            
            <p className="text-sm text-white/50 mt-4 text-center">
              Note: Alternative payment has higher charges.
            </p>
          </div>
        </div>
      )}
      
      {/* Account Status Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-xl font-black text-white">
                  {accountStatus === 'pending' ? 'Account Pending' : 
                   accountStatus === 'disabled' ? 'Account Disabled' : 
                   'Account Not Approved'}
                </h2>
              </div>
              <button 
                onClick={() => setShowApprovalModal(false)}
                className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            {accountStatus === 'disabled' ? (
              <p className="text-red-300 font-medium mb-6">
                {disableReason}
              </p>
            ) : (
              <>
                <p className="text-white/80 font-medium mb-6">
                  {accountStatus === 'pending' ? 
                    'Pay 100 GHS to activate your account:' : 
                    'Your account needs approval. Pay 100 GHS to:'}
                </p>
                
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl mb-6 border border-white/20">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-white font-bold">
                        <span className="text-emerald-400">MoMo:</span> 0597760914
                      </p>
                      <p className="text-white font-bold">
                        <span className="text-emerald-400">Name:</span> KOJO Frimpong
                      </p>
                    </div>
                    <button 
                      onClick={copyMomoNumber}
                      className="flex items-center space-x-2 text-emerald-400 hover:text-emerald-300 font-bold p-2 rounded-xl hover:bg-white/10 transition-all"
                    >
                      <Copy size={18} />
                      {copySuccess && <span className="text-sm text-emerald-300">{copySuccess}</span>}
                    </button>
                  </div>
                </div>
                
                <p className="text-yellow-300 font-medium mb-6 text-center">
                  Use your email/phone as payment reference
                </p>
              </>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all border border-white/20"
              >
                Close
              </button>
              
              <a
                href="mailto:datamartghana@gmail.com"
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-2xl text-center transition-all transform hover:scale-105"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}