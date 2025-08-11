'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminResultCheckers = () => {
  const router = useRouter();
  
  // State Management
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  // Product Management States
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: 'WAEC',
    description: '',
    price: ''
  });
  
  // Inventory Management States
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    checkerType: 'WAEC',
    serialNumber: '',
    pin: ''
  });
  const [bulkUploadData, setBulkUploadData] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState({
    checkerType: '',
    status: '',
    search: ''
  });
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryStats, setInventoryStats] = useState(null);
  
  // Sales States
  const [salesFilter, setSalesFilter] = useState({
    startDate: '',
    endDate: '',
    checkerType: ''
  });
  const [salesSummary, setSalesSummary] = useState([]);

  // Check authentication and dark mode on mount
  useEffect(() => {
    checkAuth();
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    }
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'inventory') {
      fetchInventory();
      fetchInventoryStats();
    } else if (activeTab === 'sales') {
      fetchSales();
    }
  }, [activeTab, inventoryPage, inventoryFilter, salesFilter]);

  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login?redirect=/admin/result-checkers');
      return;
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      headers: {
        'x-auth-token': token
      }
    };
  };

  // Fetch Products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'http://localhost:5000/api/result-checkers/products',
        getAuthHeaders()
      );
      setProducts(response.data.data);
    } catch (err) {
      console.error('Error fetching products:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('authToken');
        router.push('/login');
      } else {
        toast.error('Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch Inventory
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: inventoryPage,
        limit: 50,
        ...(inventoryFilter.checkerType && { checkerType: inventoryFilter.checkerType }),
        ...(inventoryFilter.status && { status: inventoryFilter.status }),
        ...(inventoryFilter.search && { search: inventoryFilter.search })
      });
      
      const response = await axios.get(
        ` http://localhost:5000/api/result-checkers/inventory?${params}`,
        getAuthHeaders()
      );
      setInventory(response.data.data.inventory);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Inventory Stats
  const fetchInventoryStats = async () => {
    try {
      const response = await axios.get(
        ' http://localhost:5000/api/result-checkers/inventory/stats',
        getAuthHeaders()
      );
      setInventoryStats(response.data.data);
    } catch (err) {
      console.error('Error fetching inventory stats:', err);
    }
  };

  // Fetch Sales
  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(salesFilter.startDate && { startDate: salesFilter.startDate }),
        ...(salesFilter.endDate && { endDate: salesFilter.endDate }),
        ...(salesFilter.checkerType && { checkerType: salesFilter.checkerType })
      });
      
      const response = await axios.get(
        `http://localhost:5000/api/result-checkers/sales?${params}`,
        getAuthHeaders()
      );
      setSales(response.data.data.sales);
      setSalesSummary(response.data.data.summary);
    } catch (err) {
      console.error('Error fetching sales:', err);
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  // Handle Product Submit
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await axios.put(
          `http://localhost:5000/api/result-checkers/products/${editingProduct._id}`,
          productForm,
          getAuthHeaders()
        );
        toast.success('Product updated successfully');
      } else {
        await axios.post(
          'http://localhost:5000/api/result-checkers/products',
          productForm,
          getAuthHeaders()
        );
        toast.success('Product created successfully');
      }
      setShowProductModal(false);
      resetProductForm();
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    }
  };

  // Handle Single Inventory Add
  const handleAddInventory = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        'http://localhost:5000/api/result-checkers/inventory/add-single',
        inventoryForm,
        getAuthHeaders()
      );
      toast.success('Checker added to inventory');
      setShowAddInventoryModal(false);
      resetInventoryForm();
      fetchInventory();
      fetchInventoryStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add checker');
    }
  };

  // Handle Bulk Upload
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    try {
      // Parse bulk upload data
      const lines = bulkUploadData.trim().split('\n');
      const checkers = lines.map(line => {
        const [serialNumber, pin] = line.split(',').map(s => s.trim());
        return { serialNumber, pin };
      });

      const response = await axios.post(
        'http://localhost:5000/api/result-checkers/inventory/bulk-upload',
        {
          checkerType: inventoryForm.checkerType,
          checkers
        },
        getAuthHeaders()
      );
      
      toast.success(response.data.message);
      setShowBulkUploadModal(false);
      setBulkUploadData('');
      fetchInventory();
      fetchInventoryStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload checkers');
    }
  };

  // Reset Forms
  const resetProductForm = () => {
    setProductForm({
      name: 'WAEC',
      description: '',
      price: ''
    });
    setEditingProduct(null);
  };

  const resetInventoryForm = () => {
    setInventoryForm({
      checkerType: 'WAEC',
      serialNumber: '',
      pin: ''
    });
  };

  // Format Date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <Head>
        <title>Admin - Result Checkers Management</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Result Checkers Management</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors duration-200 ${
                darkMode 
                  ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' 
                  : 'bg-gray-700 text-white hover:bg-gray-800'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button 
              onClick={() => router.push('/admin/dashboard')}
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-t-lg transition-colors duration-200 ${
              activeTab === 'products'
                ? 'bg-blue-500 text-white'
                : darkMode 
                ? 'bg-gray-800 hover:bg-gray-700' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-t-lg transition-colors duration-200 ${
              activeTab === 'inventory'
                ? 'bg-blue-500 text-white'
                : darkMode 
                ? 'bg-gray-800 hover:bg-gray-700' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-t-lg transition-colors duration-200 ${
              activeTab === 'sales'
                ? 'bg-blue-500 text-white'
                : darkMode 
                ? 'bg-gray-800 hover:bg-gray-700' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Sales Report
          </button>
        </div>

        {/* Content Area */}
        <div className={`rounded-lg shadow-md p-6 transition-colors duration-200 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Products Tab */}
              {activeTab === 'products' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Products</h2>
                    <button
                      onClick={() => setShowProductModal(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
                    >
                      Add Product
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <div key={product._id} className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold">{product.name}</h3>
                            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{product.description}</p>
                            <p className="text-xl font-bold mt-2">GHS {product.price}</p>
                            <div className="mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                product.isActive
                                  ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                                  : darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
                              }`}>
                                {product.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            {product.inventory && (
                              <div className="mt-2 text-sm">
                                <p>Available: {product.inventory.available}</p>
                                <p>Sold: {product.inventory.sold}</p>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setProductForm({
                                name: product.name,
                                description: product.description,
                                price: product.price
                              });
                              setShowProductModal(true);
                            }}
                            className="px-3 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-sm"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory Tab */}
              {activeTab === 'inventory' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Inventory Management</h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowAddInventoryModal(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
                      >
                        Add Single
                      </button>
                      <button
                        onClick={() => setShowBulkUploadModal(true)}
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
                      >
                        Bulk Upload
                      </button>
                    </div>
                  </div>

                  {/* Inventory Stats */}
                  {inventoryStats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {inventoryStats.inventory.map((stat) => (
                        <div key={stat._id} className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <h3 className="font-semibold text-lg">{stat._id} Inventory</h3>
                          <div className="mt-2 space-y-1">
                            {stat.statuses.map((status) => (
                              <div key={status.status} className="flex justify-between">
                                <span className="capitalize">{status.status}:</span>
                                <span className="font-semibold">{status.count}</span>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
                              <div className="flex justify-between font-bold">
                                <span>Total:</span>
                                <span>{stat.total}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inventory Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <select
                      value={inventoryFilter.checkerType}
                      onChange={(e) => setInventoryFilter({...inventoryFilter, checkerType: e.target.value})}
                      className={`p-2 border rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="">All Types</option>
                      <option value="WAEC">WAEC</option>
                      <option value="BECE">BECE</option>
                    </select>
                    <select
                      value={inventoryFilter.status}
                      onChange={(e) => setInventoryFilter({...inventoryFilter, status: e.target.value})}
                      className={`p-2 border rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="">All Status</option>
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                      <option value="reserved">Reserved</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search serial number..."
                      value={inventoryFilter.search}
                      onChange={(e) => setInventoryFilter({...inventoryFilter, search: e.target.value})}
                      className={`p-2 border rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'border-gray-300'
                      }`}
                    />
                    <button
                      onClick={() => {
                        setInventoryFilter({ checkerType: '', status: '', search: '' });
                        setInventoryPage(1);
                      }}
                      className={`px-4 py-2 rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      Clear Filters
                    </button>
                  </div>

                  {/* Inventory Table */}
                  <div className="overflow-x-auto">
                    <table className={`min-w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                      <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                            Type
                          </th>
                          <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                            Serial Number
                          </th>
                          <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                            Status
                          </th>
                          <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                            Sold To
                          </th>
                          <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.map((item) => (
                          <tr key={item._id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              {item.checkerType}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} font-mono`}>
                              {item.serialNumber}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                item.status === 'available'
                                  ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                                  : item.status === 'sold'
                                  ? darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
                                  : darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              {item.soldTo ? (
                                <div>
                                  <p>{item.soldTo.name}</p>
                                  <p className="text-sm text-gray-500">{item.soldTo.phoneNumber}</p>
                                </div>
                              ) : '-'}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              {item.soldAt ? formatDate(item.soldAt) : formatDate(item.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sales Tab */}
              {activeTab === 'sales' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Sales Report</h2>

                  {/* Sales Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <input
                      type="date"
                      value={salesFilter.startDate}
                      onChange={(e) => setSalesFilter({...salesFilter, startDate: e.target.value})}
                      className={`p-2 border rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border-gray-300'
                      }`}
                      placeholder="Start Date"
                    />
                    <input
                      type="date"
                      value={salesFilter.endDate}
                      onChange={(e) => setSalesFilter({...salesFilter, endDate: e.target.value})}
                      className={`p-2 border rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border-gray-300'
                      }`}
                      placeholder="End Date"
                    />
                    <select
                      value={salesFilter.checkerType}
                      onChange={(e) => setSalesFilter({...salesFilter, checkerType: e.target.value})}
                      className={`p-2 border rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="">All Types</option>
                      <option value="WAEC">WAEC</option>
                      <option value="BECE">BECE</option>
                    </select>
                    <button
                      onClick={() => setSalesFilter({ startDate: '', endDate: '', checkerType: '' })}
                      className={`px-4 py-2 rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      Clear Filters
                    </button>
                  </div>

                  {/* Sales Summary */}
                  {salesSummary.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {salesSummary.map((summary) => (
                        <div key={summary._id} className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <h3 className="font-semibold text-lg">{summary._id} Sales</h3>
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between">
                              <span>Total Sales:</span>
                              <span className="font-semibold">{summary.totalSales}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Revenue:</span>
                              <span className="font-semibold">GHS {summary.totalRevenue.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sales Table */}
                  <div className="overflow-x-auto">
                    <table className={`min-w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                      <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                            Reference
                          </th>
                          <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                            Customer
                          </th>
                          <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                            Type
                          </th>
                          <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                            Serial Number
                          </th>
                          <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                            Price
                          </th>
                          <th className={`px-6 py-3 border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-left text-xs font-semibold uppercase tracking-wider`}>
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((sale) => (
                          <tr key={sale._id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} font-mono text-sm`}>
                              {sale.purchaseReference}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              <div>
                                <p>{sale.userId.name}</p>
                                <p className="text-sm text-gray-500">{sale.userId.phoneNumber}</p>
                              </div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              {sale.checkerType}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} font-mono`}>
                              {sale.serialNumber}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              GHS {sale.price.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              {formatDate(sale.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <form onSubmit={handleProductSubmit}>
              <div className="mb-4">
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Type</label>
                <select
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  disabled={editingProduct}
                >
                  <option value="WAEC">WAEC</option>
                  <option value="BECE">BECE</option>
                </select>
              </div>
              <div className="mb-4">
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  rows="3"
                  required
                />
              </div>
              <div className="mb-4">
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Price (GHS)</label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    resetProductForm();
                  }}
                  className={`px-4 py-2 rounded-md ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Inventory Modal */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">Add Single Checker</h2>
            <form onSubmit={handleAddInventory}>
              <div className="mb-4">
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Type</label>
                <select
                  value={inventoryForm.checkerType}
                  onChange={(e) => setInventoryForm({...inventoryForm, checkerType: e.target.value})}
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                >
                  <option value="WAEC">WAEC</option>
                  <option value="BECE">BECE</option>
                </select>
              </div>
              <div className="mb-4">
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Serial Number</label>
                <input
                  type="text"
                  value={inventoryForm.serialNumber}
                  onChange={(e) => setInventoryForm({...inventoryForm, serialNumber: e.target.value})}
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  required
                />
              </div>
              <div className="mb-4">
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>PIN</label>
                <input
                  type="text"
                  value={inventoryForm.pin}
                  onChange={(e) => setInventoryForm({...inventoryForm, pin: e.target.value})}
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddInventoryModal(false);
                    resetInventoryForm();
                  }}
                  className={`px-4 py-2 rounded-md ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Add Checker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">Bulk Upload Checkers</h2>
            <form onSubmit={handleBulkUpload}>
              <div className="mb-4">
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Type</label>
                <select
                  value={inventoryForm.checkerType}
                  onChange={(e) => setInventoryForm({...inventoryForm, checkerType: e.target.value})}
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                >
                  <option value="WAEC">WAEC</option>
                  <option value="BECE">BECE</option>
                </select>
              </div>
              <div className="mb-4">
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Checkers Data (one per line: serialNumber,pin)
                </label>
                <textarea
                  value={bulkUploadData}
                  onChange={(e) => setBulkUploadData(e.target.value)}
                  className={`w-full p-2 border rounded-md font-mono text-sm ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  rows="10"
                  placeholder="WAE2024001234,5678901234
WAE2024001235,5678901235
WAE2024001236,5678901236"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkUploadModal(false);
                    setBulkUploadData('');
                  }}
                  className={`px-4 py-2 rounded-md ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Upload Checkers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminResultCheckers;