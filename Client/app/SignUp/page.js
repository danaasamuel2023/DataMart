'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  RefreshCw, 
  ArrowRight,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle,
  Zap,
  Star,
  Flame
} from 'lucide-react';

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
      <div className={`p-4 rounded-2xl shadow-2xl flex items-center backdrop-blur-xl border ${
        type === 'success' 
          ? 'bg-gradient-to-r from-emerald-500/90 to-teal-600/90 text-white border-emerald-400/50' 
          : type === 'error' 
            ? 'bg-gradient-to-r from-red-500/90 to-red-600/90 text-white border-red-400/50' 
            : 'bg-gradient-to-r from-yellow-500/90 to-orange-600/90 text-white border-yellow-400/50'
      }`}>
        <div className="mr-3">
          {type === 'success' ? (
            <CheckCircle className="h-6 w-6" />
          ) : type === 'error' ? (
            <X className="h-6 w-6" />
          ) : (
            <AlertTriangle className="h-6 w-6" />
          )}
        </div>
        <div className="flex-grow">
          <p className="font-bold">{message}</p>
        </div>
        <button onClick={onClose} className="ml-4 hover:scale-110 transition-transform">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

// Registration Closed Modal Component
const RegistrationClosedModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 w-full max-w-md shadow-2xl">
        {/* Modal header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 rounded-t-3xl flex justify-between items-center">
          <h3 className="text-2xl font-black text-white flex items-center">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mr-3">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            Registration Closed
          </h3>
          <button onClick={onClose} className="text-white hover:text-white/70 p-2 rounded-xl hover:bg-white/10 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Modal content */}
        <div className="px-8 py-6">
          <div className="flex items-start mb-6">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center mr-4 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-white/90 font-medium text-lg mb-2">
                We're sorry, but new registrations are currently closed.
              </p>
              <p className="text-white/70 font-medium">
                Please check back later or contact our support team for more information.
              </p>
            </div>
          </div>
        </div>
        
        {/* Modal footer */}
        <div className="px-8 py-6 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-2xl transition-all transform hover:scale-105"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SignupPage() {
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
  const [showModal, setShowModal] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success'
  });

  // Add CSS for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translate3d(0, -20px, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }
      .animate-fade-in-down {
        animation: fadeInDown 0.5s ease-out;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Function to show toast
  const showToast = (message, type = 'success') => {
    setToast({
      visible: true,
      message,
      type
    });
  };

  // Function to hide toast
  const hideToast = () => {
    setToast(prev => ({
      ...prev,
      visible: false
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignup = async () => {
    setError('');
    
    // Check if registration is closed
    if (isRegistrationClosed) {
      setShowModal(true);
      return;
    }
    
    setIsSubmitting(true);

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      showToast("Passwords do not match", "error");
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
        showToast("Registration successful! Redirecting to login...", "success");
        // Use a direct, synchronous approach for navigation
        setTimeout(() => {
          try {
            // Force a hard navigation instead of client-side navigation
            window.location.href = '/SignIn';
          } catch (err) {
            console.error("Navigation error:", err);
            showToast("Registration successful. Please go to the login page to continue.", "success");
          }
        }, 2000);
      } else {
        setError(data.message || 'Signup failed');
        showToast(data.message || 'Signup failed', 'error');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An error occurred. Please try again.');
      showToast('An error occurred. Please try again.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-400/10 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/10 to-pink-400/10 blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-400/5 to-blue-400/5 blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Toast Notification */}
      {toast.visible && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* Registration Closed Modal */}
      <RegistrationClosedModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />

      <div className="relative z-10 w-full max-w-md">
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
            
            <div className="relative z-10 text-center">
              {/* DataHustle Logo */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-xl">
                  <div className="text-center">
                    <Zap className="w-8 h-8 text-white mx-auto mb-1" strokeWidth={3} />
                    <div className="text-white font-black text-xs">HUSTLE</div>
                  </div>
                </div>
              </div>
              
              <h1 className="text-4xl font-black text-white mb-2">DATAHUSTLE</h1>
              <p className="text-white/90 text-lg font-medium">Create Your Account</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8">
            {/* Registration Closed Warning */}
            {isRegistrationClosed && (
              <div className="mb-6 p-4 rounded-2xl flex items-start bg-gradient-to-r from-yellow-100/10 to-orange-200/10 border border-yellow-500/30 backdrop-blur-sm">
                <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <span className="text-yellow-200 font-bold text-sm">Registration is currently closed. Form is disabled.</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl flex items-start bg-gradient-to-r from-red-100/10 to-red-200/10 border border-red-500/30 backdrop-blur-sm">
                <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                  <X className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-red-200 font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-5">
              {/* Full Name Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <input 
                  type="text" 
                  name="name"
                  placeholder="Full Name" 
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-12 pr-4 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                  required 
                  disabled={isSubmitting || isRegistrationClosed}
                />
              </div>

              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-emerald-400" />
                </div>
                <input 
                  type="email" 
                  name="email"
                  placeholder="Email Address" 
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-12 pr-4 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                  required 
                  disabled={isSubmitting || isRegistrationClosed}
                />
              </div>

              {/* Phone Number Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="w-5 h-5 text-emerald-400" />
                </div>
                <input 
                  type="tel" 
                  name="phoneNumber"
                  placeholder="Phone Number" 
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="pl-12 pr-4 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                  required 
                  disabled={isSubmitting || isRegistrationClosed}
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <input 
                  type="password" 
                  name="password"
                  placeholder="Password" 
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-12 pr-4 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                  required 
                  disabled={isSubmitting || isRegistrationClosed}
                />
              </div>

              {/* Confirm Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <input 
                  type="password" 
                  name="confirmPassword"
                  placeholder="Confirm Password" 
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-12 pr-4 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                  required 
                  disabled={isSubmitting || isRegistrationClosed}
                />
              </div>

              {/* Referral Code Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <RefreshCw className="w-5 h-5 text-emerald-400" />
                </div>
                <input 
                  type="text" 
                  name="referralCode"
                  placeholder="Referral Code (Optional)" 
                  value={formData.referralCode}
                  onChange={handleChange}
                  className="pl-12 pr-4 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                  disabled={isSubmitting || isRegistrationClosed}
                />
              </div>

              {/* Submit Button */}
              <button 
                onClick={handleSignup}
                className={`w-full flex items-center justify-center py-4 px-6 rounded-2xl shadow-xl text-white font-bold text-lg transition-all duration-300 transform ${
                  (isSubmitting || isRegistrationClosed)
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 opacity-60 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-500/50'
                }`}
                disabled={isSubmitting || isRegistrationClosed}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-3 w-6 h-6" />
                    Creating Account...
                  </>
                ) : isRegistrationClosed ? (
                  <>
                    <AlertTriangle className="mr-3 w-6 h-6" />
                    Registration Closed
                  </>
                ) : (
                  <>
                    <Zap className="mr-3 w-6 h-6" />
                    Create Account
                    <ArrowRight className="ml-3 w-6 h-6" />
                  </>
                )}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center mt-6">
              <p className="text-white/70 font-medium">
                Already have an account? 
                <a href="/SignIn" className="text-emerald-400 hover:text-emerald-300 ml-2 font-bold hover:underline transition-colors">
                  Login
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}