import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToAuthState, type UserProfile } from '../lib/auth';

interface AuthContextValue {
  currentUser: UserProfile | null;
  loading: boolean;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextValue>({ currentUser: null, loading: true, setCurrentUser: () => undefined });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeToAuthState(profile => {
    setCurrentUser(profile);
    setLoading(false);
  }), []);

  return <AuthContext.Provider value={{ currentUser, loading, setCurrentUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
