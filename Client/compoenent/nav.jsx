'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  LayoutDashboard, 
  Layers, 
  User,
  CreditCard,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  ShoppingCart,
  BarChart2,
  Menu,
  X
} from 'lucide-react';

const MobileNavbar = () => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [userRole, setUserRole] = useState("user"); // Default to regular user
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login status
  const [userName, setUserName] = useState(""); // Track user name for display
  
  // Check system preference and local storage on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (savedTheme === null && prefersDarkMode)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Check user role and login status from localStorage
    try {
      const authToken = localStorage.getItem('authToken');
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const dataUser = JSON.parse(localStorage.getItem('data.user') || '{}');
      
      // Set login status based on authToken existence
      const loggedIn = !!authToken;
      setIsLoggedIn(loggedIn);
      
      if (!loggedIn) {
        return; // Don't try to get user info if not logged in
      }
      
      // First try to get role from userData
      if (userData && userData.role) {
        setUserRole(userData.role);
        setUserName(userData.name || '');
      }
      // Fallback to data.user if available
      else if (dataUser && dataUser.role) {
        setUserRole(dataUser.role);
        setUserName(dataUser.name || '');
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      setIsLoggedIn(false);
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Enhanced Logout function
  const handleLogout = () => {
    console.log("Logout initiated");
    try {
      // Clear all auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('data.user');
      
      // Clear any other potential auth-related items
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      // Update state to reflect logged out status
      setIsLoggedIn(false);
      setUserRole("user");
      
      // Navigate to home page (root path)
      window.location.href = '/';
    } catch (error) {
      console.error("Error during logout:", error);
      // Fallback to home page if there's an error
      window.location.href = '/';
    }
  };

  // Navigate to profile page
  const navigateToProfile = () => {
    router.push('/profile');
    setIsMobileMenuOpen(false);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobileMenuOpen]);

  // Navigation Item Component
  const NavItem = ({ icon, text, path, onClick, disabled = false }) => {
    const itemClasses = `flex items-center py-3 px-4 ${
      disabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
    } transition-colors rounded-md`;
    
    return (
      <div 
        className={itemClasses}
        onClick={() => {
          if (disabled) return;
          if (onClick) {
            onClick();
          } else {
            router.push(path);
            setIsMobileMenuOpen(false);
          }
        }}
      >
        <div className="flex items-center justify-center h-9 w-9 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mr-3">
          {icon}
        </div>
        <span className="text-gray-800 dark:text-white font-medium text-sm">{text}</span>
        {!disabled && <ChevronRight className="ml-auto h-5 w-5 text-gray-400" />}
      </div>
    );
  };

  // Section Heading Component
  const SectionHeading = ({ title }) => (
    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      {title}
    </div>
  );

  return (
    <>
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full bg-white dark:bg-gray-900 shadow-sm z-40 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center h-16 px-4">
          <div className="flex items-center">
            <span 
              className="cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              onClick={() => router.push('/')}
            >
              {/* Simplified DATAMART text logo instead of SVG */}
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 text-transparent bg-clip-text">
                DATAMART
              </h1>
              <span className="sr-only">Datamart</span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={toggleMobileMenu}
              className="p-2 rounded-full bg-purple-600 text-white hover:bg-purple-700"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay - Reduced opacity and made dismissible */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-50 transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed right-0 top-0 h-full w-64 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar Header with Logout Button */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center p-4">
            <span 
              className="cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              onClick={() => {
                router.push('/');
                setIsMobileMenuOpen(false);
              }}
            >
              {/* Simplified DATAMART text logo */}
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 text-transparent bg-clip-text">
                DATAMART
              </h1>
            </span>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Logout Button at Top */}
          {isLoggedIn && (
            <div className="px-4 pb-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-md hover:from-red-600 hover:to-red-700 transition-all duration-300"
              >
                <LogOut size={20} className="mr-2" strokeWidth={2.5} />
                <span className="font-semibold text-sm">Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Content */}
        <div className="h-[calc(100vh-64px)] overflow-y-auto">
          {isLoggedIn ? (
            // Show these sections only when user is logged in
            <>
              <div className="py-2">
                <SectionHeading title="Dashboard" />
                <NavItem 
                  icon={<Home size={18} />} 
                  text="Dashboard" 
                  path="/" 
                />
                {userRole === "admin" && (
                  <NavItem 
                    icon={<LayoutDashboard size={18} />} 
                    text="Admin Dashboard" 
                    path="/admin" 
                  />
                )}
              </div>

              <div className="py-2">
                <SectionHeading title="Services" />
                <NavItem 
                  icon={<Layers size={18} />} 
                  text="AT Business" 
                  path="/at-ishare" 
                />
                <NavItem 
                  icon={<Layers size={18} />} 
                  text="MTN Business" 
                  path="/mtnup2u" 
                />
                <NavItem 
                  icon={<Layers size={18} />} 
                  text="Telecel" 
                  path="/TELECEL" 
                />
                <NavItem 
                  icon={<CreditCard size={18} />} 
                  text="Buy Foreign Number" 
                  path="/verification-services"
                
                />
                <NavItem 
                  icon={<Layers size={18} />} 
                  text="AT Big Time Bundles" 
                  path="/at-big-time"
                  disabled={true} 
                />
              </div>

              <div className="py-2">
                <SectionHeading title="Subscriptions" />
                <NavItem 
                  icon={<BarChart2 size={18} />} 
                  text="Subscription" 
                  path="/subscription"
                  disabled={true}
                />
              </div>

              <div className="py-2">
                <SectionHeading title="Transaction" />
                <NavItem 
                  icon={<ShoppingCart size={18} />} 
                  text="Histories" 
                  path="/myorders" 
                />
              </div>

              {/* User Account Section */}
              <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-800">
                <div 
                  className="flex items-center p-3 mb-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={navigateToProfile}
                >
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white">
                    <User size={20} />
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-sm dark:text-white">
                      {userName ? userName : 'My Account'}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Profile Settings</div>
                  </div>
                  <ChevronRight className="ml-auto h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              {/* Removed sticky logout button since it's now at the top */}
            </>
          ) : (
            // Show only these options when user is not logged in
            <div className="p-4 flex flex-col items-center justify-center h-full">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 text-transparent bg-clip-text">
                  DATAMART
                </h2>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Please sign in to access all features</p>
              </div>
              
              <button
                onClick={() => {
                  router.push('/SignIn');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full mb-3 py-3 px-4 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition-all duration-300"
              >
                <span className="font-semibold text-sm">Sign In</span>
              </button>
              
              <button
                onClick={() => {
                  router.push('/SignUp');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-3 px-4 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border border-purple-600 dark:border-purple-400 rounded-lg shadow-sm hover:bg-purple-50 dark:hover:bg-gray-700 transition-all duration-300"
              >
                <span className="font-semibold text-sm">Create Account</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area (with padding to account for fixed header) */}
      <main className="pt-16">
        {/* Your content goes here */}
      </main>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default MobileNavbar;