'use client'

import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Search, AlertCircle, X } from 'lucide-react';
import axios from 'axios';

const BundlePriceList = () => {
  const [bundleData, setBundleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const bundleTypes = [
    'mtnup2u',
    'mtn-justforu',
    'AT-ishare',
    'Telecel-5959',
    'AfA-registration',
  ];

  useEffect(() => {
    fetchAllBundles();
  }, []);

  const fetchAllBundles = async () => {
    setRefreshing(true);
    setLoading(true);
    
    try {
      const token = localStorage.getItem('igettoken');
      const results = {};
      
      // Fetch all bundle types in parallel
      const requests = bundleTypes.map(type => 
        axios.get(`https://iget.onrender.com/api/iget/bundle/${type}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => {
          results[type] = response.data.data;
        })
        .catch(err => {
          console.error(`Error fetching ${type} bundles:`, err);
          results[type] = []; // Set empty array for failed requests
        })
      );
      
      await Promise.all(requests);
      setBundleData(results);
    } catch (err) {
      setError('Failed to fetch bundle data. Please try again.');
      console.error('Bundle fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredBundleTypes = searchTerm 
    ? bundleTypes.filter(type => type.toLowerCase().includes(searchTerm.toLowerCase()))
    : bundleTypes;

  const filteredBundles = (type) => {
    const bundles = bundleData[type] || [];
    if (!searchTerm) return bundles;
    
    return bundles.filter(bundle => 
      bundle.capacity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bundle.price.toString().includes(searchTerm)
    );
  };

  const showAnyResults = filteredBundleTypes.some(type => filteredBundles(type).length > 0);

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Bundle Prices</h1>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <input
              type="text"
              placeholder="Search bundles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-full"
            />
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          
          <button
            onClick={fetchAllBundles}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-grow">{error}</span>
          <button onClick={() => setError('')} className="flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!showAnyResults && !loading && (
        <div className="bg-yellow-50 p-4 rounded-lg flex items-center gap-2 text-yellow-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>
            {searchTerm 
              ? `No bundles found matching "${searchTerm}". Try a different search term.`
              : 'No bundles found. Try refreshing the page.'}
          </span>
        </div>
      )}

      <div className="space-y-6">
        {filteredBundleTypes.map((type) => {
          const bundles = filteredBundles(type);
          if (bundles.length === 0) return null;
          
          return (
            <div key={type} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 bg-blue-50">
                <h2 className="text-xl font-semibold">{type}</h2>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {bundles.map((bundle) => (
                    <div 
                      key={bundle._id}
                      className="bg-gray-50 p-4 rounded-lg"
                    >
                      <div className="flex flex-col">
                        <span className="text-lg font-semibold">{bundle.capacity}</span>
                        <div className="text-gray-700 font-medium mt-2">
                          GH¢ {parseFloat(bundle.price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BundlePriceList;