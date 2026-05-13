export { useAuth } from '../context/AuthContext';

// Re-export helpers for convenience
export { getStoredToken, getToken, signIn, clearToken, isAuthenticated } from '../lib/googleAuth';
