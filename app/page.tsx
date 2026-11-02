"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

export default function HomePage() {
  const { user, isAuthenticated, isLoading, getDefaultDashboard } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        router.replace(getDefaultDashboard(user));
      } else {
        router.replace("/login");
      }
    }
  }, [isLoading, isAuthenticated, user, router, getDefaultDashboard]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading Examination Portal...</p>
      </div>
    </div>
  );
}
