'use client';

import React, { useState, useEffect } from 'react';
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
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDISdw92MR4szyoVbfjIzpTB4H8_2SFmdc",
  authDomain: "datamartgh-7c16d.firebaseapp.com",
  projectId: "datamartgh-7c16d",
  storageBucket: "datamartgh-7c16d.firebasestorage.app",
  messagingSenderId: "939899814782",
  appId: "1:939899814782:web:6fc141999a71e673d9e92f",
  measurementId: "G-MQGQRZHFHQ"
};

// Initialize Firebase
let app;
let auth;
let googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  
  // Add additional scopes
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
  
  // Force account selection
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
} catch (error) {
  console.error("Firebase initialization error:", error);
}

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Registration closed state
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // Check for referral code in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    if (referralCode) {
      setFormData(prev => ({ ...prev, referralCode }));
      // Store it for potential Google sign-up
      localStorage.setItem('referralCode', referralCode);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Generate device ID for tracking
  const generateDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const handleGoogleSignUp = async () => {
    if (isRegistrationClosed) {
      setError("Registration is currently closed. Please try again later.");
      setShowPopup(true);
      return;
    }

    setError('');
    setIsGoogleLoading(true);

    try {
      // Sign in with Google popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Get the ID token
      const idToken = await user.getIdToken();

      // Get device info
      const deviceInfo = {
        deviceId: generateDeviceId(),
        userAgent: navigator.userAgent
      };

      // Send to your backend
      const response = await fetch('https://datamartbackened.onrender.com/api/v1/google-signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          deviceInfo,
          referredBy: formData.referralCode || localStorage.getItem('referralCode')
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data
        localStorage.setItem('authToken', data.token);
        
        if (data.user) {
          localStorage.setItem('userData', JSON.stringify({
            id: data.user._id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            authProvider: data.user.authProvider,
            profilePicture: data.user.profilePicture
          }));
        }

        // Clear referral code after successful use
        localStorage.removeItem('referralCode');

        // Redirect based on user status
        if (data.user.isNewUser) {
          window.location.href = '/welcome'; // Or your onboarding page
        } else {
          window.location.href = '/';
        }
      } else {
        setError(data.message || 'Google sign-up failed');
      }
    } catch (err) {
      console.error('Google sign-up error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-up cancelled');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError('Google sign-up failed. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
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
        // Clear referral code after successful use
        localStorage.removeItem('referralCode');
        
        // Use a direct, synchronous approach for navigation
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

          {/* Google Sign-Up Button */}
          <button
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading || isRegistrationClosed}
            className={`w-full flex items-center justify-center px-4 py-3 border rounded-lg font-medium transition-all duration-200 mb-4 ${
              isRegistrationClosed
                ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
            } ${isGoogleLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {isGoogleLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </>
            )}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or sign up with email</span>
            </div>
          </div>

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