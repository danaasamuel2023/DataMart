'use client'
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import OtpInput from '@/component/optinput';
import AuthGuard from '@/component/AuthGuide';

export default function VerifyAndReset() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isResending, setIsResending] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ''
  });

  useEffect(() => {
    if (phone) {
      setPhoneNumber(phone);
    }
  }, [phone]);

  useEffect(() => {
    if (timeLeft > 0 && !success) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, success]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const checkPasswordStrength = (password) => {
    if (!password) {
      return { score: 0, feedback: '' };
    }
    
    let score = 0;
    let feedback = '';
    
    // Length check
    if (password.length < 8) {
      feedback = 'Password is too short';
    } else {
      score += 1;
    }
    
    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    // Feedback based on score
    if (score === 2) feedback = 'Weak password';
    else if (score === 3) feedback = 'Fair password';
    else if (score === 4) feedback = 'Good password';
    else if (score === 5) feedback = 'Strong password';
    
    return { score, feedback };
  };

  const handlePasswordChange = (e) => {
    const newValue = e.target.value;
    setNewPassword(newValue);
    setPasswordStrength(checkPasswordStrength(newValue));
  };

  const getPasswordStrengthColor = () => {
    const { score } = passwordStrength;
    if (score <= 2) return 'bg-red-500';
    if (score === 3) return 'bg-yellow-500';
    if (score === 4) return 'bg-blue-500';
    if (score === 5) return 'bg-green-500';
    return 'bg-gray-200';
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');

    try {
      await axios.post('http://localhost:5000/api/v1/resend-password-reset-otp', {
        phoneNumber
      });
      setTimeLeft(600); // Reset timer to 10 minutes
      alert('A new verification code has been sent to your phone');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      await axios.post('http://localhost:5000/api/v1/reset-password', {
        phoneNumber,
        otp,
        newPassword
      });
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/Signin');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-center text-2xl font-bold text-gray-900">Verify and Reset</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter the verification code sent to your phone
        </p>
      </div>
      
      {success ? (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Your password has been reset successfully! Redirecting to login...
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="text-center">
            <span className={`text-sm font-medium ${timeLeft > 60 ? 'text-green-600' : 'text-red-600'}`}>
              Code expires in: {formatTime(timeLeft)}
            </span>
          </div>
          
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <OtpInput 
              length={6} 
              value={otp} 
              onChange={setOtp} 
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the 6-digit code sent to your phone
            </p>
          </div>
          
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="mt-1">
              <input
                id="new-password"
                name="newPassword"
                type="password"
                required
                minLength="8"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Create a new password"
                value={newPassword}
                onChange={handlePasswordChange}
              />
              
              {/* Password strength meter */}
              {newPassword && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${getPasswordStrengthColor()}`} 
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{passwordStrength.feedback}</p>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                minLength="8"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || timeLeft > 540} // Enable only after 1 minute
                className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? 'Resending...' : 'Resend Code'}
              </button>
              
              <Link href="/reset-password/request" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Try different number
              </Link>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading || newPassword !== confirmPassword || newPassword.length < 8 || otp.length !== 6}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting...
                  </span>
                ) : 'Reset Password'}
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Back to login
              </Link>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}