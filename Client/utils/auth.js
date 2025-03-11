// utils/auth.js - Client-side authentication utilities

// Function to get the auth token
export const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  };
  
  // Function to check if user is authenticated
  export const isAuthenticated = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      const isAuth = sessionStorage.getItem('isAuthenticated');
      return !!token && isAuth === 'true';
    }
    return false;
  };
  
  // Function to get the current user data
  export const getCurrentUser = () => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  };
  
  // Function to logout user
  export const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      sessionStorage.removeItem('isAuthenticated');
      // Redirect to login page
      window.location.href = '/SignIn';
    }
  };
  
  // Function to handle API requests with authentication
  export const authenticatedFetch = async (url, options = {}) => {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  
    const response = await fetch(url, {
      ...options,
      headers,
    });
  
    // Handle token expiration
    if (response.status === 401) {
      const data = await response.json();
      if (data.message === 'Token expired') {
        logout();
        return;
      }
    }
  
    return response;
  };
  
  // Auth protection for routes
  export const withAuth = (Component) => {
    return (props) => {
      const [loading, setLoading] = React.useState(true);
      const router = useRouter();
  
      React.useEffect(() => {
        // Check authentication
        if (!isAuthenticated()) {
          router.replace('/login');
        } else {
          setLoading(false);
        }
      }, []);
  
      if (loading) {
        return <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>;
      }
  
      return <Component {...props} />;
    };
  };