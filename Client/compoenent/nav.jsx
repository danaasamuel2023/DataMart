'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  LayoutDashboard, 
  Layers, 
  FileSpreadsheet, 
  Key, 
  FileText, 
  Menu, 
  X,
  Moon,
  Sun,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Phone,
  ArrowUpRight
} from 'lucide-react';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const router = useRouter();

  // Check system preference and local storage on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const sidebarState = localStorage.getItem('sidebarState');

    if (savedTheme === 'dark' || (savedTheme === null && prefersDarkMode)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    if (sidebarState === 'collapsed') {
      setIsCollapsed(true);
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

  // Toggle sidebar collapse state
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarState', newState ? 'collapsed' : 'expanded');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Reset animation state when closing
    if (isMobileMenuOpen) {
      setAnimationComplete(false);
    }
  };

  // Set animation complete after menu opens
  useEffect(() => {
    if (isMobileMenuOpen) {
      const timer = setTimeout(() => {
        setAnimationComplete(true);
      }, 500); // Match this to your animation duration
      return () => clearTimeout(timer);
    }
  }, [isMobileMenuOpen]);

  // Function to handle navigation and close mobile menu
  const handleNavigation = (path) => {
    router.push(path);
    setIsMobileMenuOpen(false);
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

  // Click outside to close mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('.mobile-menu-container') && !event.target.closest('.menu-toggle')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col ${
          isCollapsed ? 'w-16' : 'w-64'
        } bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white h-screen fixed left-0 top-0 overflow-y-auto transition-all duration-300 z-30`}
      >
        <div className={`p-4 text-2xl font-bold border-b border-gray-300 dark:border-gray-700 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
          {!isCollapsed && 'DaTa Mart'}
          <div className="flex items-center">
            {!isCollapsed && (
              <button 
                onClick={toggleDarkMode} 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mr-2"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            <button 
              onClick={toggleSidebar}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </div>
        
        <nav className="mt-5">
          {/* Dashboard Section */}
          {!isCollapsed && (
            <div className="px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Dashboard
            </div>
          )}
          <NavItem 
            icon={<LayoutDashboard />} 
            text="Dashboard" 
            path="/" 
            onClick={() => handleNavigation('/')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            icon={<Home />} 
            text="Home" 
            path="/" 
            onClick={() => handleNavigation('/')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            icon={<CreditCard />} 
            text="Top Up" 
            path="/topup" 
            onClick={() => handleNavigation('/topup')} 
            isHighlighted={true}
            isCollapsed={isCollapsed} 
          />

          {/* Services Section */}
          {!isCollapsed && (
            <div className="px-4 py-2 mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Services
            </div>
          )}
          {isCollapsed && <div className="mt-4 border-t border-gray-300 dark:border-gray-700 pt-4"></div>}
          <NavItem 
            icon={<Layers />} 
            text="AT iShare Bundle" 
            path="/at-ishare" 
            onClick={() => handleNavigation('/at-ishare')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            icon={<Layers />} 
            text="MTNUP2U Bundle" 
            path="/mtnup2u" 
            onClick={() => handleNavigation('/mtnup2u')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            icon={<Layers />} 
            text="MTNUP2U Pricing" 
            path="/mtnup2u-pricing" 
            onClick={() => handleNavigation('/mtnup2u-pricing')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            icon={<Layers />} 
            text="AT Big Time Bundle" 
            path="/services/at-bigtime" 
            onClick={() => handleNavigation('/services/at-bigtime')} 
            isNew 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            icon={<Phone />} 
            text="Telecel Bundle" 
            path="/TELECEL" 
            onClick={() => handleNavigation('/TELECEL')} 
            isNew 
            isCollapsed={isCollapsed}
          />

          {/* Bulk Uploads Section */}
          {!isCollapsed && (
            <div className="px-4 py-2 mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Bulk Uploads
            </div>
          )}
          {isCollapsed && <div className="mt-4 border-t border-gray-300 dark:border-gray-700 pt-4"></div>}
          <NavItem 
            icon={<FileSpreadsheet />} 
            text="MTNUP2U Excel" 
            path="/uploads/mtnup2u" 
            onClick={() => handleNavigation('/uploads/mtnup2u')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            icon={<FileSpreadsheet />} 
            text="AT iShare Excel" 
            path="/uploads/at-ishare" 
            onClick={() => handleNavigation('/uploads/at-ishare')} 
            isCollapsed={isCollapsed}
          />

          {/* API & Documentation Section */}
          {!isCollapsed && (
            <div className="px-4 py-2 mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
              API & Documentation
            </div>
          )}
          {isCollapsed && <div className="mt-4 border-t border-gray-300 dark:border-gray-700 pt-4"></div>}
          <NavItem 
            icon={<Key />} 
            text="API Keys" 
            path="/api-keys" 
            onClick={() => handleNavigation('/api-keys')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            icon={<FileText />} 
            text="API Documentation" 
            path="/api-docs" 
            onClick={() => handleNavigation('/api-doc')} 
            isCollapsed={isCollapsed}
          />
        </nav>
      </aside>

      {/* Mobile Navigation */}
      <div className="md:hidden w-full z-50">
        {/* Mobile Top Bar */}
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white flex justify-between items-center p-4 shadow-md fixed top-0 left-0 right-0">
          <div className="text-xl font-bold">DaTa Mart</div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleDarkMode} 
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={toggleMobileMenu} 
              className="focus:outline-none menu-toggle p-1 rounded-md bg-gray-200 dark:bg-gray-700"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu padding - crucial for fixing the space issue */}
        <div className="h-16"></div>

        {/* Mobile Sliding Menu with Animation */}
        <div 
          className={`fixed inset-y-0 right-0 w-full bg-gray-100 dark:bg-gray-900 z-40 transform ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          } transition-transform duration-300 ease-in-out pt-16 overflow-hidden`}
        >
          <div className={`h-full overflow-y-auto pb-20 mobile-menu-container ${
            animationComplete ? 'animate-none' : 'animate-fadeIn'
          }`}>
            <nav>
              {/* Top Up Button (Prominent in Mobile) */}
              <div className="px-6 py-3">
                <button 
                  onClick={() => handleNavigation('/topup')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md flex items-center justify-center font-medium transition-all duration-200 transform hover:scale-105"
                >
                  <CreditCard className="mr-2" /> Top Up Account
                </button>
              </div>
              
              {/* Dashboard Section */}
              <SectionHeader text="Dashboard" />
              <MobileNavItem 
                icon={<LayoutDashboard />} 
                text="Dashboard" 
                onClick={() => handleNavigation('/')} 
              />
              <MobileNavItem 
                icon={<Home />} 
                text="Home" 
                onClick={() => handleNavigation('/')} 
              />

              {/* Services Section */}
              <SectionHeader text="Services" />
              <MobileNavItem 
                icon={<Layers />} 
                text="AT iShare Bundle" 
                onClick={() => handleNavigation('/at-ishare')} 
              />
              <MobileNavItem 
                icon={<Layers />} 
                text="MTNUP2U Bundle" 
                onClick={() => handleNavigation('/mtnup2u')} 
              />
              <MobileNavItem 
                icon={<Layers />} 
                text="MTNUP2U Pricing" 
                onClick={() => handleNavigation('/mtnup2u-pricing')} 
              />
              <MobileNavItem 
                icon={<Layers />} 
                text="AT Big Time Bundle" 
                onClick={() => handleNavigation('/services/at-bigtime')} 
                isNew 
              />
              <MobileNavItem 
                icon={<Phone />} 
                text="Telecel Bundle" 
                onClick={() => handleNavigation('/TELECEL')} 
                isNew
                isSpecial
              />

              {/* Bulk Uploads Section */}
              <SectionHeader text="Bulk Uploads" />
              <MobileNavItem 
                icon={<FileSpreadsheet />} 
                text="MTNUP2U Excel" 
                onClick={() => handleNavigation('/uploads/mtnup2u')} 
              />
              <MobileNavItem 
                icon={<FileSpreadsheet />} 
                text="AT iShare Excel" 
                onClick={() => handleNavigation('/uploads/at-ishare')} 
              />

              {/* API & Documentation Section */}
              <SectionHeader text="API & Documentation" />
              <MobileNavItem 
                icon={<Key />} 
                text="API Keys" 
                onClick={() => handleNavigation('/api-keys')} 
              />
              <MobileNavItem 
                icon={<FileText />} 
                text="API Documentation" 
                onClick={() => handleNavigation('/api-doc')} 
              />
            </nav>
            
            {/* Close button at the bottom for easy closing */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <X size={18} className="mr-2" /> Close Menu
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content wrapper - This div should only be used for spacing offset */}
      <div className="flex w-full">
        {/* Sidebar spacer for desktop */}
        <div className={`hidden md:block ${isCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 transition-all duration-300`}></div>
      </div>
    </>
  );
};

// Desktop Navigation Item Component - Updated for collapsed state
const NavItem = ({ icon, text, path, onClick, isNew = false, isHighlighted = false, isCollapsed = false }) => (
  <div 
    className={`${isCollapsed ? 'px-0 py-4 justify-center' : 'px-4 py-2'} hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center cursor-pointer ${
      isHighlighted ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' : ''
    } transition-colors duration-200`}
    onClick={onClick}
    title={isCollapsed ? text : ""}
  >
    <div className={isCollapsed ? "flex justify-center w-full" : ""}>
      {icon}
    </div>
    {!isCollapsed && <span className="ml-3">{text}</span>}
    {!isCollapsed && isNew && (
      <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
        New
      </span>
    )}
    {!isCollapsed && isHighlighted && (
      <span className="ml-auto text-blue-600 dark:text-blue-400">
        →
      </span>
    )}
  </div>
);

// Mobile Navigation Item Component - Updated with icons and animations
const MobileNavItem = ({ icon, text, onClick, isNew = false, isSpecial = false }) => (
  <div 
    className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3 transition-all duration-200 ${
      isSpecial 
        ? 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' 
        : 'hover:bg-gray-200 dark:hover:bg-gray-800'
    } active:scale-98 transform`}
    onClick={onClick}
  >
    <div className={`${isSpecial ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>
      {icon}
    </div>
    <span className={isSpecial ? 'font-medium text-yellow-700 dark:text-yellow-300' : ''}>
      {text}
    </span>
    {isNew && (
      <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
        New
      </span>
    )}
    {isSpecial && (
      <span className="ml-auto">
        <ArrowUpRight className="text-yellow-600 dark:text-yellow-400" />
      </span>
    )}
  </div>
);

// Mobile Section Header
const SectionHeader = ({ text }) => (
  <div className="px-6 py-3 text-gray-500 dark:text-gray-400 uppercase font-semibold text-sm bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    {text}
  </div>
);

export default Navbar;