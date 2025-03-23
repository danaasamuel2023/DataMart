// app/not-found.js
'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function NotFound() {
  useEffect(() => {
    // You could add analytics tracking for 404 errors here
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* 404 Number */}
        <h1 className="text-9xl font-extrabold text-blue-600 tracking-widest">404</h1>
        
        {/* Error Message */}
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Try tommorow morning pls</h2>
          <p className="text-lg text-gray-600 mb-6">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
          
          {/* Back to Home Button */}
          <div className="flex flex-col space-y-4">
            <Link 
              href="/" 
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-blue-200 text-white transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg"
            >
              Back to Home
            </Link>
            
            {/* Optional Contact Support Link */}
            <Link 
              href="/contact" 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Contact Support
            </Link>
          </div>
        </div>
        
        {/* Optional: Custom Illustration or Animation */}
        <div className="mt-8 text-center">
          <div className="inline-block">
            <svg 
              className="w-32 h-32 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1" 
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              ></path>
            </svg>
            <p className="text-gray-500 mt-2">
              Lost in digital space
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}