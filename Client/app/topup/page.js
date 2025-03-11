// pages/deposit.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function DepositPage() {
  const [amount, setAmount] = useState('');
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
      const authStatus = sessionStorage.getItem('isAuthenticated');
      const userData = localStorage.getItem('userData');
      
      if (authStatus === 'true' && userData) {
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
      // Call the deposit API endpoint
      const response = await axios.post('https://datamartbackened.onrender.com/api/v1/deposit', {
        userId,
        amount: parseFloat(amount),
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
    return <div className="flex justify-center items-center min-h-screen">Checking authentication...</div>;
  }
  
  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Deposit Funds</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleDeposit}>
        <div className="mb-4">
          <label htmlFor="amount" className="block text-gray-700 text-sm font-bold mb-2">
            Amount (GHS)
          </label>
          <input
            type="number"
            id="amount"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="0.01"
            required
          />
        </div>
        
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
      
      <div className="mt-6 text-sm text-gray-600">
        <p>• Payments are processed securely via Paystack</p>
        <p>• Funds will be available in your wallet immediately after successful payment</p>
        <p>• For any issues, please contact support</p>
      </div>
    </div>
  );
}