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
    
    // Check user role from localStorage
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (userData && userData.role) {
        setUserRole(userData.role);
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
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

  // Logout function
  const handleLogout = () => {
    console.log("Logout initiated");
    try {
      // Clear auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      // Navigate to login page
      window.location.href = '/SignIn';
    } catch (error) {
      console.error("Error during logout:", error);
      window.location.href = '/SignIn';
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

  // DATAMART PSK Logo SVG Component
  const DatamartLogo = ({ width = 120, height = 40 }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 150 50" 
      width={width} 
      height={height}
      className="transition-opacity duration-200"
    >
      <path 
        d="M62.5,15.2h4.5v8.1h8.4v-8.1h4.5v20h-4.5v-8.1h-8.4v8.1h-4.5V15.2z" 
        fill="currentColor"
        className="text-gray-800 dark:text-white"
      />
      <path 
        d="M86.4,21.7v13.5h-4.2V21.7h-4.1v-3.7h4.1v-5.8h4.2v5.8h4.1v3.7H86.4z" 
        fill="currentColor"
        className="text-gray-800 dark:text-white"
      />
      <path 
        d="M100.4,21.4c-1.2-1.2-2.8-1.8-4.6-1.8s-3.4,0.6-4.6,1.8c-1.2,1.2-1.8,2.7-1.8,4.5s0.6,3.3,1.8,4.5c1.2,1.2,2.8,1.8,4.6,1.8 s3.4-0.6,4.6-1.8c1.2-1.2,1.8-2.7,1.8-4.5S101.6,22.6,100.4,21.4z" 
        fill="currentColor"
        className="text-gray-800 dark:text-white"
      />
      <path 
        d="M103.6,30.4c0-0.6,0.2-1.1,0.6-1.5c0.4-0.4,0.9-0.6,1.5-0.6s1.1,0.2,1.5,0.6c0.4,0.4,0.6,0.9,0.6,1.5s-0.2,1.1-0.6,1.5 c-0.4,0.4-0.9,0.6-1.5,0.6s-1.1-0.2-1.5-0.6C103.8,31.5,103.6,31,103.6,30.4z" 
        fill="currentColor"
        className="text-gray-800 dark:text-white"
      />
      <path 
        d="M117.3,19.6c-1.9,0-3.3,0.6-4.3,1.9v-1.4h-4.2v15h4.2v-8.5c0-1.1,0.3-2,0.9-2.6c0.6-0.6,1.4-0.9,2.3-0.9 c0.9,0,1.7,0.3,2.3,0.9c0.6,0.6,0.9,1.5,0.9,2.6v8.5h4.2v-9.2c0-1.9-0.6-3.4-1.7-4.6C120.7,20.2,119.2,19.6,117.3,19.6z" 
        fill="currentColor"
        className="text-gray-800 dark:text-white"
      />
      <path 
        d="M139.1,21.2c-1.1-1-2.6-1.6-4.3-1.6c-2,0-3.7,0.7-4.9,2c-1.2,1.3-1.9,3-1.9,5c0,2,0.6,3.7,1.9,5c1.3,1.3,2.9,2,4.9,2 c1.7,0,3.2-0.5,4.3-1.6v1.1h4.2V20.1h-4.2V21.2z M136.3,28.1c-0.7,0.7-1.6,1-2.6,1s-1.9-0.3-2.6-1c-0.7-0.7-1-1.5-1-2.5 s0.3-1.8,1-2.5c0.7-0.7,1.6-1,2.6-1s1.9,0.3,2.6,1c0.7,0.7,1,1.5,1,2.5S137,27.4,136.3,28.1z" 
        fill="currentColor"
        className="text-gray-800 dark:text-white"
      />
      <path 
        d="M50.9,31.3l-7.4,12.8c-0.4,0.7-1.4,0.7-1.8,0L27.8,19.9c-0.4-0.7,0.1-1.6,0.9-1.6h9.2c0.4,0,0.7,0.2,0.9,0.5l5.7,9.9 c0.4,0.7,1.4,0.7,1.8,0l1.7-3c0.4-0.7,1.4-0.7,1.8,0l2.1,3.6C50.9,29.3,50.9,30.3,50.9,31.3L50.9,31.3z" 
        fill="#9333ea"
      />
    </svg>
  );

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
              className="text-lg font-bold text-gray-800 dark:text-white cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              onClick={() => router.push('/')}
            >
              DATAMART 
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

      {/* Sidebar */}
      <aside 
        className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div 
          className={`absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
            <span 
              className="text-lg font-bold text-gray-800 dark:text-white cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              onClick={() => {
                router.push('/');
                setIsMobileMenuOpen(false);
              }}
            >
              DATAMART 
            </span>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="h-[calc(100vh-64px)] overflow-y-auto">
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
                icon={<Layers size={18} />} 
                text="AT Big Time Bundles" 
                path="/at-big-time"
                disabled={userRole !== "admin"} 
              />
            </div>

            <div className="py-2">
              <SectionHeading title="Subscriptions" />
              <NavItem 
                icon={<BarChart2 size={18} />} 
                text="Subscription" 
                path="/subscription"
                disabled={userRole !== "admin"}
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
                  <div className="font-medium text-sm dark:text-white">My Account</div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">Profile Settings</div>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-gray-400" />
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full mt-4 flex items-center justify-center py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-md hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105"
              >
                <LogOut size={20} className="mr-2" strokeWidth={2.5} />
                <span className="font-semibold text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area (with padding to account for fixed header) */}
      <main className="pt-16">
        {/* Your content goes here */}
      </main>

      {/* Removed bottom navigation as requested */}

      {/* Styles for animations */}
      <style jsx global>{`
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