'use client';

import { useState, useEffect, useRef } from 'react';
import { use } from 'react'; // Import 'use' from React
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft,
  Copy,
  CheckCheck,
  Hourglass,
  MessageCircle,
  Phone,
  Ban,
  AlertOctagon,
  RotateCcw,
  Flag,
  Moon,
  Sun
} from 'lucide-react';
import Link from 'next/link';

export default function VerificationDetailPage({ params }) {
  // Unwrap params using React.use() if it's a Promise
  const unwrappedParams = params instanceof Promise ? use(params) : params;
  const verificationId = unwrappedParams?.id;

  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const pollingInterval = useRef(null);
  const router = useRouter();

  // Check system preference for dark mode on initial load
  useEffect(() => {
    // Check if user has a preference stored in localStorage
    const storedPreference = localStorage.getItem('darkMode');
    
    if (storedPreference !== null) {
      setDarkMode(storedPreference === 'true');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
    
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (localStorage.getItem('darkMode') === null) {
        setDarkMode(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
  };

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    
    if (!user || !user.id) {
      router.push('/login');
      return;
    }
    
    // Fetch verification details
    if (verificationId) {
      fetchVerificationDetails(verificationId, user.id);
    }
    
    // Cleanup function
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [router, verificationId]);

  const fetchVerificationDetails = async (id, userId) => {
    try {
      setLoading(true);
      
      const response = await fetch(`https://datamartbackened.onrender.com/api/verifications/${id}?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch verification details: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.verification) {
        setVerification(data.verification);
        
        // Start polling if verification is active but not yet verified
        if (data.verification.status === 'active' && !data.verification.verificationCode) {
          startPolling(id, userId);
        } else {
          stopPolling();
        }
      } else {
        throw new Error('Invalid response format');
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching verification details:', err);
      setError('Failed to load verification details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (id, userId) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    setPollingActive(true);
    
    // Poll every 5 seconds
    pollingInterval.current = setInterval(() => {
      fetchVerificationCode(id, userId);
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    setPollingActive(false);
  };

  const fetchVerificationCode = async (id, userId) => {
    try {
      const response = await fetch(`https://datamartbackened.onrender.com/api/verifications/${id}/code?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch verification code: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.verificationCode) {
        // Update verification with the code
        setVerification(prev => ({
          ...prev,
          verificationCode: data.verificationCode,
          status: 'verified'
        }));
        
        // Stop polling once code is received
        stopPolling();
      } else if (data.status && data.status !== 'active') {
        // Status changed, refresh verification details
        const userData = localStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        
        if (user && user.id) {
          fetchVerificationDetails(id, user.id);
        }
        
        stopPolling();
      }
    } catch (err) {
      console.error('Error fetching verification code:', err);
      // Continue polling despite errors
    }
  };

  const refreshVerification = () => {
    const userData = localStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    
    if (user && user.id && verificationId) {
      fetchVerificationDetails(verificationId, user.id);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  const reactivateVerification = async () => {
    await performVerificationAction('reactivate', 'Reactivating verification...');
  };

  const reportVerification = async () => {
    await performVerificationAction('report', 'Reporting verification problem...');
  };

  const cancelVerification = async () => {
    await performVerificationAction('cancel', 'Canceling verification...');
  };

  const performVerificationAction = async (action, actionMsg) => {
    try {
      setActionInProgress(true);
      setActionMessage(actionMsg);
      
      const userData = localStorage.getItem('userData');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }
      
      const response = await fetch(`https://datamartbackened.onrender.com/api/verifications/${verificationId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} verification: ${response.status} ${response.statusText}`);
      }
      
      // Refresh verification details
      fetchVerificationDetails(verificationId, user.id);
      
      setActionMessage(`${action.charAt(0).toUpperCase() + action.slice(1)} successful`);
      
      // Clear action message after a delay
      setTimeout(() => {
        setActionMessage(null);
      }, 3000);
    } catch (err) {
      console.error(`Error ${action} verification:`, err);
      setActionMessage(`Failed to ${action} verification. Please try again.`);
      
      // Clear error message after a delay
      setTimeout(() => {
        setActionMessage(null);
      }, 3000);
    } finally {
      setActionInProgress(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getTimeRemaining = (expiryDate) => {
    if (!expiryDate) return 'Unknown';
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry - now;
    
    if (diffMs <= 0) return 'Expired';
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${diffMins}m ${diffSecs}s`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <Clock size={24} className="text-blue-500 dark:text-blue-400" />;
      case 'verified':
        return <CheckCircle2 size={24} className="text-green-500 dark:text-green-400" />;
      case 'failed':
        return <XCircle size={24} className="text-red-500 dark:text-red-400" />;
      case 'canceled':
        return <Ban size={24} className="text-slate-500 dark:text-slate-400" />;
      case 'expired':
        return <Hourglass size={24} className="text-amber-500 dark:text-amber-400" />;
      case 'pending':
        return <RefreshCw size={24} className="text-purple-500 dark:text-purple-400" />;
      default:
        return <AlertOctagon size={24} className="text-slate-500 dark:text-slate-400" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300';
      case 'verified':
        return 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300';
      case 'canceled':
        return 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300';
      case 'expired':
        return 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300';
      case 'pending':
        return 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300';
    }
  };

  const getCapabilityIcon = (capability) => {
    if (capability && capability.toLowerCase() === 'voice') {
      return <Phone size={20} className="text-purple-600 dark:text-purple-400 mr-2" />;
    } else {
      return <MessageCircle size={20} className="text-blue-600 dark:text-blue-400 mr-2" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <Head>
        <title>Verification Details</title>
      </Head>
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header with back button, title and theme toggle */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/verification-history')}
              className="mr-4 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Verification Details</h1>
          </div>
          
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md mb-6 flex items-start">
            <AlertTriangle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        {actionMessage && (
          <div className={`mb-6 px-4 py-3 rounded-md flex items-center ${
            actionMessage.includes('Failed') 
              ? 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300' 
              : 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
          }`}>
            {actionMessage.includes('Failed') 
              ? <AlertTriangle size={20} className="mr-2 flex-shrink-0" />
              : <CheckCheck size={20} className="mr-2 flex-shrink-0" />
            }
            <p>{actionMessage}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : (
          <>
            {verification ? (
              <div className="space-y-6">
                {/* Status Card */}
                <div className={`p-6 rounded-lg border ${getStatusClass(verification.status)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(verification.status)}
                      <h2 className="ml-3 text-xl font-semibold">
                        {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
                      </h2>
                    </div>
                    
                    <button
                      onClick={refreshVerification}
                      disabled={actionInProgress}
                      className="p-2 rounded-md bg-white dark:bg-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <RefreshCw size={16} className={pollingActive ? 'animate-spin text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'} />
                    </button>
                  </div>
                  
                  {verification.status === 'active' && (
                    <div className="mt-3 text-sm">
                      <div className="flex items-center">
                        <Hourglass size={16} className="mr-2" />
                        <span>Time remaining: {getTimeRemaining(verification.expiresAt)}</span>
                      </div>
                      {pollingActive && (
                        <div className="mt-2 text-blue-700 dark:text-blue-300 flex items-center">
                          <RefreshCw size={14} className="animate-spin mr-2" />
                          <span>Waiting for verification code...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Verification Code Card */}
                {verification.verificationCode && (
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Verification Code</h3>
                    <div className="flex items-center">
                      <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md px-4 py-3 font-mono text-lg text-slate-900 dark:text-slate-200 flex-grow">
                        {verification.verificationCode}
                      </div>
                      <button
                        onClick={() => copyToClipboard(verification.verificationCode)}
                        className="ml-3 p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                        aria-label="Copy code"
                      >
                        {copiedCode ? <CheckCheck size={20} className="text-green-600 dark:text-green-400" /> : <Copy size={20} className="text-slate-600 dark:text-slate-300" />}
                      </button>
                    </div>
                    {copiedCode && (
                      <p className="mt-2 text-sm text-green-600 dark:text-green-400">Code copied to clipboard!</p>
                    )}
                  </div>
                )}
                
                {/* Verification Details Card */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Verification Information</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Service</h4>
                        <div className="mt-1 flex items-center">
                          {getCapabilityIcon(verification.capability || 'sms')}
                          <span className="text-slate-900 dark:text-slate-200">{verification.serviceName}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Phone Number</h4>
                        <p className="mt-1 text-slate-900 dark:text-slate-200 font-mono">{verification.phoneNumber}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Created At</h4>
                        <p className="mt-1 text-slate-900 dark:text-slate-200">{formatDate(verification.createdAt)}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Expires At</h4>
                        <p className="mt-1 text-slate-900 dark:text-slate-200">{formatDate(verification.expiresAt)}</p>
                      </div>
                    </div>
                    
                    {verification.totalCost && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Cost</h4>
                        <p className="mt-1 text-slate-900 dark:text-slate-200">${verification.totalCost.toFixed(2)} USD</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Actions Card */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Actions</h3>
                  
                  <div className="flex flex-wrap gap-3">
                    {verification.apiDetails?.canReactivate && (
                      <button
                        onClick={reactivateVerification}
                        disabled={actionInProgress}
                        className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 transition-colors"
                      >
                        <RotateCcw size={16} className="mr-2" />
                        Reactivate
                      </button>
                    )}
                    
                    {verification.apiDetails?.canReport && (
                      <button
                        onClick={reportVerification}
                        disabled={actionInProgress}
                        className="inline-flex items-center px-4 py-2 border border-amber-300 dark:border-amber-800 shadow-sm text-sm font-medium rounded-md text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-slate-800 transition-colors"
                      >
                        <Flag size={16} className="mr-2" />
                        Report Problem
                      </button>
                    )}
                    
                    {verification.apiDetails?.canCancel && (
                      <button
                        onClick={cancelVerification}
                        disabled={actionInProgress}
                        className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-800 shadow-sm text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-800 transition-colors"
                      >
                        <Ban size={16} className="mr-2" />
                        Cancel
                      </button>
                    )}
                    
                    <Link
                      href="/verification-services"
                      className="inline-flex items-center px-4 py-2 border border-indigo-600 dark:border-indigo-500 shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 transition-colors"
                    >
                      New Verification
                    </Link>
                    
                    <Link
                      href="/verification-history"
                      className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 transition-colors"
                    >
                      View All Verifications
                    </Link>
                  </div>
                  
                  {actionInProgress && (
                    <div className="mt-3 flex items-center text-sm text-slate-600 dark:text-slate-400">
                      <RefreshCw size={14} className="animate-spin mr-2" />
                      <span>Processing action...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Verification not found</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">The verification you're looking for doesn't exist or you don't have access to it.</p>
                <div className="flex justify-center space-x-4">
                  <Link
                    href="/verification-services"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 transition-colors"
                  >
                    New Verification
                  </Link>
                  <Link
                    href="/verification-history"
                    className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 transition-colors"
                  >
                    View All Verifications
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}