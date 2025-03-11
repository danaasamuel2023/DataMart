'use client'

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

// Create a client component that uses useSearchParams
function PaymentCallbackClient() {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Verifying your payment...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  
  useEffect(() => {
    // Only proceed if we have a reference from the URL
    if (reference) {
      const verifyPayment = async () => {
        try {
          // Call your backend to verify the payment status
          const response = await axios.get(`https://datamartbackened.onrender.com/api/v1/verify-payment?reference=${reference}`);
          
          if (response.data.success) {
            setStatus('success');
            setMessage('Your deposit was successful! Funds have been added to your wallet.');
          } else {
            setStatus('failed');
            setMessage('Payment verification failed. Please contact support for assistance.');
          }
        } catch (error) {
          console.error('Verification error:', error);
          setStatus('failed');
          setMessage('An error occurred while verifying your payment. Please contact support.');
        }
      };
      
      verifyPayment();
    }
  }, [reference]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg transform transition-all">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Payment {status.charAt(0).toUpperCase() + status.slice(1)}
          </h1>
          
          {status === 'processing' && (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex justify-center my-8">
              <div className="bg-green-100 rounded-full p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
          
          {status === 'failed' && (
            <div className="flex justify-center my-8">
              <div className="bg-red-100 rounded-full p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          )}
          
          <p className="text-lg text-gray-700 mb-8">{message}</p>
          
          {status !== 'processing' && (
            <div className="mt-8">
              <Link href="/" className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1">
                Return to Dashboard
              </Link>
            </div>
          )}
          
          {status === 'failed' && (
            <div className="mt-4">
              <Link href="/deposit" className="text-blue-500 hover:text-blue-700 font-medium">
                Try Again
              </Link>
            </div>
          )}
          
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Reference: <span className="font-mono font-medium">{reference || 'N/A'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback component to show while loading
function PaymentCallbackFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Payment Processing</h1>
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
          </div>
          <p className="text-lg text-gray-700">Loading payment details...</p>
        </div>
      </div>
    </div>
  );
}

// Main component that wraps the client component with Suspense
export default function PaymentCallback() {
  return (
    <Suspense fallback={<PaymentCallbackFallback />}>
      <PaymentCallbackClient />
    </Suspense>
  );
}