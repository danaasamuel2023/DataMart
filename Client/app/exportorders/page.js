"use client";

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Download, 
  Filter, 
  RefreshCw, 
  Save, 
  Search, 
  CheckCircle, 
  Package, 
  Truck, 
  AlertCircle, 
  Clock4, 
  Info, 
  XCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

export default function OrdersAdmin() {
  // States
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ 
    total: 0, 
    page: 1, 
    pages: 1 
  });
  const [pageSize, setPageSize] = useState(25); // Added page size state
  const [timeUpdateModalOpen, setTimeUpdateModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllOrders, setShowAllOrders] = useState(false); // State to control showing all orders
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    network: '',
    startDate: '',
    endDate: '',
    orderId: '',
  });
  
  // Time update form state
  const [timeUpdateForm, setTimeUpdateForm] = useState({
    startTime: '',
    endTime: '',
    newStatus: 'delivered',
    currentStatuses: ['processing'],
    networks: [],
  });
  
  // Function to set current time for time updates
  const setCurrentTimeAsStart = () => {
    const now = new Date();
    // Format to YYYY-MM-DDThh:mm
    const formattedTime = now.toISOString().slice(0, 16);
    setTimeUpdateForm({...timeUpdateForm, startTime: formattedTime});
  };
  
  // Function to set current time as end time
  const setCurrentTimeAsEnd = () => {
    const now = new Date();
    // Format to YYYY-MM-DDThh:mm
    const formattedTime = now.toISOString().slice(0, 16);
    setTimeUpdateForm({...timeUpdateForm, endTime: formattedTime});
  };
  
  // Bulk action state
  const [bulkAction, setBulkAction] = useState('');
  
  // Networks list (replace with actual networks from your system)
  const networks = ['YELLO', 'Airtel', 'TELECEL', 'Etisalat', '9Mobile'];
  
  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: <Clock className="h-4 w-4 text-yellow-500" /> },
    { value: 'processing', label: 'Processing', icon: <RefreshCw className="h-4 w-4 text-blue-500" /> },
    { value: 'waiting', label: 'Waiting', icon: <Clock4 className="h-4 w-4 text-orange-500" /> },
    { value: 'completed', label: 'Completed', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
    { value: 'delivered', label: 'Delivered', icon: <Truck className="h-4 w-4 text-green-700" /> },
    { value: 'on', label: 'On', icon: <Info className="h-4 w-4 text-blue-500" /> },
    { value: 'failed', label: 'Failed', icon: <XCircle className="h-4 w-4 text-red-500" /> },
    { value: 'refunded', label: 'Refunded', icon: <AlertCircle className="h-4 w-4 text-purple-500" /> },
  ];
  
  // Fetch orders on initial load 
  useEffect(() => {
    fetchOrders();
  }, []); // Empty dependency array for initial load only
  
  // Separate effect for when pagination or filters change
  useEffect(() => {
    // Skip the initial render and only run when pagination is properly initialized
    if (pagination && !loading) {
      fetchOrders();
    }
  }, [pagination?.page, filters, loading]);
  
  // Toggle selectAll
  useEffect(() => {
    if (selectAll) {
      setSelectedIds(orders.map(order => order._id));
    } else if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    }
  }, [selectAll, orders]);
  
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      // If showing all orders, don't include pagination
      if (!showAllOrders) {
        queryParams.append('page', pagination?.page || 1);
        queryParams.append('limit', pageSize); // Use the pageSize state
      } else {
        queryParams.append('all', 'true'); // Signal to backend that we want all orders
      }
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.network) queryParams.append('network', filters.network);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.orderId) queryParams.append('orderId', filters.orderId);
      if (searchTerm) queryParams.append('search', searchTerm);
      queryParams.append('searchAllPages', 'true'); // Always search across all orders
      
      const response = await axios.get(`http://localhost:5000/api/admin-orders?${queryParams.toString()}`, {
        headers: {
          'x-auth-token': `${localStorage.getItem('authToken')}` // Adjust based on your auth system
        }
      });
      
      setOrders(response.data.orders);
      
      // Only set pagination if not showing all orders
      if (!showAllOrders) {
        setPagination(response.data.pagination);
      } else {
        // If showing all orders, set pagination for display purposes
        setPagination({
          total: response.data.orders.length,
          page: 1,
          pages: 1
        });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: '',
      network: '',
      startDate: '',
      endDate: '',
      orderId: '',
    });
    setSearchTerm('');
  };
  
  // Handle export to Excel
  const handleExport = async (processingExport = false) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.network) queryParams.append('network', filters.network);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      const endpoint = processingExport ? 'http://localhost:5000/api/export/processing' : 'http://localhost:5000/api/export';
      
      toast.loading('Generating export...');
      
      // Using fetch for blob handling
      const response = await fetch(`${endpoint}?${queryParams.toString()}`, {
        headers: {
          'x-auth-token': `${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = processingExport ? 'processing_orders.xlsx' : 'orders_export.xlsx';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success(`Export ${processingExport ? 'and processing update ' : ''}complete`);
      setExportModalOpen(false);
      
      if (processingExport) {
        // Refresh the list after export to processing
        fetchOrders();
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss();
      toast.error('Export failed');
    }
  };
  
  // Handle time range update submission
  const handleTimeRangeUpdate = async () => {
    try {
      // Validate inputs
      if (!timeUpdateForm.startTime && !timeUpdateForm.endTime) {
        return toast.error('Please specify at least one time boundary');
      }
      
      if (!timeUpdateForm.newStatus) {
        return toast.error('Please select a new status');
      }
      
      toast.loading('Updating orders...');
      
      const response = await axios.put('http://localhost:5000/api/orders/time-range-update', timeUpdateForm, {
        headers: {
         'x-auth-token': `${localStorage.getItem('authToken')}`
        }
      });
      
      toast.dismiss();
      
      if (response.data.updated === 0) {
        toast.error('No orders were updated');
      } else {
        toast.success(`Updated ${response.data.updated} orders to ${timeUpdateForm.newStatus}`);
        fetchOrders(); // Refresh the list
      }
      
      setTimeUpdateModalOpen(false);
    } catch (error) {
      console.error('Time range update error:', error);
      toast.dismiss();
      toast.error('Update failed');
    }
  };
  
  // Handle bulk action on selected orders
  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) {
      return toast.error('Please select an action and at least one order');
    }
    
    try {
      toast.loading(`Updating ${selectedIds.length} orders...`);
      
      const response = await axios.put('http://localhost:5000/api/orders/bulk-status-update', {
        orderIds: selectedIds,
        status: bulkAction
      }, {
        headers: {
         'x-auth-token': `${localStorage.getItem('authToken')}`
        }
      });
      
      toast.dismiss();
      toast.success(`Updated ${response.data.count} orders to ${bulkAction}`);
      
      // Reset selections
      setSelectedIds([]);
      setSelectAll(false);
      setBulkAction('');
      
      // Refresh the list
      fetchOrders();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.dismiss();
      toast.error('Bulk update failed');
    }
  };
  
  // Toggle order selection
  const toggleOrderSelection = (orderId) => {
    if (selectedIds.includes(orderId)) {
      setSelectedIds(selectedIds.filter(id => id !== orderId));
    } else {
      setSelectedIds([...selectedIds, orderId]);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Get status badge component
  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find(option => option.value === status) || {
      label: status,
      icon: <Info className="h-4 w-4" />
    };
    
    let bgColor = 'bg-gray-100 text-gray-800';
    
    switch (status) {
      case 'pending':
        bgColor = 'bg-yellow-100 text-yellow-800';
        break;
      case 'processing':
        bgColor = 'bg-blue-100 text-blue-800';
        break;
      case 'waiting':
        bgColor = 'bg-orange-100 text-orange-800';
        break;
      case 'completed':
        bgColor = 'bg-green-100 text-green-800';
        break;
      case 'delivered':
        bgColor = 'bg-green-200 text-green-900';
        break;
      case 'failed':
        bgColor = 'bg-red-100 text-red-800';
        break;
      case 'refunded':
        bgColor = 'bg-purple-100 text-purple-800';
        break;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
        {statusOption.icon}
        <span className="ml-1">{statusOption.label}</span>
      </span>
    );
  };
  
  // Handle pagination change
  const changePage = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toaster for notifications */}
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeUpdateModalOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Clock className="mr-2 h-4 w-4" />
                Time Update
              </button>
              <button
                onClick={() => setExportModalOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          </div>
          
          {/* Search Bar - Added at the top for prominence */}
          <div className="mb-4">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search across all orders..."
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-12 py-3 sm:text-sm border-gray-300 rounded-md"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Order ID filter */}
            <div>
              <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">
                Order ID
              </label>
              <input
                type="text"
                id="orderId"
                value={filters.orderId}
                onChange={(e) => setFilters({...filters, orderId: e.target.value})}
                placeholder="Search by Order ID"
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-10 py-2 text-base border-gray-300 sm:text-sm rounded-md"
              />
            </div>
          
            {/* Status filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Network filter */}
            <div>
              <label htmlFor="network" className="block text-sm font-medium text-gray-700">
                Network
              </label>
              <select
                id="network"
                value={filters.network}
                onChange={(e) => setFilters({...filters, network: e.target.value})}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Networks</option>
                {networks.map(network => (
                  <option key={network} value={network}>
                    {network}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Start Date filter */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="datetime-local"
                  id="startDate"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            {/* End Date filter */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="datetime-local"
                  id="endDate"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
          
          {/* Page Size Selector & Show All Toggle */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label htmlFor="pageSize" className="block text-sm font-medium text-gray-700">
                  Orders per page
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    // Reset to page 1 when changing page size
                    setPagination(prev => ({...prev, page: 1}));
                  }}
                  disabled={showAllOrders}
                  className="mt-1 block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:opacity-50"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                  <option value={2000}>2000</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  id="showAllOrders"
                  type="checkbox"
                  checked={showAllOrders}
                  onChange={(e) => {
                    setShowAllOrders(e.target.checked);
                    // Reset to page 1 when toggling all orders
                    setPagination(prev => ({...prev, page: 1}));
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showAllOrders" className="ml-2 block text-sm text-gray-900">
                  Show all orders
                </label>
              </div>
            </div>
            
            <button
              onClick={fetchOrders}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="mr-2 -ml-1 h-4 w-4" />
              Apply Filters
            </button>
          </div>
        </div>
        
        {/* Bulk actions */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 mr-3">
                {selectedIds.length} orders selected
              </span>
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear selection
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                disabled={selectedIds.length === 0}
              >
                <option value="">Select action...</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    Mark as {option.label}
                  </option>
                ))}
              </select>
              
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || selectedIds.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
        
        {/* Orders table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={() => setSelectAll(!selectAll)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Network
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order._id)}
                          onChange={() => toggleOrderSelection(order._id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.geonetReference || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.userId?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.userId?.email || 'No email'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.network || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(order.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {!loading && orders.length > 0 && pagination && !showAllOrders && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => changePage(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => changePage(Math.min(pagination.pages, pagination.page + 1))}
                  disabled={pagination.page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{orders.length > 0 ? (pagination.page - 1) * pageSize + 1 : 0}</span> to{' '}
                    <span className="font-medium">{Math.min(pagination.page * pageSize, pagination.total)}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => changePage(Math.max(1, pagination.page - 1))}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Page numbers */}
                    {pagination.pages <= 7 ? (
                      // Show all pages if 7 or fewer
                      [...Array(pagination.pages)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => changePage(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border ${
                            pagination.page === i + 1 
                              ? 'bg-blue-50 border-blue-500 text-blue-600 z-10' 
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          } text-sm font-medium`}
                        >
                          {i + 1}
                        </button>
                      ))
                    ) : (
                      // More complex pagination for many pages
                      <>
                        {/* First page */}
                        <button
                          onClick={() => changePage(1)}
                          className={`relative inline-flex items-center px-4 py-2 border ${
                            pagination.page === 1 
                              ? 'bg-blue-50 border-blue-500 text-blue-600 z-10' 
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          } text-sm font-medium`}
                        >
                          1
                        </button>
                        
                        {/* Ellipsis if not on first pages */}
                        {pagination.page > 3 && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        
                        {/* Pages around current page */}
                        {[...Array(5)].map((_, i) => {
                          const pageNum = Math.max(2, pagination.page - 2) + i;
                          if (pageNum > 1 && pageNum < pagination.pages) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => changePage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border ${
                                  pagination.page === pageNum 
                                    ? 'bg-blue-50 border-blue-500 text-blue-600 z-10' 
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                } text-sm font-medium`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        }).filter(Boolean)}
                        
                        {/* Ellipsis if not on last pages */}
                        {pagination.page < pagination.pages - 2 && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        
                        {/* Last page */}
                        <button
                          onClick={() => changePage(pagination.pages)}
                          className={`relative inline-flex items-center px-4 py-2 border ${
                            pagination.page === pagination.pages 
                              ? 'bg-blue-50 border-blue-500 text-blue-600 z-10' 
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          } text-sm font-medium`}
                        >
                          {pagination.pages}
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => changePage(Math.min(pagination.pages, pagination.page + 1))}
                      disabled={pagination.page === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
          
          {/* All Orders Total Display */}
          {!loading && showAllOrders && orders.length > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="text-sm text-gray-700">
                Showing all <span className="font-medium">{orders.length}</span> orders
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Time Update Modal */}
      {timeUpdateModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Update Orders by Time Range
                  </h3>
                  <div className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                        Start Time (Optional)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="datetime-local"
                          id="startTime"
                          value={timeUpdateForm.startTime}
                          onChange={(e) => setTimeUpdateForm({...timeUpdateForm, startTime: e.target.value})}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center">
                          <button
                            type="button"
                            onClick={setCurrentTimeAsStart}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
                          >
                            Now
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                        End Time (Optional)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="datetime-local"
                          id="endTime"
                          value={timeUpdateForm.endTime}
                          onChange={(e) => setTimeUpdateForm({...timeUpdateForm, endTime: e.target.value})}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        At least one time boundary is required
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700">
                        New Status
                      </label>
                      <select
                        id="newStatus"
                        value={timeUpdateForm.newStatus}
                        onChange={(e) => setTimeUpdateForm({...timeUpdateForm, newStatus: e.target.value})}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Current Statuses (Optional)
                      </label>
                      <div className="mt-2 space-y-2">
                        {statusOptions.map(option => (
                          <div key={option.value} className="flex items-start">
                            <div className="flex items-center h-5">
                              <input
                                id={`status-${option.value}`}
                                type="checkbox"
                                checked={timeUpdateForm.currentStatuses.includes(option.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTimeUpdateForm({
                                      ...timeUpdateForm,
                                      currentStatuses: [...timeUpdateForm.currentStatuses, option.value]
                                    });
                                  } else {
                                    setTimeUpdateForm({
                                      ...timeUpdateForm,
                                      currentStatuses: timeUpdateForm.currentStatuses.filter(s => s !== option.value)
                                    });
                                  }
                                }}
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label htmlFor={`status-${option.value}`} className="font-medium text-gray-700 flex items-center">
                                {option.icon}
                                <span className="ml-1">{option.label}</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        If none selected, will update all statuses except the target status
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Networks (Optional)
                      </label>
                      <div className="mt-2 space-y-2">
                        {networks.map(network => (
                          <div key={network} className="flex items-start">
                            <div className="flex items-center h-5">
                              <input
                                id={`network-${network}`}
                                type="checkbox"
                                checked={timeUpdateForm.networks.includes(network)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTimeUpdateForm({
                                      ...timeUpdateForm,
                                      networks: [...timeUpdateForm.networks, network]
                                    });
                                  } else {
                                    setTimeUpdateForm({
                                      ...timeUpdateForm,
                                      networks: timeUpdateForm.networks.filter(n => n !== network)
                                    });
                                  }
                                }}
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label htmlFor={`network-${network}`} className="font-medium text-gray-700">
                                {network}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        If none selected, will update orders from all networks
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleTimeRangeUpdate}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                >
                  Update Orders
                </button>
                <button
                  type="button"
                  onClick={() => setTimeUpdateModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Export Modal */}
      {exportModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Export Orders
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Choose the export option that suits your needs.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={() => handleExport(true)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                >
                  Export & Mark as Processing
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Export Only
                </button>
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-span-2 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}