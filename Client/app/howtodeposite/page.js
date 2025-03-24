'use client'
import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

const DepositSuccessGuide = () => {
  return (
    <div className="max-w-md mx-auto my-6 p-6 bg-white rounded-lg shadow-md">
      <button 
        onClick={() => window.history.back()} 
        className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </button>
      <h1 className="text-2xl font-bold mb-4 text-center">How to Complete Your Deposit Successfully</h1>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="text-blue-500 mt-1 mr-3" size={20} />
          <p className="text-sm text-blue-700">
            Follow these steps carefully to ensure your deposit is processed correctly.
          </p>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2 flex items-center">
            <span className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-sm">1</span>
            Complete Payment on Paystack
          </h2>
          <p className="text-sm text-gray-600 mb-2">
            After clicking "Deposit Now", you'll be redirected to Paystack's secure payment page.
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
            <div className="flex">
              <AlertTriangle className="text-yellow-500 mr-2" size={18} />
              <p className="text-xs text-yellow-700">
                <strong>Important:</strong> Always click the "I've completed my payment" button on Paystack after your payment is processed. Failure to do this may result in your account not being credited.
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2 flex items-center">
            <span className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-sm">2</span>
            Verify Transaction Status
          </h2>
                      <p className="text-sm text-gray-600 mb-2">
            After payment, you'll be redirected back to our platform. You can check your transaction status in the <a href="/myorders" className="text-blue-600 hover:text-blue-800 font-medium">My Orders</a> section.
          </p>
          <div className="flex mt-2">
            <ArrowRight className="text-gray-500 mr-2" size={16} />
            <p className="text-sm text-gray-700">
              Your funds should be credited to your wallet immediately after successful payment verification.
            </p>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2 flex items-center">
            <span className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-sm">3</span>
            If Your Payment Is Not Credited
          </h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>If your payment is successful but your account is not credited:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Check the transaction in the <a href="/myorders" className="text-blue-600 hover:text-blue-800">My Orders</a> section</li>
              <li>Verify if the payment status shows as "completed"</li>
              <li>If payment shows as "pending" for more than 15 minutes, contact admin immediately</li>
            </ol>
            <div className="bg-red-50 border-l-4 border-red-400 p-3 mt-2">
              <div className="flex">
                <AlertTriangle className="text-red-500 mr-2" size={18} />
                <p className="text-xs text-red-700">
                  <strong>Important:</strong> Contact admin immediately if you encounter any issues. Delays in reporting payment problems may affect our ability to resolve them quickly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircle className="text-green-500 mr-3" size={20} />
          <div>
            <h3 className="font-semibold text-green-800 text-sm">Successful Deposit</h3>
            <p className="text-xs text-green-700 mt-1">
              When your deposit is successful, your wallet balance will update automatically and you'll see your transaction in your history with a "completed" status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositSuccessGuide;