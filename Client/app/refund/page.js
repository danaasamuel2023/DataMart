"use client";
import { useEffect, useState } from "react";

const YelloOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(50);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchOrders = async () => {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        alert("Unauthorized access!");
        return;
      }

      try {
        // Fetch all orders and filter on client side for YELLO network with 1GB capacity
        const res = await fetch(`http://localhost:5000/api/orders?page=${currentPage}&limit=${ordersPerPage}`, {
          headers: {
            'x-auth-token': authToken
          }
        });

        if (!res.ok) {
          throw new Error("Failed to fetch orders");
        }

        const data = await res.json();
        
        // Filter for only YELLO network with 1GB capacity
        const filteredOrders = data.orders.filter(order => 
          order.network === "YELLO" && order.capacity === 1
        );
        
        setOrders(filteredOrders);
        
        // Calculate total orders and pages for pagination
        setTotalOrders(filteredOrders.length);
        setTotalPages(Math.ceil(filteredOrders.length / ordersPerPage));
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders([]); // Ensure state is always an array
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentPage, ordersPerPage]);

  const updateOrderStatus = async (orderId, newStatus) => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      alert("Unauthorized access!");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order
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
      // Create an array of promises for each order update
      const updatePromises = selectedOrders.map(orderId => 
        fetch(`http://localhost:5000/api/orders/${orderId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ status: bulkStatus }),
        })
      );

      // Wait for all updates to complete
      const results = await Promise.all(updatePromises);
      
      // Check if all updates were successful
      const allSuccessful = results.every(res => res.ok);
      
      if (allSuccessful) {
        // Update the local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            selectedOrders.includes(order.id) 
              ? { ...order, status: bulkStatus } 
              : order
          )
        );
        
        // Clear selections
        setSelectedOrders([]);
        setBulkStatus("");
        
        alert(`Successfully updated ${selectedOrders.length} orders!`);
      } else {
        alert("Some orders failed to update. Please check and try again.");
      }
    } catch (error) {
      console.error("Error performing bulk update:", error);
      alert("Error updating orders. Please try again.");
    }
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Reset selected orders when changing pages
    setSelectedOrders([]);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle orders per page change
  const handleOrdersPerPageChange = (e) => {
    const value = parseInt(e.target.value);
    setOrdersPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">YELLO Network 1GB Orders</h1>
      
      {/* Bulk Actions */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-4">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Status</option>
              <option value="pending">Pending</option>
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
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results summary */}
      <div className="mb-4 text-gray-600">
        Showing {orders.length} YELLO 1GB orders
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-lg text-gray-700">Loading...</span>
        </div>
      ) : (
        <>
          {orders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 text-lg">No YELLO 1GB orders found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-yellow-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrders(orders.map(order => order.id));
                            } else {
                              setSelectedOrders([]);
                            }
                          }}
                          checked={selectedOrders.length === orders.length && orders.length > 0}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Buyer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
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
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-yellow-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.geonetReference || order.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.userId?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${order.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.createdAt)}
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
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="completed">Completed</option>
                            </select>
                            <button
                              onClick={() => updateOrderStatus(order.id, order.status)}
                              className="px-3 py-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-md text-sm"
                            >
                              Update
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Page <span className="font-medium">{currentPage}</span> of{" "}
                        <span className="font-medium">{totalPages}</span> pages
                      </p>
                    </div>
                    <div>
                      <nav className="flex items-center space-x-2">
                        <button
                          onClick={() => paginate(Math.max(currentPage - 1, 1))}
                          disabled={currentPage === 1}
                          className={`px-3 py-1 rounded-md ${
                            currentPage === 1
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                        >
                          Previous
                        </button>
                        
                        {/* Page numbers */}
                        <div className="hidden md:flex space-x-1">
                          {[...Array(Math.min(5, totalPages)).keys()].map(i => {
                            // Calculate page number based on current page
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => paginate(pageNum)}
                                className={`px-3 py-1 rounded-md ${
                                  currentPage === pageNum
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => paginate(Math.min(currentPage + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 rounded-md ${
                            currentPage === totalPages
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default YelloOrders;