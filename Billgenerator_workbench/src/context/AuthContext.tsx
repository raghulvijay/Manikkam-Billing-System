import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getStoredToken,
  signIn as googleSignIn,
  clearToken,
  initGoogleAuth,
} from '../lib/googleAuth';

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  accessToken: null,
  loading: true,
  signIn: async () => {},
  signOut: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    setAccessToken(token);
    setLoading(false);
    initGoogleAuth().catch(() => {});
  }, []);

  const signIn = async (): Promise<void> => {
    const token = await googleSignIn();
    setAccessToken(token);
  };

  const signOut = (): void => {
    clearToken();
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!accessToken,
        accessToken,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);

export { AuthContext };
