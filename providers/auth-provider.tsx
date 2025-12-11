"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/types/api";
import { apiClient } from "@/lib/api-client";
import { isTokenExpired } from "@/lib/auth";

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true, // Start as loading to check for existing session
  });
  const router = useRouter();

  const handleLogout = useCallback(() => {
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Clear token from API client
    apiClient.setToken(null);

    // Redirect to login
    router.push("/login");
  }, [router]);

  // Set up unauthorized handler on mount
  useEffect(() => {
    apiClient.setUnauthorizedHandler(handleLogout);
  }, [handleLogout]);

  // Check token validity on mount and periodically
  useEffect(() => {
    // Initial check
    if (state.token && isTokenExpired(state.token)) {
      handleLogout();
    }

    // Mark as no longer loading after initial check
    if (state.isLoading) {
      setState((prev) => ({ ...prev, isLoading: false }));
    }

    // Set up periodic check (every minute)
    const interval = setInterval(() => {
      if (state.token && isTokenExpired(state.token)) {
        handleLogout();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [state.token, state.isLoading]);

  const handleLogin = useCallback((token: string, user: AdminUser) => {
    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });

    // Update API client with token
    apiClient.setToken(token);
  }, []);

  const value: AuthContextValue = {
    ...state,
    login: handleLogin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
