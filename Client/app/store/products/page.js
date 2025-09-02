// ProductsPage.jsx
'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit, Eye, EyeOff, Package, TrendingUp, X, AlertCircle } from 'lucide-react';

// API utility function - consistent with other components
const API_BASE = 'http://localhost:5000/api/v1';

const apiCall = async (endpoint, method = 'GET', body = null) => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const config = {
    method,
    headers: {
      'x-auth-token': token,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    throw new Error('Session expired. Please login again.');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.msg || 'Request failed');
  }
  
  return data;
};

// Official pricing structure
const OFFICIAL_PRICING = {
  'YELLO': {
    '1': 4.50, '2': 9.20, '3': 13.50, '4': 18.50, '5': 23.50,
    '6': 27.00, '8': 35.50, '10': 43.50, '15': 62.50, '20': 83.00,
    '25': 105.00, '30': 129.00, '40': 166.00, '50': 207.00, '100': 407.00
  },
  'TELECEL': {
    '5': 19.50, '8': 34.64, '10': 36.50, '12': 43.70, '15': 52.85,
    '20': 69.80, '25': 86.75, '30': 103.70, '35': 120.65, '40': 137.60,
    '45': 154.55, '50': 171.50, '100': 341.00
  },
  'AT_PREMIUM': {
    '1': 3.95, '2': 8.35, '3': 13.25, '4': 16.50, '5': 19.50,
    '6': 23.50, '8': 30.50, '10': 38.50, '12': 45.50, '15': 57.50,
    '25': 95.00, '30': 115.00, '40': 151.00, '50': 190.00
  },
  'at': {
    '1': 3.95, '2': 8.35, '3': 13.25, '4': 16.50, '5': 19.50,
    '6': 23.50, '8': 30.50, '10': 38.50, '12': 45.50, '15': 57.50,
    '25': 95.00, '30': 115.00, '40': 151.00, '50': 190.00
  }
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [store, setStore] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState('all');

  useEffect(() => {
    fetchStoreAndProducts();
  }, []);

  const fetchStoreAndProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      
      // First get the user's store
      const storeResponse = await apiCall('/agent-stores/stores/my-store');
      
      if (storeResponse.status === 'success' && storeResponse.data) {
        setStore(storeResponse.data);
        
        // Check if store is active
        if (storeResponse.data.status !== 'active') {
          setError('Your store needs to be approved before you can add products.');
          setLoading(false);
          return;
        }
        
        // Then fetch products for this store (public endpoint)
        const productsResponse = await fetch(
          `${API_BASE}/agent-stores/stores/${storeResponse.data.storeSlug}/products`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        const productsData = await productsResponse.json();
        
        if (productsData.status === 'success') {
          setProducts(productsData.data?.products || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.message.includes('Session expired')) {
        window.location.href = '/login';
      } else if (error.message.includes('No store found')) {
        window.location.href = '/store/create';
      } else {
        setError(error.message || 'Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleProductStatus = async (productId, currentStatus) => {
    try {
      // This endpoint might need to be created in backend
      // For now, we'll update the product with new status
      const productToUpdate = products.find(p => p._id === productId);
      if (!productToUpdate) return;

      const updatedProduct = {
        ...productToUpdate,
        isActive: !currentStatus
      };

      await saveProduct(updatedProduct);
      await fetchStoreAndProducts();
    } catch (error) {
      alert('Error updating product status: ' + error.message);
    }
  };

  const saveProduct = async (productData) => {
    try {
      const response = await apiCall(
        `/agent-stores/stores/${store._id}/products`,
        'POST',
        {
          products: [{
            network: productData.network,
            capacity: productData.capacity,
            sellingPrice: productData.sellingPrice,
            displayName: productData.displayName,
            description: productData.description,
            isActive: productData.isActive !== undefined ? productData.isActive : true
          }]
        }
      );

      if (response.status === 'success') {
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  };

  const filteredProducts = selectedNetwork === 'all' 
    ? products 
    : products.filter(p => p.network === selectedNetwork);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Notice</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          {store?.status === 'pending_approval' && (
            <button
              onClick={() => window.location.href = '/store/dashboard'}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Products</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your product catalog and pricing</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Store: {store?.storeName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Total Products: {products.length}
            </p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 flex-wrap">
            {['all', 'YELLO', 'TELECEL', 'AT_PREMIUM', 'at'].map((network) => (
              <button
                key={network}
                onClick={() => setSelectedNetwork(network)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedNetwork === network
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {network === 'all' ? 'All Networks' : 
                 network === 'YELLO' ? 'MTN (Yello)' :
                 network === 'at' ? 'AirtelTigo' :
                 network}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <ProductCard 
            key={product._id}
            product={product}
            onToggleStatus={toggleProductStatus}
            onEdit={() => {
              setEditingProduct(product);
              setShowModal(true);
            }}
          />
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {selectedNetwork === 'all' 
                ? 'No products added yet' 
                : `No ${selectedNetwork} products added yet`}
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Add Your First Product
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          store={store}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSave={() => {
            fetchStoreAndProducts();
            setShowModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ product, onToggleStatus, onEdit }) {
  const profitPercentage = ((product.profit / product.basePrice) * 100).toFixed(1);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-medium rounded">
              {product.network}
            </span>
            <h3 className="text-lg font-semibold mt-2 text-gray-900 dark:text-gray-100">
              {product.capacity}GB
            </h3>
            {product.displayName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{product.displayName}</p>
            )}
          </div>
          <button
            onClick={() => onToggleStatus(product._id, product.isActive)}
            className={`p-2 rounded-lg transition-colors ${
              product.isActive 
                ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50' 
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title={product.isActive ? 'Product is visible' : 'Product is hidden'}
          >
            {product.isActive ? (
              <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            )}
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Base Price:</span>
            <span className="text-gray-700 dark:text-gray-300">₵{product.basePrice?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Your Price:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">₵{product.sellingPrice?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Profit:</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              ₵{product.profit?.toFixed(2)} ({profitPercentage}%)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Sold:</span>
            <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">{product.totalSold || 0}</span>
          </div>
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <Edit className="w-3 h-3" />
            Edit
          </button>
        </div>

        {product.inStock === false && (
          <div className="mt-3 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs text-center rounded">
            Out of Stock
          </div>
        )}
      </div>
    </div>
  );
}

// Product Modal Component
function ProductModal({ product, store, onClose, onSave }) {
  const [formData, setFormData] = useState({
    network: product?.network || 'YELLO',
    capacity: product?.capacity || '',
    sellingPrice: product?.sellingPrice || '',
    displayName: product?.displayName || '',
    description: product?.description || ''
  });
  const [basePrice, setBasePrice] = useState(0);
  const [profit, setProfit] = useState(0);
  const [profitMargin, setProfitMargin] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Calculate base price when network or capacity changes
    if (formData.network && formData.capacity) {
      const price = OFFICIAL_PRICING[formData.network]?.[formData.capacity];
      if (price) {
        setBasePrice(price);
        if (formData.sellingPrice) {
          const calculatedProfit = formData.sellingPrice - price;
          setProfit(calculatedProfit);
          setProfitMargin(((calculatedProfit / price) * 100).toFixed(1));
        }
      }
    }
  }, [formData.network, formData.capacity, formData.sellingPrice]);

  const validatePrice = () => {
    if (!formData.sellingPrice || formData.sellingPrice <= 0) {
      setError('Please enter a valid selling price');
      return false;
    }

    if (formData.sellingPrice < basePrice) {
      setError(`Selling price cannot be less than base price (₵${basePrice.toFixed(2)})`);
      return false;
    }

    const markup = ((formData.sellingPrice - basePrice) / basePrice) * 100;
    
    // Check store commission settings
    const minMarkup = store?.commissionSettings?.minimumMarkup || 5;
    const maxMarkup = store?.commissionSettings?.maximumMarkup || 50;

    if (markup < minMarkup) {
      setError(`Minimum markup is ${minMarkup}%. Your current markup is ${markup.toFixed(1)}%`);
      return false;
    }

    if (markup > maxMarkup) {
      setError(`Maximum markup is ${maxMarkup}%. Your current markup is ${markup.toFixed(1)}%`);
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePrice()) {
      return;
    }

    setSaving(true);
    
    try {
      const response = await apiCall(
        `/agent-stores/stores/${store._id}/products`,
        'POST',
        {
          products: [{
            network: formData.network,
            capacity: formData.capacity,
            sellingPrice: formData.sellingPrice,
            displayName: formData.displayName,
            description: formData.description
          }]
        }
      );

      if (response.status === 'success') {
        onSave();
      }
    } catch (error) {
      setError(error.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const availableCapacities = Object.keys(OFFICIAL_PRICING[formData.network] || {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Network</label>
            <select
              value={formData.network}
              onChange={(e) => {
                setFormData({...formData, network: e.target.value, capacity: ''});
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
              disabled={!!product}
            >
              <option value="YELLO">MTN (Yello)</option>
              <option value="TELECEL">Telecel</option>
              <option value="AT_PREMIUM">AT Premium</option>
              <option value="at">AirtelTigo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Data Bundle Size</label>
            <select
              value={formData.capacity}
              onChange={(e) => {
                setFormData({...formData, capacity: e.target.value});
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
              disabled={!!product}
            >
              <option value="">Select size</option>
              {availableCapacities.map(cap => (
                <option key={cap} value={cap}>{cap}GB</option>
              ))}
            </select>
          </div>

          {basePrice > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Base Price: <span className="font-semibold text-gray-900 dark:text-gray-100">₵{basePrice.toFixed(2)}</span>
              </p>
              {store?.commissionSettings && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Allowed markup: {store.commissionSettings.minimumMarkup}% - {store.commissionSettings.maximumMarkup}%
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Your Selling Price (₵)</label>
            <input
              type="number"
              step="0.01"
              value={formData.sellingPrice}
              onChange={(e) => {
                setFormData({...formData, sellingPrice: parseFloat(e.target.value) || 0});
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
              min={basePrice}
            />
            {profit > 0 && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <p className="text-sm text-green-700 dark:text-green-400">
                  Profit: ₵{profit.toFixed(2)} ({profitMargin}% markup)
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({...formData, displayName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="e.g., Super Fast Bundle"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows="3"
              placeholder="Add product description..."
              maxLength={200}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.description.length}/200 characters
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={saving || !formData.network || !formData.capacity || !formData.sellingPrice}
              className="flex-1 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}