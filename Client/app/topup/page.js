// pages/deposit.js or app/topup/page.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { Info } from 'lucide-react'; // Make sure to install lucide-react

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
  
  const router = useRouter();
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = () => {
      // const authStatus = sessionStorage.getItem('isAuthenticated');
      const userData = localStorage.getItem('userData');
      
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.id);
        setUserEmail(user.email);
        setIsAuthenticated(true);
      } else {
        // Redirect to login if not authenticated
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
    
    // Basic validation
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Call the deposit API endpoint with the BASE amount (without fee)
      // but tell Paystack to charge the total amount
      const response = await axios.post('https://datamartbackened.onrender.com/api/v1/deposit', {
        userId,
        amount: parseFloat(amount), // Send the base amount WITHOUT fee
        totalAmountWithFee: parseFloat(totalAmount), // Send the total amount for Paystack to charge
        email: userEmail
      });
      
      // Handle successful response
      if (response.data.paystackUrl) {
        setSuccess('Redirecting to payment gateway...');
        // Redirect to Paystack payment page
        window.location.href = response.data.paystackUrl;
      }
    } catch (error) {
      console.error('Deposit error:', error);
      setError(error.response?.data?.error || 'Failed to process deposit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show loading or redirect if not authenticated yet
  if (!isAuthenticated) {
    return <div className="flex justify-center items-center min-h-screen text-gray-800 dark:text-gray-200">Checking authentication...</div>;
  }
  
  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-center flex-1 text-gray-900 dark:text-white">Deposit Funds</h1>
        <Link 
          href="/howtodeposite" 
          className="flex items-center text-sm px-3 py-1 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full transition-colors"
        >
          <Info size={16} className="mr-1" />
          How to Deposit
        </Link>
      </div>
      
      {/* Helpful guide banner */}
      <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start">
          <Info size={20} className="text-yellow-600 dark:text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">Not sure how to make a successful deposit?</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              Learn how to complete your payment without errors and ensure your account is credited properly.
            </p>
            <Link 
              href="/howtodeposite" 
              className="mt-2 inline-block text-xs font-medium px-3 py-1 bg-yellow-100 dark:bg-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200 rounded transition-colors"
            >
              View Deposit Guide
            </Link>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleDeposit}>
        <div className="mb-4">
          <label htmlFor="amount" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
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
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="flex justify-between text-sm mb-1 text-gray-700 dark:text-gray-300">
              <span>Deposit Amount:</span>
              <span>GHS {parseFloat(amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1 text-gray-700 dark:text-gray-300">
              <span>Processing Fee (3%):</span>
              <span>GHS {fee}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t dark:border-gray-600 pt-1 mt-1 text-gray-700 dark:text-gray-200">
              <span>Total Amount:</span>
              <span>GHS {totalAmount}</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Deposit Now'}
          </button>
        </div>
      </form>
      
      <div className="mt-6 text-sm text-gray-600 dark:text-gray-300">
        <p>• A 3% processing fee is applied to all deposits</p>
        <p>• Payments are processed securely via Paystack</p>
        <p>• Funds will be available in your wallet immediately after successful payment</p>
        <p>• For any issues, please contact support</p>
        <p className="mt-2">
          <Link 
            href="/myorders" 
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
          >
            Check your deposit history
          </Link>
        </p>
      </div>
    </div>
  );
}