// app/shop/[storeSlug]/products/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Filter, Search, ShoppingCart, Star, Info, X,
  ChevronDown, Package, Zap, Shield
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

export default function ProductsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState(searchParams.get('network') || 'all');
  const [sortBy, setSortBy] = useState('price_low');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [params.storeSlug]);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, selectedNetwork, sortBy, searchTerm]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/agent-stores/stores/${params.storeSlug}/products`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setProducts(data.data?.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];
    
    if (selectedNetwork !== 'all') {
      filtered = filtered.filter(p => p.network === selectedNetwork);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.capacity.toString().includes(searchTerm) ||
        p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.network.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.sellingPrice - b.sellingPrice);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.sellingPrice - a.sellingPrice);
        break;
      case 'capacity_low':
        filtered.sort((a, b) => a.capacity - b.capacity);
        break;
      case 'capacity_high':
        filtered.sort((a, b) => b.capacity - a.capacity);
        break;
    }
    
    setFilteredProducts(filtered);
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    
    if (!selectedProduct || !phoneNumber || !email || !customerName) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/agent-stores/stores/${params.storeSlug}/purchase/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: selectedProduct._id,
          phoneNumber,
          customerEmail: email,
          customerName,
          quantity: 1
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data.authorizationUrl) {
        window.location.href = data.data.authorizationUrl;
      } else {
        alert('Failed to initialize payment');
      }
    } catch (error) {
      alert('Error processing purchase: ' + error.message);
    }
  };

  const networks = ['all', ...new Set(products.map(p => p.network))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Data Bundles</h1>
        <p className="text-gray-600 dark:text-gray-400">Choose from our wide range of affordable data packages</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          
          {/* Network Filter */}
          <div className="flex gap-2 flex-wrap">
            {networks.map((network) => (
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
                 network === 'YELLO' ? 'MTN' :
                 network === 'at' ? 'AirtelTigo' : network}
              </button>
            ))}
          </div>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="capacity_low">Size: Small to Large</option>
            <option value="capacity_high">Size: Large to Small</option>
          </select>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{filteredProducts.length} products found</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Zap className="w-4 h-4 mr-1 text-yellow-500 dark:text-yellow-400" />
              Instant Delivery
            </div>
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-1 text-green-500 dark:text-green-400" />
              Secure Payment
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Network Badge */}
              <div className="flex justify-between items-start mb-3">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  product.network === 'YELLO' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                  product.network === 'TELECEL' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                  product.network === 'AT_PREMIUM' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' :
                  'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                }`}>
                  {product.network === 'YELLO' ? 'MTN' : 
                   product.network === 'at' ? 'AirtelTigo' : product.network}
                </span>
                {product.featured && (
                  <Star className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                )}
              </div>
              
              {/* Product Info */}
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{product.capacity}GB</h3>
                {product.displayName && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{product.displayName}</p>
                )}
                {product.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{product.description}</p>
                )}
              </div>
              
              {/* Price */}
              <div className="mb-4">
                {product.isOnSale && product.salePrice ? (
                  <div>
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">₵{product.salePrice.toFixed(2)}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 line-through ml-2">₵{product.sellingPrice.toFixed(2)}</span>
                    <div className="mt-1">
                      <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded">
                        Save ₵{(product.sellingPrice - product.salePrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">₵{product.sellingPrice.toFixed(2)}</span>
                )}
              </div>
              
              {/* Features */}
              <div className="space-y-1 mb-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <Package className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                  Valid for 30 days
                </div>
                <div className="flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                  Instant activation
                </div>
              </div>
              
              {/* Action Button */}
              {product.inStock ? (
                <button
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowPurchaseModal(true);
                  }}
                  className="w-full py-2 bg-blue-600 dark:bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buy Now
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold rounded-lg cursor-not-allowed"
                >
                  Out of Stock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No products found</h3>
          <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or search term</p>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Complete Purchase</h2>
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setSelectedProduct(null);
                  setPhoneNumber('');
                  setEmail('');
                  setCustomerName('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Product Summary */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{selectedProduct.network}</span>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{selectedProduct.capacity}GB Data Bundle</h3>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  ₵{selectedProduct.sellingPrice.toFixed(2)}
                </span>
              </div>
            </div>
            
            <form onSubmit={handlePurchase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number (for data)</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="0241234567"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Receipt will be sent to this email</p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSelectedProduct(null);
                  }}
                  className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 dark:bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Proceed to Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 