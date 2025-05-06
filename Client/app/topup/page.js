'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { Info, AlertCircle, X, Copy, AlertTriangle } from 'lucide-react';

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
    return <div className="flex justify-center items-center min-h-screen text-gray-800 dark:text-gray-200">Checking authentication...</div>;
  }
  
  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Paystack Warning Modal - Simplified */}
      {showPaystackWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-sm w-full">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <AlertTriangle size={20} className="text-yellow-500 mr-2" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Payment Notice</h2>
              </div>
              <button 
                onClick={() => setShowPaystackWarningModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              ⚠️ If Paystack doesn't prompt for your PIN or payment fails, use our alternative method.
            </p>
            
            <div className="flex flex-col space-y-3 mb-4">
              <button
                onClick={proceedWithDeposit}
                className="bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm"
              >
                Continue with Paystack
              </button>
              
              <button
                onClick={useAlternativePayment}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded text-sm"
                disabled
              >
                Use Alternative Method
              </button>
              
              <button
                onClick={() => setShowPaystackWarningModal(false)}
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded text-sm"
              >
                Cancel
              </button>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Note: Alternative payment has higher charges.
            </p>
          </div>
        </div>
      )}
      
      {/* Account Status Modal - Simplified */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-sm w-full">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <AlertCircle size={20} className="text-red-500 mr-2" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {accountStatus === 'pending' ? 'Account Pending' : 
                   accountStatus === 'disabled' ? 'Account Disabled' : 
                   'Account Not Approved'}
                </h2>
              </div>
              <button 
                onClick={() => setShowApprovalModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            
            {accountStatus === 'disabled' ? (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                {disableReason}
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {accountStatus === 'pending' ? 
                    'Pay 100 GHS to activate your account:' : 
                    'Your account needs approval. Pay 100 GHS to:'}
                </p>
                
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-medium">MoMo:</span> 0597760914
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-medium">Name:</span> KOJO Frimpong
                    </p>
                  </div>
                  <button 
                    onClick={copyMomoNumber}
                    className="text-blue-600 p-1"
                  >
                    <Copy size={16} />
                    {copySuccess && <span className="text-xs text-green-500 ml-1">{copySuccess}</span>}
                  </button>
                </div>
                
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-3">
                  Use your email/phone as payment reference
                </p>
              </>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-3 rounded text-sm"
              >
                Close
              </button>
              
              <a
                href="mailto:datamartghana@gmail.com"
                className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded text-center text-sm"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Deposit Funds</h1>
        <Link 
          href="/howtodeposite" 
          className="flex items-center text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full"
        >
          <Info size={14} className="mr-1" />
          Help
        </Link>
      </div>
      
      {/* Info banner - simplified */}
      <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs">
        <div className="flex items-center">
          <Info size={16} className="text-yellow-600 dark:text-yellow-500 mr-2 flex-shrink-0" />
          <p className="text-yellow-800 dark:text-yellow-300">
            Need help? <Link href="/howtodeposite" className="underline font-medium">View deposit guide</Link>
          </p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-3 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 text-green-700 dark:text-green-300 px-3 py-2 rounded mb-4 text-sm">
          {success}
        </div>
      )}
      
      <form onSubmit={handleDeposit}>
        <div className="mb-4">
          <label htmlFor="amount" className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">
            Amount (GHS)
          </label>
          <input
            type="number"
            id="amount"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="0.01"
            required
          />
        </div>
        
        {amount && amount > 0 && (
          <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
            <div className="flex justify-between mb-1 text-gray-700 dark:text-gray-300">
              <span>Amount:</span>
              <span>GHS {parseFloat(amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-1 text-gray-700 dark:text-gray-300">
              <span>Fee (3%):</span>
              <span>GHS {fee}</span>
            </div>
            <div className="flex justify-between font-bold border-t dark:border-gray-600 pt-1 mt-1 text-gray-700 dark:text-gray-200">
              <span>Total:</span>
              <span>GHS {totalAmount}</span>
            </div>
          </div>
        )}
        
        <button
          type="submit"
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Deposit Now'}
        </button>
      </form>
      
      <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
        <p>• 3% processing fee applies to all deposits</p>
        <p>• Payments processed securely via Paystack</p>
        <Link 
          href="/myorders" 
          className="text-blue-600 dark:text-blue-400 hover:underline mt-2 block"
        >
          View deposit history
        </Link>
      </div>
    </div>
  );
}