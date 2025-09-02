// app/shop/[storeSlug]/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag, Star, TrendingUp, Clock, Shield, Award,
  ChevronRight, Package, Zap, Users, Heart, ArrowRight,
  Wifi, Smartphone, Globe, CheckCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

export default function StorePage() {
  const params = useParams();
  const router = useRouter();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchStoreData();
  }, [params.storeSlug]);

  const fetchStoreData = async () => {
    try {
      // Fetch store details
      const storeResponse = await fetch(`${API_BASE}/agent-stores/store/${params.storeSlug}`);
      const storeData = await storeResponse.json();
      
      if (storeData.status === 'success') {
        setStore(storeData.data);
        
        // Fetch products
        const productsResponse = await fetch(`${API_BASE}/agent-stores/stores/${params.storeSlug}/products`);
        const productsData = await productsResponse.json();
        
        if (productsData.status === 'success') {
          setProducts(productsData.data?.products || []);
        }
      }
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const featuredProducts = products.filter(p => p.featured || p.isOnSale).slice(0, 4);
  const categories = ['all', ...new Set(products.map(p => p.network))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="relative z-10 px-8 py-16 lg:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Welcome to {store?.storeName}
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              {store?.storeDescription || 'Your trusted source for affordable data bundles'}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href={`/shop/${params.storeSlug}/products`}
                className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Shop Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              {store?.whatsappSettings?.groupLink && (
                <a 
                  href={store.whatsappSettings.groupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
                >
                  Join WhatsApp Group
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-black opacity-10"></div>
      </section>

      {/* Trust Indicators */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Shield, label: 'Secure Payment', value: '100% Safe' },
          { icon: Zap, label: 'Instant Delivery', value: 'Within Minutes' },
          { icon: Users, label: 'Happy Customers', value: `${store?.metrics?.totalCustomers || 0}+` },
          { icon: Award, label: 'Verified Store', value: 'Trusted Seller' }
        ].map((item, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 text-center">
            <item.icon className="w-8 h-8 mx-auto mb-3 text-blue-600" />
            <p className="text-sm text-gray-600 mb-1">{item.label}</p>
            <p className="font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
              <p className="text-gray-600 mt-1">Special offers and popular bundles</p>
            </div>
            <Link 
              href={`/shop/${params.storeSlug}/products`}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              View All
              <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product._id} product={product} storeSlug={params.storeSlug} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Network</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {['YELLO', 'TELECEL', 'AT_PREMIUM', 'at'].map((network) => {
            const networkProducts = products.filter(p => p.network === network);
            const networkColors = {
              'YELLO': 'from-yellow-400 to-yellow-600',
              'TELECEL': 'from-red-400 to-red-600',
              'AT_PREMIUM': 'from-purple-400 to-purple-600',
              'at': 'from-blue-400 to-blue-600'
            };
            
            return (
              <Link
                key={network}
                href={`/shop/${params.storeSlug}/products?network=${network}`}
                className="relative group overflow-hidden rounded-xl"
              >
                <div className={`bg-gradient-to-br ${networkColors[network]} p-6 h-32 flex flex-col justify-between transition-transform group-hover:scale-105`}>
                  <div>
                    <Wifi className="w-8 h-8 text-white mb-2" />
                    <h3 className="text-white font-semibold text-lg">
                      {network === 'YELLO' ? 'MTN' : network === 'at' ? 'AirtelTigo' : network}
                    </h3>
                  </div>
                  <p className="text-white/90 text-sm">
                    {networkProducts.length} products
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-gray-50 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Why Choose {store?.storeName}?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: CheckCircle,
              title: 'Best Prices',
              description: 'Competitive rates on all data bundles with regular promotions'
            },
            {
              icon: Clock,
              title: 'Fast Delivery',
              description: 'Instant activation of your data bundles, available 24/7'
            },
            {
              icon: Heart,
              title: 'Customer Support',
              description: 'Dedicated support via WhatsApp for all your queries'
            }
          ].map((item, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <item.icon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Promotions */}
      {store?.marketing?.promotions?.filter(p => p.active).length > 0 && (
        <section className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Active Promotions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {store.marketing.promotions.filter(p => p.active).map((promo, index) => (
              <div key={index} className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-lg">{promo.code}</span>
                  <span className="bg-white/20 px-2 py-1 rounded text-sm">
                    {promo.type === 'percentage' ? `${promo.discount}% OFF` : `₵${promo.discount} OFF`}
                  </span>
                </div>
                <p className="text-white/80 text-sm">
                  Valid until {new Date(promo.validTo).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Join thousands of satisfied customers enjoying affordable data
        </p>
        <Link
          href={`/shop/${params.storeSlug}/products`}
          className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg"
        >
          Browse All Products
          <ArrowRight className="w-6 h-6 ml-2" />
        </Link>
      </section>
    </div>
  );
}

// Product Card Component
function ProductCard({ product, storeSlug }) {
  const router = useRouter();
  
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
         onClick={() => router.push(`/shop/${storeSlug}/products`)}>
      <div className="p-6">
        {product.isOnSale && (
          <span className="inline-block px-2 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded mb-2">
            SALE
          </span>
        )}
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
              {product.network}
            </span>
            <h3 className="text-lg font-semibold mt-2 text-gray-900">{product.capacity}GB</h3>
            {product.displayName && (
              <p className="text-sm text-gray-600 mt-1">{product.displayName}</p>
            )}
          </div>
          {product.featured && (
            <Star className="w-5 h-5 text-yellow-500" />
          )}
        </div>
        
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <div>
              {product.isOnSale && product.salePrice ? (
                <>
                  <span className="text-2xl font-bold text-gray-900">₵{product.salePrice.toFixed(2)}</span>
                  <span className="text-sm text-gray-500 line-through ml-2">₵{product.sellingPrice.toFixed(2)}</span>
                </>
              ) : (
                <span className="text-2xl font-bold text-gray-900">₵{product.sellingPrice.toFixed(2)}</span>
              )}
            </div>
            <button className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
              Buy Now
            </button>
          </div>
        </div>
        
        {product.inStock === false && (
          <div className="mt-3 px-2 py-1 bg-red-100 text-red-700 text-xs text-center rounded">
            Out of Stock
          </div>
        )}
      </div>
    </div>
  );
}