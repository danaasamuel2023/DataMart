'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  RefreshCw, 
  ArrowRight,
  Loader2,
  X,
  AlertTriangle
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    referralCode: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Registration closed state
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    
    // Check if registration is closed
    if (isRegistrationClosed) {
      setError("Registration is currently closed. Please try again later.");
      setShowPopup(true);
      return;
    }
    
    setIsSubmitting(true);

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('https://datamartbackened.onrender.com/api/v1/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phoneNumber: formData.phoneNumber,
          referredBy: formData.referralCode
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Use a direct, synchronous approach for navigation
        // Try router.push first
        try {
          // Force a hard navigation instead of client-side navigation
          window.location.href = '/SignIn';
        } catch (err) {
          console.error("Navigation error:", err);
          alert("Registration successful. Please go to the login page to continue.");
        }
      } else {
        setError(data.message || 'Signup failed');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
      {/* Registration Closed Popup */}
      {isRegistrationClosed && showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <AlertTriangle className="text-yellow-500 mr-2" size={24} />
                Registration Closed
              </h3>
              <button 
                onClick={closePopup}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300">
                We're sorry, but new registrations are currently closed. Please check back later or contact our support team for more information.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={closePopup}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-xl overflow-hidden">
        <div className="p-8">
          {/* Datamart Logo */}
          <div className="flex justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" className="h-16 w-auto">
              {/* Background shape */}
              <rect x="10" y="10" width="180" height="40" rx="8" fill="#f0f8ff" stroke="#2c5282" strokeWidth="2" className="dark:fill-gray-700"/>
              
              {/* "Data" text */}
              <text x="30" y="37" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="22" fill="#2c5282" className="dark:fill-blue-300">Data</text>
              
              {/* "mart" text */}
              <text x="85" y="37" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="22" fill="#3182ce" className="dark:fill-blue-200">mart</text>
              
              {/* Database icon */}
              <g transform="translate(150, 30) scale(0.7)">
                <circle cx="0" cy="0" r="12" fill="#3182ce" className="dark:fill-blue-400"/>
                <path d="M-8,-2 L8,-2 M-8,2 L8,2" stroke="white" strokeWidth="2" fill="none"/>
                <ellipse cx="0" cy="-6" rx="8" ry="3" fill="none" stroke="white" strokeWidth="2"/>
                <ellipse cx="0" cy="6" rx="8" ry="3" fill="none" stroke="white" strokeWidth="2"/>
              </g>
              
              {/* Search icon elements */}
              <circle cx="15" cy="30" r="3" fill="#3182ce" opacity="0.7" className="dark:fill-blue-300"/>
              <circle cx="185" cy="30" r="3" fill="#3182ce" opacity="0.7" className="dark:fill-blue-300"/>
            </svg>
          </div>
          
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
            Create Account
          </h2>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-4" role="alert">
              {error}
            </div>
          )}

          {isRegistrationClosed && (
            <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-200 px-4 py-3 rounded relative mb-4" role="alert">
              Registration is currently closed. Form is disabled.
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="text" 
                name="name"
                placeholder="Full Name" 
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required 
                disabled={isSubmitting || isRegistrationClosed}
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="email" 
                name="email"
                placeholder="Email Address" 
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required 
                disabled={isSubmitting || isRegistrationClosed}
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="tel" 
                name="phoneNumber"
                placeholder="Phone Number" 
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required 
                disabled={isSubmitting || isRegistrationClosed}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="password" 
                name="password"
                placeholder="Password" 
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required 
                disabled={isSubmitting || isRegistrationClosed}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="password" 
                name="confirmPassword"
                placeholder="Confirm Password" 
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required 
                disabled={isSubmitting || isRegistrationClosed}
              />
            </div>
            <div className="relative">
              <RefreshCw className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="text" 
                name="referralCode"
                placeholder="Referral Code (Optional)" 
                value={formData.referralCode}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                disabled={isSubmitting || isRegistrationClosed}
              />
            </div>
            <button 
              type="submit" 
              className={`w-full text-white py-2 rounded-lg transition flex items-center justify-center 
                ${(isSubmitting || isRegistrationClosed)
                  ? 'bg-blue-400 dark:bg-blue-600 opacity-60 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 active:bg-blue-800 active:transform active:scale-95'}`}
              disabled={isSubmitting || isRegistrationClosed}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Signing Up...
                </>
              ) : isRegistrationClosed ? (
                <>
                  Registration Closed <AlertTriangle className="ml-2" size={20} />
                </>
              ) : (
                <>
                  Sign Up <ArrowRight className="ml-2" size={20} />
                </>
              )}
            </button>
          </form>
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Already have an account? 
              <Link href="/SignIn" className="text-blue-600 dark:text-blue-400 ml-1 hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}