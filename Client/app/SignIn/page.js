'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  Star,
  Flame,
  Eye,
  EyeOff
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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
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

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('https://datamartbackened.onrender.com/api/v1/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token securely
        localStorage.setItem('authToken', data.token);
        
        // Store user info if provided
        if (data.user) {
          localStorage.setItem('userData', JSON.stringify({
            id: data.user._id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role
          }));
        }

        showToast('Login successful! Redirecting to dashboard...', 'success');
        
        // Redirect to dashboard after showing success message
        setTimeout(() => {
          try {
            // Force a hard navigation instead of client-side navigation
            window.location.href = '/';
          } catch (err) {
            console.error("Navigation error:", err);
            showToast('Login successful. Please navigate to the dashboard.', 'success');
          }
        }, 2000);
      } else {
        setError(data.message || 'Login failed');
        showToast(data.message || 'Login failed', 'error');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setIsLoading(false);
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
              <p className="text-white/90 text-lg font-medium">Welcome Back</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8">
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
              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-emerald-400" />
                </div>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 pr-4 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 py-4 block w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-white/50 hover:text-white/80 transition-colors" />
                  ) : (
                    <Eye className="w-5 h-5 text-white/50 hover:text-white/80 transition-colors" />
                  )}
                </button>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-white/20 rounded bg-white/10 backdrop-blur-sm"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-white/80 font-medium">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a href="/reset" className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors">
                    Forgot password?
                  </a>
                </div>
              </div>

              {/* Login Button */}
              <button
                onClick={handleLogin}
                disabled={isLoading || !email || !password}
                className="w-full flex items-center justify-center py-4 px-6 rounded-2xl shadow-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-bold text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-3 w-6 h-6" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Zap className="mr-3 w-6 h-6" />
                    Sign In
                    <ArrowRight className="ml-3 w-6 h-6" />
                  </>
                )}
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center mt-6">
              <p className="text-white/70 font-medium">
                Don't have an account? 
                <a href="/SignUp" className="text-emerald-400 hover:text-emerald-300 ml-2 font-bold hover:underline transition-colors">
                  Sign Up
                </a>
              </p>
            </div>

            {/* Additional Features */}
            <div className="mt-8 p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl backdrop-blur-sm">
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center mr-4 flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-emerald-400 mb-2">Secure Access</h4>
                  <div className="space-y-1 text-white/80 text-sm font-medium">
                    <p>• Your data is encrypted and secure</p>
                    <p>• Fast and reliable service</p>
                    <p>• 24/7 customer support available</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}