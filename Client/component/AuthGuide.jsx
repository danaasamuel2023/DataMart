'use client'
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Zap, Sparkles } from 'lucide-react';

const AuthGuard = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // List of paths that should bypass authentication
  const publicPaths = ['/SignIn', '/SignUp'];
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    // If current path is public, don't check auth
    if (isPublicPath) {
      setLoading(false);
      setIsAuthenticated(true);
      return;
    }
    
    // Check if user is authenticated
    const userData = localStorage.getItem('userData');
    
    if (!userData) {
      router.push('/SignUp');
    } else {
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  }, [router, isPublicPath, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          {/* Epic Loading Animation */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200/20"></div>
            {/* Spinning gradient ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-400 border-r-teal-400 animate-spin"></div>
            {/* Inner pulsing circle */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse flex items-center justify-center">
              <Zap className="w-8 h-8 text-white animate-bounce" strokeWidth={2.5} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-transparent bg-clip-text animate-pulse">
              DATAHUSTLE
            </h1>
            <div className="flex items-center justify-center space-x-2 text-emerald-300">
              <Sparkles className="w-5 h-5 animate-spin" />
              <span className="text-lg font-bold">Verifying authentication...</span>
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : null;
};

export default AuthGuard;