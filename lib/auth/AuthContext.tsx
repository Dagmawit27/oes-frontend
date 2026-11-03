"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, RoleName, LoginResponseData } from "@/types/auth";
import { authApi } from "@/lib/api/auth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponseData>;
  logout: () => Promise<void>;
  hasRole: (role: RoleName) => boolean;
  hasAnyRole: (roles: RoleName[]) => boolean;
  getDefaultDashboard: (user: User) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const getDefaultDashboard = useCallback((userData: User): string => {
    if (userData.roles.includes("ROLE_ADMIN")) return "/admin/dashboard";
    if (userData.roles.includes("ROLE_EXAM_OFFICER")) return "/exam-officer/dashboard";
    if (userData.roles.includes("ROLE_INSTRUCTOR")) return "/instructor/dashboard";
    if (userData.roles.includes("ROLE_STUDENT")) return "/student/dashboard";
    return "/login";
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem("oes_user");
        const token = localStorage.getItem("oes_access_token");

        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
          // Verify with backend
          try {
            const profileRes = await authApi.getCurrentUser();
            if (profileRes.success && profileRes.data) {
              setUser(profileRes.data);
              localStorage.setItem("oes_user", JSON.stringify(profileRes.data));
            }
          } catch {
            // Token might be valid or auto-refreshed by interceptor; keep stored user if active
          } 
        }
      } catch (error) {
        console.error("Failed to initialize authentication", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResponseData> => {
    setIsLoading(true);
    try {
      const response = await authApi.login(email, password);
      const data = response.data;

      localStorage.setItem("oes_access_token", data.accessToken);
      localStorage.setItem("oes_refresh_token", data.refreshToken);

      const loggedInUser: User = {
        id: data.userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: true,
        roles: data.roles,
      };

      localStorage.setItem("oes_user", JSON.stringify(loggedInUser));
      setUser(loggedInUser);

      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const refreshToken = localStorage.getItem("oes_refresh_token") || undefined;
      await authApi.logout(refreshToken).catch(() => {});
    } finally {
      localStorage.removeItem("oes_access_token");
      localStorage.removeItem("oes_refresh_token");
      localStorage.removeItem("oes_user");
      setUser(null);
      setIsLoading(false);
      router.push("/login");
    }
  };

  const hasRole = (role: RoleName): boolean => {
    return !!user && user.roles.includes(role);
  };

  const hasAnyRole = (roles: RoleName[]): boolean => {
    return !!user && roles.some((r) => user.roles.includes(r));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        hasAnyRole,
        getDefaultDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
