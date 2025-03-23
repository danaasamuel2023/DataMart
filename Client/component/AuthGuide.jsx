'use client'
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthGuard = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // List of paths that should bypass authentication
  const publicPaths = ['/signin', '/signup'];
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
      router.push('/signup');
    } else {
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  }, [router, isPublicPath, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : null;
};

export default AuthGuard;