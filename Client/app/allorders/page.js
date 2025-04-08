"use client";
import { useEffect, useState, useRef } from "react";
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
  const [referenceSearch, setReferenceSearch] = useState(""); // New reference search state
  const [statusFilter, setStatusFilter] = useState("");
  const [networkFilter, setNetworkFilter] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(100);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Ref for infinite scroll
  const observerRef = useRef(null);
  const lastOrderElementRef = useRef(null);

  // Date filter function
  const isWithinDateRange = (dateString) => {
    if (!startDate && !endDate) return true;
    
    const orderDate = new Date(dateString);
    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;
    
    if (startDateObj && endDateObj) {
      // Set end date to end of day for inclusive filtering
      endDateObj.setHours(23, 59, 59, 999);
      return orderDate >= startDateObj && orderDate <= endDateObj;
    } else if (startDateObj) {
      return orderDate >= startDateObj;
    } else if (endDateObj) {
      // Set end date to end of day for inclusive filtering
      endDateObj.setHours(23, 59, 59, 999);
      return orderDate <= endDateObj;
    }
    
    return true;
  };

  // Apply all filters - MOVED THIS UP before the useEffect that uses it
  const filteredOrders = orders.filter(order => {
    const capacityMatches = capacityFilter ? order.capacity === parseInt(capacityFilter) : true;
    const dateMatches = isWithinDateRange(order.createdAt);
    
    // Enhanced phone search (searches both order phone and buyer phone)
    const phoneMatches = phoneSearch ? (
      // Search in order phone number
      (order.phoneNumber && order.phoneNumber.replace(/\D/g, '').includes(phoneSearch.replace(/\D/g, ''))) ||
      // Search in buyer's phone number (if it exists)
      (order.userId?.phoneNumber && order.userId.phoneNumber.replace(/\D/g, '').includes(phoneSearch.replace(/\D/g, '')))
    ) : true;
    
    // New reference search
    const referenceMatches = referenceSearch ? (
      // Search in order reference/ID
      (order.geonetReference && order.geonetReference.toString().toLowerCase().includes(referenceSearch.toLowerCase())) ||
      (order.id && order.id.toString().toLowerCase().includes(referenceSearch.toLowerCase()))
    ) : true;
    
    // Added status filter
    const statusMatches = statusFilter ? order.status?.toLowerCase() === statusFilter.toLowerCase() : true;
    
    // Added network filter
    const networkMatches = networkFilter ? order.network?.toLowerCase() === networkFilter.toLowerCase() : true;
      
    return capacityMatches && dateMatches && phoneMatches && statusMatches && networkMatches && referenceMatches;
  });

  useEffect(() => {
    const fetchOrders = async () => {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        alert("Unauthorized access!");
        return;
      }

      try {
        // Update API call to include pagination params
        const res = await fetch(`https://datamartbackened.onrender.com/api/orders?page=${currentPage}&limit=${ordersPerPage}`, {
          headers: {
            'x-auth-token': authToken
          }
        });

        if (!res.ok) {
          throw new Error("Failed to fetch orders");
        }

        const data = await res.json();
        console.log("API Response:", data); // Debugging

        // Extract all data from the response
        if (data.orders && Array.isArray(data.orders)) {
          // For infinite scroll, append new orders to existing ones instead of replacing
          if (currentPage === 1) {
            setOrders(data.orders);
          } else {
            setOrders(prevOrders => [...prevOrders, ...data.orders]);
          }
          
          setTotalOrders(data.totalOrders || data.orders.length);
          setTotalPages(data.totalPages || Math.ceil(data.orders.length / ordersPerPage));
          
          // Check if we've reached the end of the data
          setHasMore(data.orders.length > 0 && currentPage < data.totalPages);
        } else {
          console.error("Unexpected response format:", data);
          if (currentPage === 1) {
            setOrders([]); // Prevents map errors
          }
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        if (currentPage === 1) {
          setOrders([]); // Ensure state is always an array
        }
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentPage, ordersPerPage]); // Add dependencies to reload when page changes

  // Setup Intersection Observer for infinite scrolling
  useEffect(() => {
    // Don't observe if loading or no more data
    if (loading || !hasMore) return;
    
    // Disconnect previous observer if exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
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
  }, [loading, hasMore, filteredOrders]);

  const updateOrderStatus = async (orderId, newStatus) => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      alert("Unauthorized access!");
      return;
    }

    try {
      const res = await fetch(`https://datamartbackened.onrender.com/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
           'x-auth-token': authToken
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // IMPROVED: Make sure we're updating by exact ID match
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
      // Keep track of successful updates
      let successfulUpdates = 0;
      let failedUpdates = 0;
      
      // Process updates one by one to better handle errors
      for (const orderId of selectedOrders) {
        try {
          const res = await fetch(`https://datamartbackened.onrender.com/api/orders/${orderId}/status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              'x-auth-token': authToken
            },
            body: JSON.stringify({ status: bulkStatus }),
          });
          
          if (res.ok) {
            successfulUpdates++;
          } else {
            failedUpdates++;
            console.error(`Failed to update order ${orderId}`, await res.text());
          }
        } catch (error) {
          failedUpdates++;
          console.error(`Error updating order ${orderId}:`, error);
        }
      }
      
      // Update the local state for ALL orders that match our selected IDs
      if (successfulUpdates > 0) {
        setOrders(prevOrders => 
          prevOrders.map(order => {
            // Check if this order's ID or reference matches any in our selected list
            if (selectedOrders.includes(order.id) || 
                selectedOrders.includes(order.geonetReference)) {
              return { ...order, status: bulkStatus };
            }
            return order;
          })
        );
      }
      
      // Provide feedback to the user
      if (failedUpdates === 0) {
        alert(`Successfully updated all ${successfulUpdates} orders!`);
      } else {
        alert(`Updated ${successfulUpdates} orders. ${failedUpdates} orders failed to update.`);
      }
      
      // Clear selections
      setSelectedOrders([]);
      setBulkStatus("");
      
      // Refresh the data from server to ensure we have the correct state
      if (failedUpdates > 0) {
        setCurrentPage(1);
        setLoading(true);
      }
    } catch (error) {
      console.error("Error performing bulk update:", error);
      alert("Error updating orders. Please try again.");
    }
  };

  // Export to Excel functionality
  const exportToExcel = () => {
    // Create data to export (use filtered orders)
    const dataToExport = filteredOrders.map(order => ({
      'Reference': order.geonetReference || order.id,
      'Phone Number': order.phoneNumber,
      'CapacityinGb': order.capacity,
      '          ': '',  // Empty column for spacing
      'Network': order.network, // Added network column
      '               ': '',  // Empty column for spacing
      'Status': order.status,
      '                         ': '',  // Empty column for spacing
      'Date': formatDate(order.createdAt)
    }));
    
    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Set column widths for better readability
    const cols = [
      { wch: 15 },  // Reference
      { wch: 15 },  // Phone Number
      { wch: 10 },  // Capacity
      { wch: 5 },   // Spacing
      { wch: 10 },  // Network
      { wch: 5 },   // Spacing
      { wch: 12 },  // Status
      { wch: 5 },   // Spacing
      { wch: 20 }   // Date
    ];
    
    worksheet['!cols'] = cols;
    
    // Create workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    
    // Generate Excel file and trigger download
    const fileName = `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Function to filter for today's orders
  const setTodayFilter = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayString = today.toISOString().split('T')[0];
    setStartDate(todayString);
    setEndDate(todayString);
  };

  // Handle filter reset
  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setPhoneSearch("");
    setReferenceSearch(""); // Clear reference search
    setCapacityFilter("");
    setStatusFilter("");
    setNetworkFilter("");
    setCurrentPage(1); // Reset to first page
  };
  
  // Quick clear for search fields
  const clearPhoneSearch = () => {
    setPhoneSearch("");
  };
  
  const clearReferenceSearch = () => {
    setReferenceSearch("");
  };

  // Handle orders per page change
  const handleOrdersPerPageChange = (e) => {
    const value = parseInt(e.target.value);
    setOrdersPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'waiting':  // Added waiting status
        return 'bg-orange-100 text-orange-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Orders</h1>
      
      {/* Filters and Bulk Actions */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col space-y-4">
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 flex-wrap">
            {/* Phone Number Search */}
            <div className="flex items-center relative">
              <label htmlFor="phoneSearch" className="mr-2 text-gray-700">Phone Search:</label>
              <input
                type="text"
                id="phoneSearch"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="Search by phone"
                className="border border-gray-300 rounded-md px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {phoneSearch && (
                <button 
                  onClick={clearPhoneSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  title="Clear phone search"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Reference Search (New) */}
            <div className="flex items-center relative">
              <label htmlFor="referenceSearch" className="mr-2 text-gray-700">Reference:</label>
              <input
                type="text"
                id="referenceSearch"
                value={referenceSearch}
                onChange={(e) => setReferenceSearch(e.target.value)}
                placeholder="Search by order reference"
                className="border border-gray-300 rounded-md px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {referenceSearch && (
                <button 
                  onClick={clearReferenceSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  title="Clear reference search"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Capacity Filter */}
            <div className="flex items-center">
              <label htmlFor="capacityFilter" className="mr-2 text-gray-700">Capacity:</label>
              <select
                id="capacityFilter"
                value={capacityFilter}
                onChange={(e) => setCapacityFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="7">7</option>
              </select>
            </div>
            
            {/* Network Filter */}
            <div className="flex items-center">
              <label htmlFor="networkFilter" className="mr-2 text-gray-700">Network:</label>
              <select
                id="networkFilter"
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="telecel">Telecel</option>
                <option value="yellow">Yellow</option>
                <option value="mtn">MTN</option>
                <option value="vodafone">Vodafone</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center">
              <label htmlFor="statusFilter" className="mr-2 text-gray-700">Status:</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="waiting">Waiting</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            {/* Orders per page selector */}
            <div className="flex items-center ml-auto">
              <label htmlFor="ordersPerPage" className="mr-2 text-gray-700">Orders per page:</label>
              <select
                id="ordersPerPage"
                value={ordersPerPage}
                onChange={handleOrdersPerPageChange}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="10">10</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
                <option value="2000">2000</option>
              </select>
            </div>
          </div>
          
          {/* Date Filter */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center">
              <label htmlFor="startDate" className="mr-2 text-gray-700">From:</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <label htmlFor="endDate" className="mr-2 text-gray-700">To:</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Today's Orders Button */}
            <button
              onClick={setTodayFilter}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Today's Orders
            </button>
            
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
            >
              Clear All Filters
            </button>
            
            {/* Excel Export Button */}
            <button
              onClick={exportToExcel}
              className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md ml-auto"
            >
              Export to Excel
            </button>
          </div>
          
          {/* Bulk Actions */}
          <div className="flex items-center space-x-4">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Status</option>
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
              className={`px-4 py-2 rounded-md ${
                !bulkStatus || selectedOrders.length === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Update Selected ({selectedOrders.length})
            </button>
          </div>
        </div>
      </div>

      {/* Results summary */}
      <div className="mb-4 text-gray-600">
        Showing {filteredOrders.length} orders (total in database: {totalOrders})
      </div>

      {loading && currentPage === 1 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-lg text-gray-700">Loading...</span>
        </div>
      ) : (
        <>
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 text-lg">No orders found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Use the appropriate ID (geonetReference or id)
                              setSelectedOrders(filteredOrders.map(order => order.geonetReference || order.id));
                            } else {
                              setSelectedOrders([]);
                            }
                          }}
                          checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Buyer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Network
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order, index) => {
                      // Add ref to last element for infinite scrolling
                      const isLastElement = index === filteredOrders.length - 1;
                      // Use the appropriate ID consistently (geonetReference or id)
                      const orderId = order.geonetReference || order.id;
                      
                      return (
                        <tr 
                          key={orderId} 
                          className="hover:bg-gray-50"
                          ref={isLastElement ? lastOrderElementRef : null}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(orderId)}
                              onChange={() => toggleOrderSelection(orderId)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {orderId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.userId?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.capacity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${order.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.network}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.phoneNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <select
                                value={order.status || ""}
                                onChange={(e) => updateOrderStatus(orderId, e.target.value)}
                                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md text-sm"
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
                <div className="flex justify-center items-center p-4 bg-gray-50">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-700">Loading more...</span>
                </div>
              )}
              
              {/* Message when all data is loaded */}
              {!hasMore && filteredOrders.length > ordersPerPage && (
                <div className="p-4 text-center text-gray-600 bg-gray-50">
                  All orders loaded
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminOrders;