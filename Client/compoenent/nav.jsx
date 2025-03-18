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
  const [activeSection, setActiveSection] = useState("Dashboard");
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
  const handleNavigation = (path, section) => {
    router.push(path);
    setIsMobileMenuOpen(false);
    if (section) {
      setActiveSection(section);
    }
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
          <div className="text-xl font-bold flex items-center">
            <span className="animate-pulse mr-2">⚡</span>
            <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">DaTa Mart</span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleDarkMode} 
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transform transition hover:rotate-12"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={toggleMobileMenu} 
              className="focus:outline-none menu-toggle p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white transform transition-all hover:scale-110"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu padding - crucial for fixing the space issue */}
        <div className="h-16"></div>

        {/* Mobile Sliding Menu with Animation */}
        <div 
          className={`fixed inset-0 z-40 transform ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          } transition-all duration-300 ease-in-out`}
        >
          {/* Backdrop with blur effect */}
          <div 
            className={`absolute inset-0 bg-black/30 backdrop-blur-sm ${
              isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-300`}
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          {/* Menu Content */}
          <div 
            className={`absolute right-0 inset-y-0 w-4/5 max-w-sm bg-gray-100 dark:bg-gray-900 shadow-xl overflow-hidden transition-transform duration-300 mobile-menu-container`}
          >
            {/* Header with close button */}
            <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 bg-white/20 rounded-full p-1 hover:bg-white/30 transition-colors"
              >
                <X size={18} />
              </button>
              <div className="text-2xl font-bold mb-1">DaTa Mart</div>
              <div className="text-sm opacity-80">Your mobile data solution</div>
            </div>

            {/* Navigation Menu with Tab View */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {["Dashboard", "Services", "Uploads", "API"].map((section) => (
                <button
                  key={section}
                  className={`flex-1 py-3 text-sm font-medium transition-all ${
                    activeSection === section 
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400" 
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                  onClick={() => setActiveSection(section)}
                >
                  {section}
                </button>
              ))}
            </div>

            {/* Content area with animations */}
            <div className="overflow-y-auto h-full pb-24">
              {/* Top Up Button (Always visible) */}
              <div className="p-4 animate-fadeIn">
                <button 
                  onClick={() => handleNavigation('/topup')}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg flex items-center justify-center font-medium shadow-md transition-all transform hover:translate-y-1 hover:shadow-lg"
                >
                  <CreditCard className="mr-2" /> Top Up Account
                </button>
              </div>
              
              {/* Dashboard Section */}
              {activeSection === "Dashboard" && (
                <div className="animate-slideInRight">
                  <MobileNavItem 
                    icon={<LayoutDashboard className="text-blue-500" />} 
                    text="Dashboard Overview" 
                    onClick={() => handleNavigation('/', "Dashboard")} 
                    description="View your account summary"
                  />
                  <MobileNavItem 
                    icon={<Home className="text-green-500" />} 
                    text="Home" 
                    onClick={() => handleNavigation('/', "Dashboard")} 
                    description="Return to home page"
                  />
                </div>
              )}

              {/* Services Section */}
              {activeSection === "Services" && (
                <div className="animate-slideInRight">
                  <MobileNavItem 
                    icon={<Layers className="text-indigo-500" />} 
                    text="AT iShare Bundle" 
                    onClick={() => handleNavigation('/at-ishare', "Services")} 
                    description="Share data with friends"
                  />
                  <MobileNavItem 
                    icon={<Layers className="text-purple-500" />} 
                    text="MTNUP2U Bundle" 
                    onClick={() => handleNavigation('/mtnup2u', "Services")} 
                    description="Customized bundle options"
                  />
                  <MobileNavItem 
                    icon={<Layers className="text-purple-400" />} 
                    text="MTNUP2U Pricing" 
                    onClick={() => handleNavigation('/mtnup2u-pricing', "Services")} 
                    description="View bundle pricing details"
                  />
                  <MobileNavItem 
                    icon={<Layers className="text-blue-500" />} 
                    text="AT Big Time Bundle" 
                    onClick={() => handleNavigation('/services/at-bigtime', "Services")} 
                    isNew 
                    description="Exclusive new data bundles"
                  />
                  <MobileNavItem 
                    icon={<Phone className="text-yellow-500" />} 
                    text="Telecel Bundle" 
                    onClick={() => handleNavigation('/TELECEL', "Services")} 
                    isNew
                    isSpecial
                    description="New Telecel partnership bundles"
                  />
                </div>
              )}

              {/* Bulk Uploads Section */}
              {activeSection === "Uploads" && (
                <div className="animate-slideInRight">
                  <MobileNavItem 
                    icon={<FileSpreadsheet className="text-green-500" />} 
                    text="MTNUP2U Excel Upload" 
                    onClick={() => handleNavigation('/uploads/mtnup2u', "Uploads")} 
                    description="Bulk processing for MTN bundles"
                  />
                  <MobileNavItem 
                    icon={<FileSpreadsheet className="text-blue-500" />} 
                    text="AT iShare Excel Upload" 
                    onClick={() => handleNavigation('/uploads/at-ishare', "Uploads")} 
                    description="Bulk processing for AirTel"
                  />
                </div>
              )}

              {/* API & Documentation Section */}
              {activeSection === "API" && (
                <div className="animate-slideInRight">
                  <MobileNavItem 
                    icon={<Key className="text-amber-500" />} 
                    text="API Keys Management" 
                    onClick={() => handleNavigation('/api-keys', "API")} 
                    description="Manage your API access"
                  />
                  <MobileNavItem 
                    icon={<FileText className="text-blue-500" />} 
                    text="API Documentation" 
                    onClick={() => handleNavigation('/api-doc', "API")} 
                    description="Learn how to integrate"
                  />
                </div>
              )}
            </div>
            
            {/* Bottom profile/account section */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-100 to-transparent dark:from-gray-900 p-4 pt-8">
              <div className="flex items-center p-3 rounded-lg bg-white dark:bg-gray-800 shadow-md">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  U
                </div>
                <div className="ml-3">
                  <div className="font-medium text-sm">User Account</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Manage settings</div>
                </div>
                <button className="ml-auto bg-gray-200 dark:bg-gray-700 p-1.5 rounded-full">
                  <ArrowUpRight size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content wrapper - This div should only be used for spacing offset */}
      <div className="flex w-full">
        {/* Sidebar spacer for desktop */}
        <div className={`hidden md:block ${isCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 transition-all duration-300`}></div>
      </div>

      {/* Add animation keyframes for new animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out forwards;
        }
        
        .active:scale-98 {
          transition: transform 0.1s;
        }
        
        .active:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
    </>
  );
};

// Desktop Navigation Item Component - Unchanged
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

// Enhanced Mobile Navigation Item Component
const MobileNavItem = ({ icon, text, onClick, isNew = false, isSpecial = false, description = "" }) => (
  <div 
    className={`p-4 border-b border-gray-200 dark:border-gray-700 active:scale-98 transform ${
      isSpecial 
        ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20' 
        : 'hover:bg-gray-200/70 dark:hover:bg-gray-800/70'
    } transition-all duration-200`}
    onClick={onClick}
  >
    <div className="flex items-center">
      <div className={`p-2 rounded-full ${isSpecial ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-200/70 dark:bg-gray-700/70'} mr-3`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center">
          <span className={`font-medium ${isSpecial ? 'text-yellow-700 dark:text-yellow-400' : ''}`}>
            {text}
          </span>
          {isNew && (
            <span className="ml-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
              New
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="ml-2">
        <span className={`rounded-full p-1 ${
          isSpecial 
            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' 
            : 'bg-gray-200 dark:bg-gray-700/70 text-gray-600 dark:text-gray-400'
        }`}>
          <ArrowUpRight size={14} />
        </span>
      </div>
    </div>
  </div>
);

export default Navbar;