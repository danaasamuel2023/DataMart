'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import axios from 'axios';
import { toast } from 'react-toastify';

const SMMServices = () => {
  const router = useRouter();
  
  // State
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedService, setSelectedService] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    ourRate: 0,
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [categories, setCategories] = useState([]);

  // Check for dark mode preference
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
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

  // Fetch services on mount
  useEffect(() => {
    checkAuth();
    fetchServices();
  }, []);

  // Check authentication
  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login?redirect=/admin/smm-services');
      return;
    }
  };

  // Fetch services
  const fetchServices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(
        'http://localhost:5000/api/smm/services',
        {
          headers: { 'x-auth-token': token }
        }
      );
      
      if (response.data.success) {
        setServices(response.data.services);
        // Extract unique categories
        const cats = Object.keys(response.data.services);
        setCategories(['all', ...cats]);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit modal
  const openEditModal = (service) => {
    setSelectedService(service);
    setEditForm({
      ourRate: service.ourRate,
      isActive: service.isActive
    });
    setShowEditModal(true);
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.put(
        `http://localhost:5000/api/smm/admin/service/${selectedService.serviceId}`,
        editForm,
        {
          headers: { 'x-auth-token': token }
        }
      );
      
      if (response.data.success) {
        toast.success('Service updated successfully');
        // Update local state
        const updatedServices = { ...services };
        Object.keys(updatedServices).forEach(category => {
          updatedServices[category] = updatedServices[category].map(service => 
            service.serviceId === selectedService.serviceId 
              ? { ...service, ...editForm }
              : service
          );
        });
        setServices(updatedServices);
        setShowEditModal(false);
      }
    } catch (err) {
      console.error('Error updating service:', err);
      toast.error(err.response?.data?.error || 'Failed to update service');
    } finally {
      setSaving(false);
    }
  };

  // Calculate profit percentage
  const calculateProfitPercentage = (cost, sell) => {
    return ((sell - cost) / cost * 100).toFixed(2);
  };

  // Filter services
  const getFilteredServices = () => {
    let filteredServices = {};
    
    if (selectedCategory === 'all') {
      filteredServices = services;
    } else {
      filteredServices = { [selectedCategory]: services[selectedCategory] || [] };
    }
    
    if (searchTerm) {
      const newFiltered = {};
      Object.keys(filteredServices).forEach(category => {
        const filtered = filteredServices[category].filter(service =>
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filtered.length > 0) {
          newFiltered[category] = filtered;
        }
      });
      return newFiltered;
    }
    
    return filteredServices;
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const filteredServices = getFilteredServices();

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8">
        <Head>
          <title>SMM Services Management - Admin</title>
        </Head>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">SMM Services Management</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-colors duration-200 ${
                darkMode 
                  ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' 
                  : 'bg-gray-700 text-white hover:bg-gray-800'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button 
              onClick={() => router.push('/admin/smm-settings')}
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Back to Settings
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={`rounded-lg shadow-md p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Search Services
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or type..."
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'border-gray-300'
                }`}
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Filter by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'border-gray-300'
                }`}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Services List */}
        {Object.keys(filteredServices).length === 0 ? (
          <div className={`rounded-lg shadow-md p-6 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No services found</p>
          </div>
        ) : (
          Object.keys(filteredServices).map(category => (
            <div key={category} className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{category}</h2>
              <div className={`rounded-lg shadow-md overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          ID
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Service Name
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Type
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Min/Max
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Cost Price
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Our Price
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Profit
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Features
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Status
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}>
                      {filteredServices[category].map((service) => (
                        <tr key={service._id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {service.serviceId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium">{service.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {service.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {service.min} - {service.max}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            ${service.rate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium">
                              ${service.ourRate}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="font-medium text-green-600">
                                ${(service.ourRate - service.rate).toFixed(2)}
                              </div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {calculateProfitPercentage(service.rate, service.ourRate)}%
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              {service.refill && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Refill
                                </span>
                              )}
                              {service.cancel && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  Cancel
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              service.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {service.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => openEditModal(service)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">Edit Service</h2>
            
            <div className="mb-4">
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                Service: {selectedService.name}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Cost Price: ${selectedService.rate}
              </p>
            </div>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Our Price (per 1000)
              </label>
              <input
                type="number"
                value={editForm.ourRate}
                onChange={(e) => setEditForm({ ...editForm, ourRate: parseFloat(e.target.value) })}
                min={selectedService.rate}
                step="0.01"
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'border-gray-300'
                }`}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Profit: ${(editForm.ourRate - selectedService.rate).toFixed(2)} 
                ({calculateProfitPercentage(selectedService.rate, editForm.ourRate)}%)
              </p>
            </div>
            
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="mr-2"
                />
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                  Service is active
                </span>
              </label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowEditModal(false)}
                className={`px-4 py-2 rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .dark-mode {
          background-color: #111827;
          color: #f3f4f6;
        }
      `}</style>
    </div>
  );
};

export default SMMServices;