import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

/**
 * Auth state shared app-wide. On mount, calls GET /api/auth/me — if the
 * httpOnly cookie is valid we get the user back; otherwise the interceptor
 * redirects to /login.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const loginWithGoogle = useCallback(async (credential) => {
    const res = await api.post('/auth/google', { credential });
    setUser(res.data.user); // { userId, email, firstName, lastName, pictureUrl }
    return res.data.user;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const signup = useCallback(async ({
    email, password, firstName, lastName,
  }) => {
    const res = await api.post('/auth/register', {
      email,
      password,
      firstName,
      lastName,
    });
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, loginWithGoogle, login, signup, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
