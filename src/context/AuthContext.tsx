import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  authLogin,
  authLogout,
  authMe,
  authRegister,
  getToken,
  setToken,
  type Profile,
} from '../lib/api';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName: string, role: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

function toAuthError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof e === 'string') return new Error(e);
  return new Error(String(e ?? ''));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setProfile(null);
      return;
    }
    try {
      const { profile: p, user: u } = await authMe();
      setUser(u);
      setProfile(p);
    } catch {
      setToken(null);
      setUser(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchProfile().finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { profile: p, user: u } = await authLogin(email, password);
      setUser({ id: u.id, email: u.email });
      setProfile(p);
      return { error: null };
    } catch (e) {
      return { error: toAuthError(e) };
    }
  };

  const signUp = async (email: string, password: string, displayName: string, role: string) => {
    try {
      const { profile: p, user: u } = await authRegister(email, password, displayName, role);
      setUser({ id: u.id, email: u.email });
      setProfile(p);
      return { error: null };
    } catch (e) {
      return { error: toAuthError(e) };
    }
  };

  const signOut = async () => {
    authLogout();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
