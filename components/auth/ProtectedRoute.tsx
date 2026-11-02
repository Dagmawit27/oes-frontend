"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { RoleName } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleName[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, getDefaultDashboard } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.push("/login");
      } else if (allowedRoles && allowedRoles.length > 0) {
        const hasPermission = allowedRoles.some((role) => user.roles.includes(role));
        if (!hasPermission) {
          // Redirect to their default allowed dashboard
          router.push(getDefaultDashboard(user));
        }
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router, getDefaultDashboard]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasPermission = allowedRoles.some((role) => user.roles.includes(role));
    if (!hasPermission) {
      return null;
    }
  }

  return <>{children}</>;
}
