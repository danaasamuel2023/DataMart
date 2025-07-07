'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  Users, BarChart3, ShoppingBag, Clock, FileText, Settings, 
  Moon, Sun, Menu, X, LogOut, Shield, Loader, ArrowRightLeft
} from 'lucide-react';

// Dynamically import all admin components to avoid SSR issues
const AdminUsers = dynamic(() => import('../admin-users/page'), {
  loading: () => <LoadingComponent />
});

const ComprehensiveDashboard = dynamic(() => import('../admin-daily/page'), {
  loading: () => <LoadingComponent />
});

const AdminOrders = dynamic(() => import('../allorders/page'), {
  loading: () => <LoadingComponent />
});

const OrderManagementPage = dynamic(() => import('../waiting/page'), {
  loading: () => <LoadingComponent />
});

const AdminReportDashboard = dynamic(() => import('../reports/page'), {
  loading: () => <LoadingComponent />
});

const InventoryPage = dynamic(() => import('../toggle/page'), {
  loading: () => <LoadingComponent />
});

const TransferPage = dynamic(() => import('../Transfer/page'), {
  loading: () => <LoadingComponent />
});

// Loading component
const LoadingComponent = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
      <p className="mt-2 text-gray-600 dark:text-gray-400">Loading component...</p>
    </div>
  </div>
);

const AdminDashboardHub = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('users');
  const [darkMode, setDarkMode] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tabInitialized, setTabInitialized] = useState(false);

  // Tab configuration
  const tabs = [
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      component: AdminUsers,
      color: 'blue'
    },
    {
      id: 'analytics',
      label: 'Business Analytics',
      icon: BarChart3,
      component: ComprehensiveDashboard,
      color: 'green'
    },
    {
      id: 'orders',
      label: 'All Orders',
      icon: ShoppingBag,
      component: AdminOrders,
      color: 'purple'
    },
    {
      id: 'order-mgmt',
      label: 'Order Management',
      icon: Clock,
      component: OrderManagementPage,
      color: 'yellow'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      component: AdminReportDashboard,
      color: 'red'
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Settings,
      component: InventoryPage,
      color: 'indigo'
    },
    {
      id: 'transfers',
      label: 'Transfers',
      icon: ArrowRightLeft,
      component: TransferPage,
      color: 'emerald'
    }
  ];

  useEffect(() => {
    // Check authentication and admin role
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const userDataStr = localStorage.getItem('userData');
      
      if (!token || !userDataStr) {
        router.push('/login');
        return;
      }

      try {
        const user = JSON.parse(userDataStr);
        
        // Check if user role is admin
        if (user.role !== 'admin') {
          console.log('Access denied: User is not an admin');
          router.push('/');
          return;
        }
        
        setUserData(user);
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/login');
        return;
      }
      
      setLoading(false);
    };

    // Check dark mode preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      setDarkMode(JSON.parse(savedMode));
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }

    // Restore last active tab from localStorage
    const savedTab = localStorage.getItem('adminActiveTab');
    if (savedTab && tabs.find(tab => tab.id === savedTab)) {
      setActiveTab(savedTab);
    }
    setTabInitialized(true);

    checkAuth();
  }, [router]);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    if (tabInitialized && activeTab) {
      localStorage.setItem('adminActiveTab', activeTab);
    }
  }, [activeTab, tabInitialized]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('adminActiveTab'); // Clear saved tab on logout
    router.push('/login');
  };

  const getTabColorClasses = (color, isActive) => {
    const baseClasses = 'transition-all duration-200 ';
    
    if (isActive) {
      const activeColorMap = {
        blue: 'bg-blue-600 text-white border-blue-600',
        green: 'bg-green-600 text-white border-green-600',
        purple: 'bg-purple-600 text-white border-purple-600',
        yellow: 'bg-yellow-500 text-white border-yellow-500',
        red: 'bg-red-600 text-white border-red-600',
        indigo: 'bg-indigo-600 text-white border-indigo-600',
        emerald: 'bg-emerald-600 text-white border-emerald-600'
      };
      return baseClasses + activeColorMap[color];
    }
    
    return baseClasses + 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Get the active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Welcome back, {userData?.name || 'Admin'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-[73px] z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Desktop tabs */}
          <div className="hidden lg:flex space-x-1 -mb-px overflow-x-auto py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg font-medium text-sm border-b-2 ${
                    getTabColorClasses(tab.color, isActive)
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile tabs dropdown */}
          <div className="lg:hidden py-3">
            <div className="relative">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
              >
                <div className="flex items-center space-x-2">
                  {(() => {
                    const currentTab = tabs.find(tab => tab.id === activeTab);
                    const Icon = currentTab?.icon || Users;
                    return (
                      <>
                        <Icon className="w-4 h-4" />
                        <span>{currentTab?.label || 'Select Page'}</span>
                      </>
                    );
                  })()}
                </div>
                <Menu className="w-4 h-4" />
              </button>

              {mobileMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center space-x-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          isActive ? 'bg-gray-50 dark:bg-gray-700 font-medium' : ''
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? `text-${tab.color}-600` : 'text-gray-500'}`} />
                        <span className={isActive ? `text-${tab.color}-600` : 'text-gray-700 dark:text-gray-300'}>
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 pb-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        <div className="max-w-full">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardHub;