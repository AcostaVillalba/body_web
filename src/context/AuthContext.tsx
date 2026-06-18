import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import API_URL from '../api';

type Role = 'Admin' | 'Coach' | 'Client';

interface User {
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  profile_picture_url?: string;
  terms_accepted?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateProfilePicture: (url: string) => void;
  acceptTermsInContext: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Default to false, pages will trigger it

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  useEffect(() => {
    // Check for saved session
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(parsedUser);

      // Verify terms and status with backend in the background
      const checkSession = async () => {
        try {
          const res = await fetch(`${API_URL}/api/auth/status`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            const updatedUser = {
              ...parsedUser,
              isActive: data.is_active,
              terms_accepted: data.terms_accepted
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          } else if (res.status === 401 || res.status === 403) {
            logout();
          }
        } catch (e) {
          console.error("Error verifying session with backend:", e);
        }
      };
      checkSession();
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const updateProfilePicture = (url: string) => {
    if (user) {
      const updatedUser = { ...user, profile_picture_url: url };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const acceptTermsInContext = () => {
    if (user) {
      const updatedUser = { ...user, terms_accepted: true };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const contextValue = useMemo(() => ({ 
    user, 
    token, 
    isLoading, 
    setIsLoading,
    login, 
    logout, 
    updateProfilePicture, 
    acceptTermsInContext,
    isAuthenticated: !!token 
  }), [user, token, isLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
