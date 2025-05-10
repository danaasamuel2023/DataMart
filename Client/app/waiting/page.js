// pages/admin/order-management.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  ChevronDown, 
  Moon, 
  Sun, 
  Filter, 
  Check, 
  X,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader,
  Copy,
  BarChart,
  Home
} from 'lucide-react';

// API base URL - update as needed
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://datamartbackened.onrender.com/api';

// Status tabs definition with colors and tooltips
const STATUS_TABS = [
  { id: 'waiting', label: 'Waiting', color: 'yellow', tooltip: 'Orders waiting for approval' },
  { id: 'pending', label: 'Pending', color: 'blue', tooltip: 'Orders pending processing' },
  { id: 'processing', label: 'Processing', color: 'purple', tooltip: 'Orders currently being processed' },
  { id: 'completed', label: 'Completed', color: 'green', tooltip: 'Successfully completed orders' },
  { id: 'failed', label: 'Failed', color: 'red', tooltip: 'Failed orders' },
  { id: 'on', label: 'On', color: 'indigo', tooltip: 'Orders that are active/on' }
];

export default function OrderManagementPage() {
  const router = useRouter();
  
  // State for theme
  const [darkMode, setDarkMode] = useState(false);
  
  // State management
  const [activeTab, setActiveTab] = useState('waiting');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1
  });
  
  // Filters
  const [filters, setFilters] = useState({
    network: '',
    startDate: '',
    endDate: '',
    limit: 20,
    todayOnly: false
  });
  
  // Selected orders for bulk actions
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(null);
  
  // Clipboard state
  const [copyAfterUpdate, setCopyAfterUpdate] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [customPageSize, setCustomPageSize] = useState('');
  
  // Dashboard data for counts
  const [statusCounts, setStatusCounts] = useState({});
  
  // Networks from schema
  const networks = ['YELLO', 'TELECEL', 'AT_PREMIUM', 'airteltigo', 'at'];
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Set initial dark mode based on system preference
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Fetch dashboard data for tab counts
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_BASE_URL}/orders/today`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const ordersByStatus = response.data.orders.byStatus;
      setStatusCounts(ordersByStatus);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      // Don't set error state here to avoid disrupting the main UI
    }
  };

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedOrders([]);
    setSelectAll(false);
    setPagination({
      total: 0,
      page: 1,
      pages: 1
    });
    fetchOrders(tabId);
  };

  // Fetch orders based on status
  const fetchOrders = async (status = activeTab) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      if (filters.network) queryParams.append('network', filters.network);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      queryParams.append('limit', filters.limit);
      queryParams.append('page', pagination.page);
      
      const token = localStorage.getItem('token'); // Assuming token-based auth
      
      const response = await axios.get(`${API_BASE_URL}/orders/${status}?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setOrders(response.data.orders);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error(`Error fetching ${status} orders:`, err);
      setError(err.response?.data?.msg || `Error fetching ${status} orders`);
    } finally {
      setLoading(false);
    }
  };
  
  // Format orders for clipboard (number capacity format with spaces between)
  const formatOrdersForClipboard = () => {
    // Get the selected orders
    const ordersToFormat = selectedOrders.length > 0 
      ? orders.filter(order => selectedOrders.includes(order._id)) 
      : orders;
    
    // Format each order as "phoneNumber capacity"
    return ordersToFormat.map(order => `${order.phoneNumber} ${order.capacity}`).join('\n');
  };

  // Copy orders to clipboard
  const copyOrdersToClipboard = () => {
    const formattedOrders = formatOrdersForClipboard();
    
    navigator.clipboard.writeText(formattedOrders)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      })
      .catch(err => {
        console.error('Error copying to clipboard:', err);
        setError('Failed to copy orders to clipboard');
      });
  };
  
  // Update status of selected orders
  const updateOrderStatus = async () => {
    if (!newStatus || selectedOrders.length === 0) {
      return;
    }
    
    setStatusUpdateLoading(true);
    setUpdateSuccess(null);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Use the specific route for the current tab if available
      const updateEndpoint = `${API_BASE_URL}/orders/${activeTab}/update-status`;
      
      const response = await axios.put(
        updateEndpoint,
        {
          orderIds: selectedOrders,
          newStatus,
          notes: statusNotes
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setUpdateSuccess(response.data.msg);
      
      // Copy to clipboard if option is selected
      if (copyAfterUpdate) {
        copyOrdersToClipboard();
      }
      
      setSelectedOrders([]);
      setSelectAll(false);
      setNewStatus('');
      setStatusNotes('');
      
      // Refresh orders list and dashboard data
      fetchOrders();
      fetchDashboardData();
    } catch (err) {
      console.error('Error updating order status:', err);
      // More detailed error message that includes response data if available
      setError(
        err.response?.data?.msg || 
        `Error updating orders: ${err.message || 'Unknown error'}`
      );
      
      // Log more details for debugging
      if (err.response) {
        console.error('Error response:', err.response.data);
      }
    } finally {
      setStatusUpdateLoading(false);
    }
  };
  
  // Export orders
  const exportOrders = () => {
    const token = localStorage.getItem('token');
    
    // If we have selected orders, use the selected orders export
    if (selectedOrders.length > 0) {
      // For selected orders, we need to use POST with a body
      const formData = new FormData();
      formData.append('orderIds', JSON.stringify(selectedOrders));
      
      // Create headers
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${token}`);
      
      // Create request
      const request = new Request(`${API_BASE_URL}/orders/export-selected`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      
      // Use fetch for file download
      fetch(request)
        .then(response => {
          if (!response.ok) {
            throw new Error('Export failed');
          }
          return response.blob();
        })
        .then(blob => {
          // Create a link to download the file
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `selected_${activeTab}_orders.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        })
        .catch(err => {
          console.error('Error exporting selected orders:', err);
          setError('Failed to export selected orders');
        });
        
    } else {
      // For all orders with filters, use GET with query params
      const queryParams = new URLSearchParams();
      if (filters.network) queryParams.append('network', filters.network);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      // Using window.open for file download
      window.open(`${API_BASE_URL}/orders/export/${activeTab}?${queryParams.toString()}&token=${token}`, '_blank');
    }
  };
  
  // Toggle select all orders
  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      setSelectedOrders(orders.map(order => order._id));
    } else {
      setSelectedOrders([]);
    }
  };
  
  // Toggle individual order selection
  const toggleOrderSelection = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };
  
  // Apply filters
  const applyFilters = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    fetchOrders();
    setShowFilterPanel(false);
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      network: '',
      startDate: '',
      endDate: '',
      limit: 20,
      todayOnly: false
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchOrders();
    setShowFilterPanel(false);
  };
  
  // Set today's date filter
  const setTodayFilter = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    setFilters({
      ...filters,
      startDate: formattedDate,
      endDate: formattedDate,
      todayOnly: true
    });
    
    setPagination(prev => ({ ...prev, page: 1 }));
    // Will fetch when Apply is clicked
  };
  
  // Apply custom page size
  const applyCustomPageSize = () => {
    if (customPageSize && !isNaN(customPageSize) && parseInt(customPageSize) > 0) {
      setFilters({
        ...filters,
        limit: parseInt(customPageSize)
      });
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchOrders();
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };
  
  // Change page
  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };
  
  // Get status color
  const getStatusColor = (status) => {
    const statusTab = STATUS_TABS.find(tab => tab.id === status);
    return statusTab ? statusTab.color : 'gray';
  };
  
  // Get available statuses for current tab
  const getAvailableStatuses = () => {
    // Each status can be changed to any other status except itself
    return STATUS_TABS
      .filter(tab => tab.id !== activeTab)
      .map(tab => ({ id: tab.id, label: tab.label }));
  };
  
  // Initial fetch
  useEffect(() => {
    fetchOrders();
    fetchDashboardData();
  }, [pagination.page]); // Fetch when page changes
  
  // Update selectAll when all items are manually selected
  useEffect(() => {
    if (orders.length > 0 && selectedOrders.length === orders.length) {
      setSelectAll(true);
    } else if (selectAll && selectedOrders.length !== orders.length) {
      setSelectAll(false);
    }
  }, [selectedOrders, orders]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
      <Head>
        <title>Order Management | Admin Dashboard</title>
        <meta name="description" content="Manage orders by status" />
      </Head>
      
      {/* Header */}
      <header className="p-4 border-b bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Order Management</h1>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="px-3 py-2 rounded-md flex items-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </button>
            
            <button
              onClick={exportOrders}
              className="px-3 py-2 rounded-md flex items-center bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white transition-colors"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
            
            <button
              onClick={copyOrdersToClipboard}
              className="px-3 py-2 rounded-md flex items-center bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white transition-colors"
              disabled={orders.length === 0}
            >
              <Copy className="h-5 w-5 mr-2" />
              Copy to Clipboard
            </button>
            
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-3 py-2 rounded-md flex items-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              <BarChart className="h-5 w-5 mr-2" />
              Dashboard
            </button>
            
            <button
              onClick={() => router.push('/admin')}
              className="px-3 py-2 rounded-md flex items-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              <Home className="h-5 w-5 mr-2" />
              Admin Home
            </button>
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto py-6 px-4">
        {/* Status Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 min-w-max">
            {STATUS_TABS.map(tab => {
              const active = activeTab === tab.id;
              const count = statusCounts[tab.id] || 0;
              
              let bgColor, textColor, hoverBg;
              
              if (active) {
                switch(tab.color) {
                  case 'red':
                    bgColor = 'bg-red-500';
                    textColor = 'text-white';
                    break;
                  case 'green':
                    bgColor = 'bg-green-500';
                    textColor = 'text-white';
                    break;
                  case 'blue':
                    bgColor = 'bg-blue-500';
                    textColor = 'text-white';
                    break;
                  case 'yellow':
                    bgColor = 'bg-yellow-500';
                    textColor = 'text-gray-900';
                    break;
                  case 'purple':
                    bgColor = 'bg-purple-500';
                    textColor = 'text-white';
                    break;
                  case 'indigo':
                    bgColor = 'bg-indigo-500';
                    textColor = 'text-white';
                    break;
                  default:
                    bgColor = 'bg-gray-500';
                    textColor = 'text-white';
                }
              } else {
                bgColor = 'bg-white dark:bg-gray-800';
                textColor = 'text-gray-800 dark:text-gray-200';
                hoverBg = 'hover:bg-gray-100 dark:hover:bg-gray-700';
              }
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-2 font-medium rounded-t-lg focus:outline-none flex items-center transition-colors ${bgColor} ${textColor} ${hoverBg || ''}`}
                  title={tab.tooltip}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${active ? 'bg-white bg-opacity-20 text-white' : `bg-${tab.color}-100 text-${tab.color}-800 dark:bg-${tab.color}-900 dark:bg-opacity-30 dark:text-${tab.color}-200`}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Copy success message */}
        {copySuccess && (
          <div className="mb-6 p-4 rounded-lg bg-green-100 dark:bg-green-900 dark:bg-opacity-20 text-green-600 dark:text-green-400 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Orders copied to clipboard successfully
          </div>
        )}
        
        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="mb-6 p-4 rounded-lg shadow-md bg-white dark:bg-gray-800 transition-colors">
            <form onSubmit={applyFilters}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Network</label>
                  <select
                    value={filters.network}
                    onChange={e => setFilters({...filters, network: e.target.value})}
                    className="w-full p-2 rounded border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white transition-colors"
                  >
                    <option value="">All Networks</option>
                    {networks.map(network => (
                      <option key={network} value={network}>{network}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={e => setFilters({...filters, startDate: e.target.value})}
                    className="w-full p-2 rounded border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={e => setFilters({...filters, endDate: e.target.value})}
                    className="w-full p-2 rounded border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Quick Filters</label>
                  <div className="flex space-x-2">
                    <button 
                      type="button"
                      onClick={setTodayFilter}
                      className={`px-3 py-2 text-sm rounded-md ${
                        filters.todayOnly 
                          ? 'bg-green-500 text-white dark:bg-green-600' 
                          : 'bg-gray-200 dark:bg-gray-700'
                      } transition-colors`}
                    >
                      Today's Orders
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Items per page</label>
                  <div className="flex space-x-2">
                    <select
                      value={filters.limit}
                      onChange={e => setFilters({...filters, limit: parseInt(e.target.value)})}
                      className="w-full p-2 rounded border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white transition-colors"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="2000">2000</option>

                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Custom page size</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Custom size"
                      value={customPageSize}
                      onChange={e => setCustomPageSize(e.target.value)}
                      className="w-3/4 p-2 rounded-l border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={applyCustomPageSize}
                      className="w-1/4 p-2 rounded-r bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Status Update Panel - Shows when orders are selected */}
        {selectedOrders.length > 0 && (
          <div className="mb-6 p-4 rounded-lg shadow-md bg-white dark:bg-gray-800 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="mb-4 md:mb-0 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="font-medium">{selectedOrders.length} orders selected</span>
              </div>
              
              <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="p-2 rounded border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white transition-colors"
                >
                  <option value="">Select New Status</option>
                  {getAvailableStatuses().map(status => (
                    <option key={status.id} value={status.id}>{status.label}</option>
                  ))}
                </select>
                
                <input
                  type="text"
                  placeholder="Admin Notes (Optional)"
                  value={statusNotes}
                  onChange={e => setStatusNotes(e.target.value)}
                  className="p-2 rounded border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white transition-colors"
                />
                
                <div className="flex items-center space-x-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 p-2">
                  <input
                    type="checkbox"
                    id="copyAfterUpdate"
                    checked={copyAfterUpdate}
                    onChange={() => setCopyAfterUpdate(!copyAfterUpdate)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="copyAfterUpdate" className="text-sm">
                    Copy to clipboard after update
                  </label>
                </div>
                
                <button
                  onClick={updateOrderStatus}
                  disabled={!newStatus || statusUpdateLoading}
                  className={`px-4 py-2 rounded flex items-center justify-center ${
                    !newStatus || statusUpdateLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white'
                  } transition-colors`}
                >
                  {statusUpdateLoading ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Update Status
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {updateSuccess && (
              <div className="mt-3 flex items-center text-green-500 text-sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                {updateSuccess}
              </div>
            )}
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 dark:bg-red-900 dark:bg-opacity-20 text-red-600 dark:text-red-400 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        
        {/* Orders Table */}
        <div className="rounded-lg shadow overflow-hidden bg-white dark:bg-gray-800 transition-colors">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg">No {activeTab} orders found</p>
              <button 
                onClick={() => fetchOrders()}
                className="mt-4 px-4 py-2 rounded flex items-center mx-auto bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white transition-colors"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <div className="flex items-center">
                        Order Info
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <div className="flex items-center">
                        Customer
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Network
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <div className="flex items-center">
                        Amount
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <div className="flex items-center">
                        Date
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order) => (
                    <tr 
                      key={order._id}
                      className={`${
                        selectedOrders.includes(order._id) 
                          ? 'bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20' 
                          : ''
                      } hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order._id)}
                          onChange={() => toggleOrderSelection(order._id)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">#{order._id.substring(0, 8)}...</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Ref: {order.geonetReference || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{order.userId?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{order.phoneNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                          {order.network}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{order.capacity} GB</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">₵{order.price?.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm max-w-xs truncate">
                        {order.adminNotes || 'No notes'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {!loading && orders.length > 0 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => changePage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                    pagination.page === 1
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                  } border-gray-300 dark:border-gray-600 transition-colors`}
                >
                  Previous
                </button>
                <button
                  onClick={() => changePage(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                    pagination.page === pagination.pages
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                  } border-gray-300 dark:border-gray-600 transition-colors`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm">
                    Showing <span className="font-medium">{(pagination.page - 1) * filters.limit + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * filters.limit, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => changePage(1)}
                      disabled={pagination.page === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                        pagination.page === 1
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                      } border-gray-300 dark:border-gray-600 transition-colors`}
                    >
                      <span className="sr-only">First</span>
                      <ChevronsLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => changePage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`relative inline-flex items-center px-2 py-2 border text-sm font-medium ${
                        pagination.page === 1
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                      } border-gray-300 dark:border-gray-600 transition-colors`}
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNum;
                      
                      if (pagination.pages <= 5) {
                        // If 5 pages or less, show all pages
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        // If current page is 1-3, show pages 1-5
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.pages - 2) {
                        // If current page is among the last 3, show the last 5 pages
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        // Otherwise show 2 pages before and after the current page
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => changePage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pagination.page === pageNum
                              ? 'bg-indigo-500 dark:bg-indigo-600 text-white'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                          } border-gray-300 dark:border-gray-600 transition-colors`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => changePage(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className={`relative inline-flex items-center px-2 py-2 border text-sm font-medium ${
                        pagination.page === pagination.pages
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                      } border-gray-300 dark:border-gray-600 transition-colors`}
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => changePage(pagination.pages)}
                      disabled={pagination.page === pagination.pages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                        pagination.page === pagination.pages
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                      } border-gray-300 dark:border-gray-600 transition-colors`}
                    >
                      <span className="sr-only">Last</span>
                      <ChevronsRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}