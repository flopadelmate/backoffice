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

// sessionStorage keys
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true, // Start as loading to check for existing session
  });
  const router = useRouter();

  // Restore session from sessionStorage on mount
  useEffect(() => {
    try {
      const storedToken = sessionStorage.getItem(TOKEN_KEY);
      const storedUser = sessionStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        // Check if token is expired
        if (!isTokenExpired(storedToken)) {
          const user = JSON.parse(storedUser) as AdminUser;

          // Restore state
          setState({
            user,
            token: storedToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Configure API client
          apiClient.setToken(storedToken);
        } else {
          // Token expired, clear storage
          sessionStorage.removeItem(TOKEN_KEY);
          sessionStorage.removeItem(USER_KEY);
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } else {
        // No stored session
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error("Failed to restore session:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []); // Run only on mount

  const handleLogout = useCallback(() => {
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Clear sessionStorage
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);

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

    // Save to sessionStorage
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));

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
