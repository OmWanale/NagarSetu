import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('nagarsetu_token') || null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('nagarsetu_theme_v2');
    return saved || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('nagarsetu_theme_v2', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Set base API URL - strip trailing slash if present
  const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const API_URL = rawApiUrl.replace(/\/+$/, '');

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('nagarsetu_token');
      const storedUser = localStorage.getItem('nagarsetu_user');
      
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken || null);
        } catch (e) {
          console.error("Error parsing stored auth session", e);
          logout();
        }
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (username, password, desiredRole = 'citizen') => {
    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('scope', desiredRole);

      const response = await fetch(`${API_URL}/api/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Authentication failed');
      }

      const data = await response.json();
      localStorage.setItem('nagarsetu_token', data.access_token);
      localStorage.setItem('nagarsetu_user', JSON.stringify(data.user));
      
      setUser(data.user);
      setToken(data.access_token);
      setIsLoading(false);
      return data.user;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (username, email, password, fullName, phone) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          full_name: fullName,
          phone_number: phone,
          role: 'citizen'
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Registration failed');
      }

      setIsLoading(false);
      // Automatically log in after registration
      return await login(username, password, 'citizen');
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const demoLogin = async (role = 'judge') => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/demo-login?role=${role}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        // Local fallback in case backend is offline/loading
        const localMockUser = {
          id: role === 'citizen' ? 'demo-citizen-id' : 'demo-officer-id',
          username: role === 'citizen' ? 'demo_citizen' : 'demo_officer',
          email: role === 'citizen' ? 'citizen@nagarsetu.gov.in' : 'officer@nagarsetu.gov.in',
          full_name: role === 'citizen' ? 'Ananya Sharma (Demo)' : 'Commissioner Rajesh Kumar (Demo Inspector)',
          role: role === 'citizen' ? 'citizen' : 'officer',
          ward: role === 'citizen' ? 'Ward 4 (Malleswaram)' : 'All Wards',
          is_demo: true
        };
        
        localStorage.removeItem('nagarsetu_token');
        localStorage.setItem('nagarsetu_user', JSON.stringify(localMockUser));
        
        setUser(localMockUser);
        setToken(null);
        setIsLoading(false);
        return localMockUser;
      }

      const data = await response.json();
      localStorage.setItem('nagarsetu_token', data.access_token);
      localStorage.setItem('nagarsetu_user', JSON.stringify(data.user));
      
      setUser(data.user);
      setToken(data.access_token);
      setIsLoading(false);
      return data.user;
    } catch (error) {
      console.warn("Backend demoLogin connection error. Using local session fallback.", error);
      const localMockUser = {
        id: role === 'citizen' ? 'demo-citizen-id' : 'demo-officer-id',
        username: role === 'citizen' ? 'demo_citizen' : 'demo_officer',
        email: role === 'citizen' ? 'citizen@nagarsetu.gov.in' : 'officer@nagarsetu.gov.in',
        full_name: role === 'citizen' ? 'Ananya Sharma (Demo)' : 'Commissioner Rajesh Kumar (Demo Inspector)',
        role: role === 'citizen' ? 'citizen' : 'officer',
        ward: role === 'citizen' ? 'Ward 4 (Malleswaram)' : 'All Wards',
        is_demo: true
      };
      
      localStorage.removeItem('nagarsetu_token');
      localStorage.setItem('nagarsetu_user', JSON.stringify(localMockUser));
      
      setUser(localMockUser);
      setToken(null);
      setIsLoading(false);
      return localMockUser;
    }
  };

  const logout = () => {
    localStorage.removeItem('nagarsetu_token');
    localStorage.removeItem('nagarsetu_user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      isLoading,
      login,
      register,
      demoLogin,
      logout,
      apiUrl: API_URL,
      theme,
      toggleTheme
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
