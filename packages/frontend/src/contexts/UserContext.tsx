'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../app/actions';

interface User {
  id: string;
  email?: string;
  [key: string]: any;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      auth()
        .then((userData) => {
          if (userData === false) {
            setUser(null);
          } else if (userData && typeof userData === 'object' && 'properties' in userData) {
            // Transform the subject object to match User interface
            setUser({
              id: userData.properties.id,
              email: userData.properties.id // Use id as email since that's what we store
            });
          } else {
            setUser(null);
          }
        })
        .catch((error) => {
          console.error("Auth check failed:", error);
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    };

    checkAuth();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 