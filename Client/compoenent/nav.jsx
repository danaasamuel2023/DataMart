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
  X,
  Zap
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
    const itemClasses = `group flex items-center py-4 px-5 ${
      disabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20 cursor-pointer'
    } transition-all duration-300 rounded-xl mx-2 mb-1`;
    
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
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-800/30 dark:to-teal-800/30 text-emerald-600 dark:text-emerald-400 mr-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <span className="text-gray-800 dark:text-gray-100 font-medium text-base flex-1">{text}</span>
        {!disabled && (
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-300" />
        )}
      </div>
    );
  };

  // Section Heading Component
  const SectionHeading = ({ title }) => (
    <div className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-l-4 border-emerald-400 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/20 mb-2">
      {title}
    </div>
  );

  return (
    <>
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg z-40 border-b border-emerald-200/50 dark:border-emerald-800/30">
        <div className="flex justify-between items-center h-18 px-6">
          <div className="flex items-center">
            <span 
              className="cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => router.push('/')}
            >
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-transparent bg-clip-text tracking-tight">
                  DATAHUSTLE
                </h1>
              </div>
              <span className="sr-only">DataHustle</span>
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleDarkMode}
              className="p-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all duration-300 hover:scale-105"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            <button 
              onClick={toggleMobileMenu}
              className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              aria-label="Toggle menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed right-0 top-0 h-full w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl transform transition-all duration-500 ease-out z-50 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="border-b border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20">
          <div className="flex justify-between items-center p-6">
            <span 
              className="cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => {
                router.push('/');
                setIsMobileMenuOpen(false);
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <h1 className="text-xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-transparent bg-clip-text">
                  DATAHUSTLE
                </h1>
              </div>
            </span>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl text-gray-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 transition-all duration-300"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>
          
          {/* Logout Button at Top */}
          {isLoggedIn && (
            <div className="px-6 pb-6">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center py-4 px-5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl shadow-lg hover:from-red-600 hover:to-pink-700 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <LogOut size={20} className="mr-3" strokeWidth={2.5} />
                <span className="font-bold text-sm">Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Content */}
        <div className="h-[calc(100vh-140px)] overflow-y-auto py-4">
          {isLoggedIn ? (
            <>
              <div className="py-2">
                <SectionHeading title="Dashboard" />
                <NavItem 
                  icon={<Home size={20} />} 
                  text="Dashboard" 
                  path="/" 
                />
                {userRole === "admin" && (
                  <NavItem 
                    icon={<LayoutDashboard size={20} />} 
                    text="Admin Dashboard" 
                    path="/admin" 
                  />
                )}
              </div>

              <div className="py-2">
                <SectionHeading title="Services" />
                <NavItem 
                  icon={<Layers size={20} />} 
                  text="AT Business" 
                  path="/at-ishare" 
                />
                <NavItem 
                  icon={<Layers size={20} />} 
                  text="MTN Business" 
                  path="/mtnup2u" 
                />
                <NavItem 
                  icon={<Layers size={20} />} 
                  text="Telecel" 
                  path="/TELECEL" 
                />
                <NavItem 
                  icon={<CreditCard size={20} />} 
                  text="Buy Foreign Number" 
                  path="/verification-services"
                />
                <NavItem 
                  icon={<Layers size={20} />} 
                  text="AT Big Time Bundles" 
                  path="/at-big-time"
                  disabled={true} 
                />
              </div>

              <div className="py-2">
                <SectionHeading title="Subscriptions" />
                <NavItem 
                  icon={<BarChart2 size={20} />} 
                  text="Subscription" 
                  path="/subscription"
                  disabled={true}
                />
              </div>

              <div className="py-2">
                <SectionHeading title="Transaction" />
                <NavItem 
                  icon={<ShoppingCart size={20} />} 
                  text="Histories" 
                  path="/myorders" 
                />
              </div>

              {/* User Account Section */}
              <div className="mt-6 mx-4 p-5 border border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50/30 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-2xl">
                <div 
                  className="flex items-center p-4 bg-white/70 dark:bg-gray-800/70 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-300 transform hover:scale-105"
                  onClick={navigateToProfile}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
                    <User size={22} />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="font-bold text-base dark:text-white">
                      {userName ? userName : 'My Account'}
                    </div>
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Profile Settings</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </>
          ) : (
            // Show only these options when user is not logged in
            <div className="p-6 flex flex-col items-center justify-center h-full">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl">
                  <Zap className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-transparent bg-clip-text mb-2">
                  DATAHUSTLE
                </h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Please sign in to access all features</p>
              </div>
              
              <button
                onClick={() => {
                  router.push('/SignIn');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full mb-4 py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <span className="font-bold text-base">Sign In</span>
              </button>
              
              <button
                onClick={() => {
                  router.push('/SignUp');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-4 px-6 bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500 dark:border-emerald-400 rounded-xl shadow-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <span className="font-bold text-base">Create Account</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="pt-18">
        {/* Your content goes here */}
      </main>

      {/* Enhanced Animation Styles */}
      <style jsx>{`
        @keyframes slideInRight {
          from { 
            opacity: 0;
            transform: translateX(100%);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out forwards;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default MobileNavbar;