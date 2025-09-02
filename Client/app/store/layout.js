// app/shop/[storeSlug]/layout.jsx
'use client';
import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Store, ShoppingCart, Phone, MessageCircle, Clock, MapPin,
  Facebook, Instagram, Twitter, Star, Menu, X, Package,
  ChevronRight, Mail, Globe, Award, Users, Shield
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

export default function StoreLayout({ children }) {
  const params = useParams();
  const pathname = usePathname();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetchStore();
  }, [params.storeSlug]);

  const fetchStore = async () => {
    try {
      const response = await fetch(`${API_BASE}/agent-stores/store/${params.storeSlug}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setStore(data.data);
        applyStoreTheme(data.data);
      }
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyStoreTheme = (storeData) => {
    if (storeData.customization) {
      const { primaryColor, secondaryColor, theme } = storeData.customization;
      
      document.documentElement.style.setProperty('--primary-color', primaryColor || '#1976d2');
      document.documentElement.style.setProperty('--secondary-color', secondaryColor || '#dc004e');
      
      if (storeData.customization.customCSS) {
        const styleElement = document.createElement('style');
        styleElement.textContent = storeData.customization.customCSS;
        document.head.appendChild(styleElement);
      }
    }
  };

  const isStoreOpen = () => {
    if (!store || !store.isOpen) return false;
    
    if (!store.autoCloseOutsideHours) return true;
    
    const now = new Date();
    const dayName = now.toLocaleLowerCase('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5);
    
    const todayHours = store.businessHours[dayName];
    if (!todayHours || !todayHours.isOpen) return false;
    
    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  };

  const navItems = [
    { href: `/shop/${params.storeSlug}`, label: 'Home', icon: Store },
    { href: `/shop/${params.storeSlug}/products`, label: 'Products', icon: Package },
    { href: `/shop/${params.storeSlug}/about`, label: 'About', icon: Users },
    { href: `/shop/${params.storeSlug}/contact`, label: 'Contact', icon: Phone }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading store...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Store className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Store Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">This store doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Banner */}
      {store.storeBanner && (
        <div 
          className="h-48 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${store.storeBanner})` }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40 dark:bg-opacity-60" />
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Store Name */}
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <Link href={`/shop/${params.storeSlug}`} className="flex items-center ml-4 lg:ml-0">
                {store.storeLogo ? (
                  <img src={store.storeLogo} alt={store.storeName} className="h-10 w-10 rounded-full mr-3" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center mr-3">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{store.storeName}</h1>
                  {store.verification?.isVerified && (
                    <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified Store
                    </div>
                  )}
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive 
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Store Status & Cart */}
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isStoreOpen() 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
              }`}>
                {isStoreOpen() ? 'Open' : 'Closed'}
              </div>
              
              {store.metrics?.rating > 0 && (
                <div className="hidden sm:flex items-center text-sm">
                  <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400 mr-1" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">{store.metrics.rating.toFixed(1)}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">({store.metrics.totalReviews})</span>
                </div>
              )}
              
              <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                <ShoppingCart className="w-6 h-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 dark:bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                      isActive 
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Store Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{store.storeName}</h3>
              <p className="text-gray-400 text-sm mb-4">{store.storeDescription}</p>
              {store.marketing?.referralCode && (
                <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Referral Code</p>
                  <p className="font-mono font-bold text-white">{store.marketing.referralCode}</p>
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link 
                      href={item.href}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
              <div className="space-y-3 text-sm">
                {store.contactInfo?.phoneNumber && (
                  <div className="flex items-center text-gray-400">
                    <Phone className="w-4 h-4 mr-2" />
                    {store.contactInfo.phoneNumber}
                  </div>
                )}
                {store.contactInfo?.whatsappNumber && (
                  <a 
                    href={`https://wa.me/${store.contactInfo.whatsappNumber.replace(/\D/g, '')}`}
                    className="flex items-center text-gray-400 hover:text-green-400 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </a>
                )}
                {store.contactInfo?.email && (
                  <div className="flex items-center text-gray-400">
                    <Mail className="w-4 h-4 mr-2" />
                    {store.contactInfo.email}
                  </div>
                )}
                {store.contactInfo?.address?.city && (
                  <div className="flex items-center text-gray-400">
                    <MapPin className="w-4 h-4 mr-2" />
                    {store.contactInfo.address.city}, {store.contactInfo.address.region}
                  </div>
                )}
              </div>
            </div>

            {/* Business Hours */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Business Hours</h3>
              <div className="space-y-1 text-sm">
                {Object.entries(store.businessHours || {}).map(([day, hours]) => (
                  <div key={day} className="flex justify-between text-gray-400">
                    <span className="capitalize">{day}:</span>
                    <span>
                      {hours.isOpen ? `${hours.open} - ${hours.close}` : 'Closed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Social Media & WhatsApp Links */}
          {(store.socialMedia && Object.values(store.socialMedia).some(v => v) || 
            store.whatsappSettings?.groupLink || 
            store.whatsappSettings?.communityLink) && (
            <div className="mt-8 pt-8 border-t border-gray-800 dark:border-gray-700">
              <div className="flex justify-center space-x-6">
                {store.socialMedia?.facebook && (
                  <a href={store.socialMedia.facebook} target="_blank" rel="noopener noreferrer" 
                     className="text-gray-400 hover:text-blue-500 transition-colors">
                    <Facebook className="w-6 h-6" />
                  </a>
                )}
                {store.socialMedia?.instagram && (
                  <a href={store.socialMedia.instagram} target="_blank" rel="noopener noreferrer"
                     className="text-gray-400 hover:text-pink-500 transition-colors">
                    <Instagram className="w-6 h-6" />
                  </a>
                )}
                {store.socialMedia?.twitter && (
                  <a href={store.socialMedia.twitter} target="_blank" rel="noopener noreferrer"
                     className="text-gray-400 hover:text-blue-400 transition-colors">
                    <Twitter className="w-6 h-6" />
                  </a>
                )}
                {store.whatsappSettings?.groupLink && (
                  <a href={store.whatsappSettings.groupLink} target="_blank" rel="noopener noreferrer"
                     className="text-gray-400 hover:text-green-500 transition-colors"
                     title="Join WhatsApp Group">
                    <MessageCircle className="w-6 h-6" />
                  </a>
                )}
                {store.whatsappSettings?.communityLink && (
                  <a href={store.whatsappSettings.communityLink} target="_blank" rel="noopener noreferrer"
                     className="text-gray-400 hover:text-green-500 transition-colors"
                     title="Join WhatsApp Community">
                    <Users className="w-6 h-6" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Copyright */}
          <div className="mt-8 pt-8 border-t border-gray-800 dark:border-gray-700 text-center text-sm text-gray-400">
            <p>© {new Date().getFullYear()} {store.storeName}. All rights reserved.</p>
            <p className="mt-2">Powered by DataMart</p>
          </div>
        </div>
      </footer>
    </div>
  );
}