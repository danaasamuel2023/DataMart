// pages/verification-history.js
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
  X
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
  const router = useRouter();

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
      const response = await fetch(`http://localhost:5000/api/verifications/history?${params}`);
      
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock size={12} className="mr-1" />
            Active
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 size={12} className="mr-1" />
            Verified
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={12} className="mr-1" />
            Failed
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <X size={12} className="mr-1" />
            Canceled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Hourglass size={12} className="mr-1" />
            Expired
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <RefreshCw size={12} className="mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
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
        return <Phone size={16} className="text-purple-600" />;
      } else {
        return <MessageCircle size={16} className="text-blue-600" />;
      }
    }
    
    // Otherwise infer from service name (this is a fallback and might not be 100% accurate)
    if (serviceName.toLowerCase().includes('voice') || serviceName.toLowerCase().includes('call')) {
      return <Phone size={16} className="text-purple-600" />;
    } else {
      return <MessageCircle size={16} className="text-blue-600" />;
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
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Verification History</title>
      </Head>
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Verification History</h1>
            <p className="mt-2 text-slate-600">
              View your past and current phone verification requests
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => router.push('/verification-services')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              New Verification
            </button>
          </div>
        </div>
        
        {/* Filters and Search */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center">
                <Filter size={16} className="mr-2 text-slate-500" />
                <span className="text-sm text-slate-700">Status:</span>
              </div>
              
              {getStatusFilters().map(filter => (
                <button
                  key={filter.value || 'all'}
                  onClick={() => handleStatusFilterChange(filter.value)}
                  className={`px-2.5 py-1 text-xs rounded-full ${
                    statusFilter === filter.value
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            
            {/* Spacer/Divider for Mobile */}
            <div className="hidden md:block md:h-6 md:w-px md:bg-slate-200 md:mx-3"></div>
            <div className="block md:hidden w-full border-t border-slate-200 my-2"></div>
            
            {/* Search Box */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search service name, phone number..."
                className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X size={16} className="text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={refreshHistory}
              className="inline-flex items-center px-3 py-2 border border-slate-300 shadow-sm text-sm leading-4 font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-start">
            <AlertTriangle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {history.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
                <h3 className="text-lg font-medium text-slate-900 mb-2">No verification history found</h3>
                <p className="text-slate-600 mb-4">
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
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Clear Filters & Refresh
                </button>
              </div>
            ) : (
              <>
                {/* Verification History Table */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-slate-200">
                  {/* Table Header - Only on Medium+ screens */}
                  <div className="hidden md:grid md:grid-cols-6 px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Service</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Phone Number</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Created</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expires</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-slate-200">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="md:grid md:grid-cols-6 px-4 py-4 hover:bg-slate-50"
                      >
                        {/* Service Name - Mobile & Desktop */}
                        <div className="flex items-center mb-3 md:mb-0">
                          <div className="mr-2">
                            {getCapabilityIcon(item.serviceName, item)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {item.serviceName}
                            </div>
                            {item.verificationCode && (
                              <div className="md:hidden mt-1">
                                <span className="text-xs text-slate-600 font-medium">Code:</span>{' '}
                                <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.verificationCode}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Phone Number */}
                        <div className="mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-slate-500 uppercase mb-1">
                            Phone Number
                          </div>
                          <div className="text-sm text-slate-900 font-mono">
                            {item.phoneNumber || 'N/A'}
                          </div>
                        </div>
                        
                        {/* Status */}
                        <div className="mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-slate-500 uppercase mb-1">
                            Status
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                        
                        {/* Created Date */}
                        <div className="mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-slate-500 uppercase mb-1">
                            Created
                          </div>
                          <div className="text-sm text-slate-600">
                            {formatDate(item.createdAt)}
                          </div>
                        </div>
                        
                        {/* Expires Date */}
                        <div className="mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-slate-500 uppercase mb-1">
                            Expires
                          </div>
                          <div className="text-sm text-slate-600">
                            {formatDate(item.expiresAt)}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div>
                          <div className="md:hidden text-xs font-medium text-slate-500 uppercase mb-1">
                            Actions
                          </div>
                          <div className="flex space-x-2">
                            <Link 
                              href={`/verification/${item.id}`}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className={`relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md ${
                          pagination.page === 1
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className={`relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md ${
                          pagination.page === pagination.totalPages
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-700">
                          Showing <span className="font-medium">{history.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to{' '}
                          <span className="font-medium">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                          </span>{' '}
                          of <span className="font-medium">{pagination.total}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 text-sm font-medium ${
                              pagination.page === 1
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
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
                                      ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                      : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                                  }`}
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
                                  className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700"
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
                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 text-sm font-medium ${
                              pagination.page === pagination.totalPages
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
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