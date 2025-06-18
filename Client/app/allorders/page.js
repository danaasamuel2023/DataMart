"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import * as XLSX from 'xlsx';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [referenceSearch, setReferenceSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [networkFilter, setNetworkFilter] = useState("");
  
  // User search states
  const [userSearchPhone, setUserSearchPhone] = useState("");
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [searchedUser, setSearchedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [userOrdersLoading, setUserOrdersLoading] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchError, setUserSearchError] = useState("");
  const [userTotalSpent, setUserTotalSpent] = useState(0);
  const [userTotalOrders, setUserTotalOrders] = useState(0);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(100);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Ref for infinite scroll
  const observerRef = useRef(null);
  const lastOrderElementRef = useRef(null);

  // Debounce timer for search
  const searchDebounceRef = useRef(null);

  // Search for user by phone number
  const searchUserByPhone = async () => {
    if (!userSearchPhone.trim()) {
      setUserSearchError("Please enter a phone number");
      return;
    }

    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      setUserSearchError("Unauthorized access!");
      return;
    }

    try {
      setUserSearchLoading(true);
      setUserSearchError("");
      setSearchedUser(null);
      setUserOrders([]);

      // Search for user by phone number
      const res = await fetch(`https://datamartbackened.onrender.com/api/admin/users?search=${userSearchPhone}&limit=1`, {
        headers: {
          'x-auth-token': authToken
        }
      });

      if (!res.ok) {
        throw new Error("Failed to search user");
      }

      const data = await res.json();
      
      if (data.users && data.users.length > 0) {
        const foundUser = data.users.find(u => 
          u.phoneNumber && u.phoneNumber.includes(userSearchPhone)
        );
        
        if (foundUser) {
          setSearchedUser(foundUser);
          // Automatically fetch orders for this user
          await fetchUserOrders(foundUser._id);
        } else {
          setUserSearchError("No user found with this phone number");
        }
      } else {
        setUserSearchError("No user found with this phone number");
      }
    } catch (error) {
      console.error("Error searching user:", error);
      setUserSearchError("Error searching for user. Please try again.");
    } finally {
      setUserSearchLoading(false);
    }
  };

  // Fetch orders for a specific user
  const fetchUserOrders = async (userId) => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      setUserSearchError("Unauthorized access!");
      return;
    }

    try {
      setUserOrdersLoading(true);
      setUserSearchError("");

      const res = await fetch(`https://datamartbackened.onrender.com/api/admin/user-orders/${userId}?page=1&limit=1000`, {
        headers: {
          'x-auth-token': authToken
        }
      });

      if (!res.ok) {
        throw new Error("Failed to fetch user orders");
      }

      const data = await res.json();
      
      setUserOrders(data.orders || []);
      setUserTotalOrders(data.totalOrders || 0);
      setUserTotalSpent(data.totalSpent || 0);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      setUserSearchError("Error fetching orders. Please try again.");
    } finally {
      setUserOrdersLoading(false);
    }
  };

  // Export user orders to Excel
  const exportUserOrdersToExcel = () => {
    if (!userOrders || userOrders.length === 0) {
      alert("No orders to export");
      return;
    }

    const dataToExport = userOrders.map(order => ({
      'Reference': order.geonetReference || order.id,
      'Phone Number': order.phoneNumber,
      'Capacity (GB)': order.capacity,
      'Network': order.network,
      'Price (GHS)': order.price.toFixed(2),
      'Status': order.status,
      'Date': new Date(order.createdAt).toLocaleString()
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'User Orders');
    
    const fileName = `user_orders_${searchedUser.phoneNumber}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Build query string from filters
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.append('page', currentPage);
    params.append('limit', ordersPerPage);
    
    if (statusFilter) params.append('status', statusFilter);
    if (networkFilter) params.append('network', networkFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (phoneSearch) params.append('phoneNumber', phoneSearch);
    
    return params.toString();
  }, [currentPage, ordersPerPage, statusFilter, networkFilter, startDate, endDate, phoneSearch]);

  // Fetch orders with filters
  const fetchOrders = useCallback(async (resetPage = false) => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      alert("Unauthorized access!");
      return;
    }

    try {
      setLoading(true);
      
      // If resetPage is true, we're applying new filters
      const pageToUse = resetPage ? 1 : currentPage;
      
      const params = new URLSearchParams();
      params.append('page', pageToUse);
      params.append('limit', ordersPerPage);
      
      if (statusFilter) params.append('status', statusFilter);
      if (networkFilter) params.append('network', networkFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (phoneSearch) params.append('phoneNumber', phoneSearch);
      
      const res = await fetch(`https://datamartbackened.onrender.com/api/admin/orders?${params.toString()}`, {
        headers: {
          'x-auth-token': authToken
        }
      });

      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await res.json();
      
      if (data.orders && Array.isArray(data.orders)) {
        // Apply client-side filters for reference search and capacity
        let filteredData = data.orders;
        
        if (referenceSearch) {
          filteredData = filteredData.filter(order => 
            (order.geonetReference && order.geonetReference.toString().toLowerCase().includes(referenceSearch.toLowerCase())) ||
            (order.id && order.id.toString().toLowerCase().includes(referenceSearch.toLowerCase()))
          );
        }
        
        if (capacityFilter) {
          filteredData = filteredData.filter(order => order.capacity === parseInt(capacityFilter));
        }
        
        if (resetPage || pageToUse === 1) {
          setOrders(filteredData);
        } else {
          setOrders(prevOrders => [...prevOrders, ...filteredData]);
        }
        
        setTotalOrders(data.totalOrders || filteredData.length);
        setTotalPages(data.totalPages || Math.ceil(filteredData.length / ordersPerPage));
        setHasMore(filteredData.length > 0 && pageToUse < data.totalPages);
        
        if (resetPage) {
          setCurrentPage(1);
        }
      } else {
        console.error("Unexpected response format:", data);
        setOrders([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [currentPage, ordersPerPage, statusFilter, networkFilter, startDate, endDate, phoneSearch, referenceSearch, capacityFilter]);

  // Initial load and when filters change
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    searchDebounceRef.current = setTimeout(() => {
      fetchOrders(true);
    }, 300);
    
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [statusFilter, networkFilter, startDate, endDate, phoneSearch, referenceSearch, capacityFilter, ordersPerPage]);

  // Load more when page changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchOrders(false);
    }
  }, [currentPage]);

  // Setup Intersection Observer for infinite scrolling
  useEffect(() => {
    if (loading || !hasMore) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    }, { threshold: 0.5 });
    
    if (lastOrderElementRef.current) {
      observerRef.current.observe(lastOrderElementRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore]);

  const updateOrderStatus = async (orderId, newStatus) => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      alert("Unauthorized access!");
      return;
    }

    try {
      const res = await fetch(`https://datamartbackened.onrender.com/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
           'x-auth-token': authToken
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            (order.id === orderId || order.geonetReference === orderId) ? { ...order, status: newStatus } : order
          )
        );
        alert(`Order ${orderId} updated successfully!`);
      } else {
        console.error("Failed to update order");
        alert("Failed to update order. Please try again.");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Error updating order. Please try again.");
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedOrders.length === 0) {
      alert("Please select orders and a status to update");
      return;
    }

    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      alert("Unauthorized access!");
      return;
    }

    try {
      const res = await fetch(`https://datamartbackened.onrender.com/api/admin/orders/bulk-status-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'x-auth-token': authToken
        },
        body: JSON.stringify({ 
          orderIds: selectedOrders,
          status: bulkStatus 
        }),
      });
      
      if (res.ok) {
        const result = await res.json();
        
        // Update local state
        setOrders(prevOrders => 
          prevOrders.map(order => {
            if (selectedOrders.includes(order.id) || selectedOrders.includes(order.geonetReference)) {
              return { ...order, status: bulkStatus };
            }
            return order;
          })
        );
        
        alert(result.msg || `Successfully updated ${selectedOrders.length} orders!`);
        setSelectedOrders([]);
        setBulkStatus("");
      } else {
        const error = await res.json();
        alert(error.msg || "Failed to update orders. Please try again.");
      }
    } catch (error) {
      console.error("Error performing bulk update:", error);
      alert("Error updating orders. Please try again.");
    }
  };

  // Export functions remain the same...
  const exportToExcel = () => {
    const dataToExport = orders.map(order => ({
      'Reference': order.geonetReference || order.id,
      'Phone Number': order.phoneNumber,
      'CapacityinGb': order.capacity,
      '          ': '',
      'Network': order.network,
      '               ': '',
      'Status': order.status,
      '                         ': '',
      'Date': formatDate(order.createdAt)
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const cols = [
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 5 },
      { wch: 10 }, { wch: 5 }, { wch: 12 }, { wch: 5 }, { wch: 20 }
    ];
    worksheet['!cols'] = cols;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    
    const fileName = `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportPhoneNumbersToExcel = async () => {
    // Same implementation as before...
    alert("Exporting all phone numbers... This may take a moment.");
    // Implementation remains the same
  };

  const setTodayFilter = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    setStartDate(todayString);
    setEndDate(todayString);
  };

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setPhoneSearch("");
    setReferenceSearch("");
    setCapacityFilter("");
    setStatusFilter("");
    setNetworkFilter("");
    setSelectedOrders([]);
    setBulkStatus("");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'processing':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'waiting':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Admin Orders</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage and monitor all customer orders</p>
        </div>
        
        {/* User Search Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Quick User Orders Search
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={userSearchPhone}
                  onChange={(e) => setUserSearchPhone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUserByPhone()}
                  placeholder="Enter phone number to search user orders"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                           placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                />
                <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>
            <button
              onClick={searchUserByPhone}
              disabled={userSearchLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 
                       text-white rounded-lg transition-colors duration-200 flex items-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {userSearchLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search User
                </>
              )}
            </button>
            {searchedUser && (
              <button
                onClick={() => {
                  setSearchedUser(null);
                  setUserOrders([]);
                  setUserSearchPhone("");
                  setUserSearchError("");
                }}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 
                         text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>

          {/* Error Message */}
          {userSearchError && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-red-700 dark:text-red-400">{userSearchError}</p>
            </div>
          )}

          {/* User Information */}
          {searchedUser && (
            <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{searchedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{searchedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone Number</p>
                  <p className="font-medium text-gray-900 dark:text-white">{searchedUser.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Wallet Balance</p>
                  <p className="font-medium text-gray-900 dark:text-white">GHS {searchedUser.walletBalance.toFixed(2)}</p>
                </div>
              </div>
              
              {/* Order Statistics */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{userTotalOrders}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">GHS {userTotalSpent.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average Order</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    GHS {userTotalOrders > 0 ? (userTotalSpent / userTotalOrders).toFixed(2) : '0.00'}
                  </p>
                </div>
                {userOrders.length > 0 && (
                  <button
                    onClick={exportUserOrdersToExcel}
                    className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 
                             text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export User Orders
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Orders Table - Show if user is searched */}
        {searchedUser && userOrders.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {searchedUser.name}'s Orders ({userOrders.length})
              </h3>
            </div>
            {userOrdersLoading ? (
              <div className="p-8">
                <div className="flex justify-center">
                  <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Network
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {userOrders.map((order) => (
                      <tr key={order._id || order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {order.geonetReference || order.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {order.phoneNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {order.network}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {order.capacity} GB
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          GHS {order.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Filters and Bulk Actions Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 transition-all duration-200">
          <div className="space-y-6">
            {/* Search and Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Phone Number Search */}
              <div className="relative">
                <label htmlFor="phoneSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="phoneSearch"
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    placeholder="Search by phone"
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                             placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                  />
                  <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {phoneSearch && (
                    <button 
                      onClick={() => setPhoneSearch("")}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Reference Search */}
              <div className="relative">
                <label htmlFor="referenceSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Order Reference
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="referenceSearch"
                    value={referenceSearch}
                    onChange={(e) => setReferenceSearch(e.target.value)}
                    placeholder="Search by reference"
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                             placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                  />
                  <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  {referenceSearch && (
                    <button 
                      onClick={() => setReferenceSearch("")}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Capacity Filter */}
              <div>
                <label htmlFor="capacityFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Capacity (GB)
                </label>
                <select
                  id="capacityFilter"
                  value={capacityFilter}
                  onChange={(e) => setCapacityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                           transition-colors duration-200"
                >
                  <option value="">All Capacities</option>
                  <option value="1">1 GB</option>
                  <option value="2">2 GB</option>
                  <option value="3">3 GB</option>
                  <option value="4">4 GB</option>
                  <option value="7">7 GB</option>
                </select>
              </div>
              
              {/* Network Filter */}
              <div>
                <label htmlFor="networkFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Network
                </label>
                <select
                  id="networkFilter"
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                           transition-colors duration-200"
                >
                  <option value="">All Networks</option>
                  <option value="TELECEL">Telecel</option>
                  <option value="YELLO">Yellow</option>
                  <option value="MTN">MTN</option>
                  <option value="VODAFONE">Vodafone</option>
                  <option value="AT_PREMIUM">AT Premium</option>
                  <option value="airteltigo">AirtelTigo</option>
                  <option value="at">AT</option>
                </select>
              </div>
              
              {/* Status Filter */}
              <div>
                <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                           transition-colors duration-200"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="waiting">Waiting</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              {/* Start Date */}
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                           transition-colors duration-200"
                />
              </div>
              
              {/* End Date */}
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                           transition-colors duration-200"
                />
              </div>
              
              {/* Orders per page */}
              <div>
                <label htmlFor="ordersPerPage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Per Page
                </label>
                <select
                  id="ordersPerPage"
                  value={ordersPerPage}
                  onChange={(e) => setOrdersPerPage(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                           transition-colors duration-200"
                >
                  <option value="10">10</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="500">500</option>
                  <option value="1000">1000</option>
                </select>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={setTodayFilter}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 
                         text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Today's Orders
              </button>
              
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 
                         text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Clear Filters
              </button>
              
              <button
                onClick={exportPhoneNumbersToExcel}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 
                         text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Phone Numbers
              </button>
              
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 
                         text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Full Data
              </button>
            </div>
            
            {/* Bulk Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                           transition-colors duration-200"
                >
                  <option value="">Select Bulk Status</option>
                  <option value="pending">Pending</option>
                  <option value="waiting">Waiting</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                </select>
                <button
                  onClick={handleBulkUpdate}
                  disabled={!bulkStatus || selectedOrders.length === 0}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    !bulkStatus || selectedOrders.length === 0
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Update Selected ({selectedOrders.length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results summary */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-900 dark:text-white">{orders.length}</span> orders
            {totalOrders > 0 && (
              <span> (Total: <span className="font-semibold text-gray-900 dark:text-white">{totalOrders}</span>)</span>
            )}
          </div>
          
          {loading && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading...</span>
            </div>
          )}
        </div>

        {/* Orders Table */}
        {loading && currentPage === 1 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12">
            <div className="flex flex-col items-center justify-center">
              <svg className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-lg text-gray-700 dark:text-gray-300">Loading orders...</span>
            </div>
          </div>
        ) : (
          <>
            {orders.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-lg">No orders found</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Try adjusting your filters</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrders(orders.map(order => order.geonetReference || order.id));
                              } else {
                                setSelectedOrders([]);
                              }
                            }}
                            checked={selectedOrders.length === orders.length && orders.length > 0}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Reference
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Buyer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Capacity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Network
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {orders.map((order, index) => {
                        const isLastElement = index === orders.length - 1;
                        const orderId = order.geonetReference || order.id;
                        
                        return (
                          <tr 
                            key={orderId} 
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                            ref={isLastElement ? lastOrderElementRef : null}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedOrders.includes(orderId)}
                                onChange={() => toggleOrderSelection(orderId)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {orderId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <div>
                                <div className="font-medium">{order.userId?.name || 'Unknown'}</div>
                                {order.userId?.email && (
                                  <div className="text-xs text-gray-400 dark:text-gray-500">{order.userId.email}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {order.capacity} GB
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              GHS {order.price.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(order.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {order.network}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {order.phoneNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <select
                                  value={order.status || ""}
                                  onChange={(e) => updateOrderStatus(orderId, e.target.value)}
                                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 
                                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                           focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="waiting">Waiting</option>
                                  <option value="processing">Processing</option>
                                  <option value="failed">Failed</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="completed">Completed</option>
                                </select>
                                <button
                                  onClick={() => updateOrderStatus(orderId, order.status)}
                                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 
                                           hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-md text-sm transition-colors duration-150"
                                >
                                  Update
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Loading indicator for infinite scroll */}
                {loading && currentPage > 1 && (
                  <div className="flex justify-center items-center p-4 bg-gray-50 dark:bg-gray-900">
                    <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-3 text-gray-700 dark:text-gray-300">Loading more orders...</span>
                  </div>
                )}
                
                {/* Message when all data is loaded */}
                {!hasMore && orders.length > ordersPerPage && (
                  <div className="p-4 text-center text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                    All orders loaded
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;