'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Hourglass, 
  AlertOctagon, 
  MessageCircle, 
  Phone, 
  Search,
  ArrowLeft,
  ArrowRight,
  Filter,
  X,
  Moon,
  Sun
} from 'lucide-react';
import Link from 'next/link';

export default function VerificationHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
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
    
    // Fetch verification history
    fetchHistory(user.id);
  }, [router, pagination.page, statusFilter]);

  const fetchHistory = async (userId) => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        userId,
        page: pagination.page,
        limit: pagination.limit
      });
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      // Fetch verification history
      const response = await fetch(`https://datamartbackened.onrender.com/api/verifications/history?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Filter by search term if present (client-side filtering)
      let filteredData = data.verifications;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter(verification => 
          verification.serviceName.toLowerCase().includes(searchLower) || 
          verification.phoneNumber?.toLowerCase().includes(searchLower) ||
          verification.verificationCode?.toLowerCase().includes(searchLower)
        );
      }
      
      setHistory(filteredData);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching verification history:', err);
      setError('Failed to load verification history. Please try again.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination({ ...pagination, page: newPage });
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPagination({ ...pagination, page: 1 }); // Reset to first page
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const refreshHistory = () => {
    const userData = localStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    
    if (user && user.id) {
      fetchHistory(user.id);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <Clock size={12} className="mr-1" />
            Active
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 size={12} className="mr-1" />
            Verified
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <XCircle size={12} className="mr-1" />
            Failed
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            <X size={12} className="mr-1" />
            Canceled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <Hourglass size={12} className="mr-1" />
            Expired
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
            <RefreshCw size={12} className="mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            <AlertOctagon size={12} className="mr-1" />
            {status}
          </span>
        );
    }
  };

  const getCapabilityIcon = (serviceName, item) => {
    // Check if we have explicit capability information in the item
    if (item.capability) {
      if (item.capability.toLowerCase() === 'voice') {
        return <Phone size={16} className="text-purple-600 dark:text-purple-400" />;
      } else {
        return <MessageCircle size={16} className="text-blue-600 dark:text-blue-400" />;
      }
    }
    
    // Otherwise infer from service name (this is a fallback and might not be 100% accurate)
    if (serviceName.toLowerCase().includes('voice') || serviceName.toLowerCase().includes('call')) {
      return <Phone size={16} className="text-purple-600 dark:text-purple-400" />;
    } else {
      return <MessageCircle size={16} className="text-blue-600 dark:text-blue-400" />;
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
      minute: '2-digit'
    }).format(date);
  };
  
  const getStatusFilters = () => {
    return [
      { label: 'All', value: '' },
      { label: 'Active', value: 'active' },
      { label: 'Verified', value: 'verified' },
      { label: 'Failed', value: 'failed' },
      { label: 'Canceled', value: 'canceled' },
      { label: 'Expired', value: 'expired' },
      { label: 'Pending', value: 'pending' }
    ];
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <Head>
        <title>Verification History</title>
      </Head>
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Verification History</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              View your past and current phone verification requests
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button
              onClick={() => router.push('/verification-services')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors"
            >
              New Verification
            </button>
          </div>
        </div>
        
        {/* Filters and Search */}
        <div className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center">
                <Filter size={16} className="mr-2 text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Status:</span>
              </div>
              
              {getStatusFilters().map(filter => (
                <button
                  key={filter.value || 'all'}
                  onClick={() => handleStatusFilterChange(filter.value)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-indigo-100 text-indigo-700 font-medium dark:bg-indigo-900/40 dark:text-indigo-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            
            {/* Spacer/Divider for Mobile */}
            <div className="hidden md:block md:h-6 md:w-px md:bg-slate-200 dark:md:bg-slate-700 md:mx-3"></div>
            <div className="block md:hidden w-full border-t border-slate-200 dark:border-slate-700 my-2"></div>
            
            {/* Search Box */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search service name, phone number..."
                className="block w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-colors"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X size={16} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
                </button>
              )}
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={refreshHistory}
              className="inline-flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 shadow-sm text-sm leading-4 font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md mb-6 flex items-start">
            <AlertTriangle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : (
          <>
            {history.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No verification history found</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {statusFilter 
                    ? `No verifications with status "${statusFilter}" found.` 
                    : (searchTerm 
                        ? `No results matching "${searchTerm}".` 
                        : "You haven't requested any phone verifications yet.")}
                </p>
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setSearchTerm('');
                    refreshHistory();
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors"
                >
                  Clear Filters & Refresh
                </button>
              </div>
            ) : (
              <>
                {/* Verification History Table */}
                <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-lg border border-slate-200 dark:border-slate-700">
                  {/* Table Header - Only on Medium+ screens */}
                  <div className="hidden md:grid md:grid-cols-6 px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Number</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expires</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="md:grid md:grid-cols-6 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        {/* Service Name - Mobile & Desktop */}
                        <div className="flex items-center mb-3 md:mb-0">
                          <div className="mr-2">
                            {getCapabilityIcon(item.serviceName, item)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {item.serviceName}
                            </div>
                            {item.verificationCode && (
                              <div className="md:hidden mt-1">
                                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Code:</span>{' '}
                                <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-300">
                                  {item.verificationCode}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Phone Number */}
                        <div className="mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                            Phone Number
                          </div>
                          <div className="text-sm text-slate-900 dark:text-white font-mono">
                            {item.phoneNumber || 'N/A'}
                          </div>
                        </div>
                        
                        {/* Status */}
                        <div className="mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                            Status
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                        
                        {/* Created Date */}
                        <div className="mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                            Created
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {formatDate(item.createdAt)}
                          </div>
                        </div>
                        
                        {/* Expires Date */}
                        <div className="mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                            Expires
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {formatDate(item.expiresAt)}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div>
                          <div className="md:hidden text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                            Actions
                          </div>
                          <div className="flex space-x-2">
                            <Link 
                              href={`/verification/${item.id}`}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    {/* Mobile Pagination */}
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                          pagination.page === 1
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed border-slate-300 dark:border-slate-700'
                            : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600'
                        } transition-colors`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                          pagination.page === pagination.totalPages
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed border-slate-300 dark:border-slate-700'
                            : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600'
                        } transition-colors`}
                      >
                        Next
                      </button>
                    </div>
                    
                    {/* Desktop Pagination */}
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-400">
                          Showing <span className="font-medium text-slate-900 dark:text-white">{history.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to{' '}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                          </span>{' '}
                          of <span className="font-medium text-slate-900 dark:text-white">{pagination.total}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                              pagination.page === 1
                                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed border-slate-300 dark:border-slate-700'
                                : 'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600'
                            } transition-colors`}
                          >
                            <span className="sr-only">Previous</span>
                            <ArrowLeft size={16} />
                          </button>
                          
                          {/* Page Numbers */}
                          {[...Array(pagination.totalPages).keys()].map((page) => {
                            const pageNumber = page + 1;
                            const isCurrentPage = pageNumber === pagination.page;
                            
                            // Show first page, last page, and 1 page before and after current page
                            if (
                              pageNumber === 1 || 
                              pageNumber === pagination.totalPages || 
                              (pageNumber >= pagination.page - 1 && pageNumber <= pagination.page + 1)
                            ) {
                              return (
                                <button
                                  key={pageNumber}
                                  onClick={() => handlePageChange(pageNumber)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    isCurrentPage
                                      ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-400'
                                      : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:border-slate-600'
                                  } transition-colors`}
                                >
                                  {pageNumber}
                                </button>
                              );
                            } else if (
                              (pageNumber === 2 && pagination.page > 3) || 
                              (pageNumber === pagination.totalPages - 1 && pagination.page < pagination.totalPages - 2)
                            ) {
                              // Show ellipsis
                              return (
                                <span
                                  key={pageNumber}
                                  className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-400"
                                >
                                  ...
                                </span>
                              );
                            } else {
                              return null;
                            }
                          })}
                          
                          <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                              pagination.page === pagination.totalPages
                                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed border-slate-300 dark:border-slate-700'
                                : 'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600'
                            } transition-colors`}
                          >
                            <span className="sr-only">Next</span>
                            <ArrowRight size={16} />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}