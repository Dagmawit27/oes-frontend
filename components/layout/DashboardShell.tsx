"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { SidebarProvider } from "./SidebarContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleName } from "@/types/auth";

interface DashboardShellProps {
  children: React.ReactNode;
  allowedRoles?: RoleName[];
}

export function DashboardShell({ children, allowedRoles }: DashboardShellProps) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <SidebarProvider>
        <div className="flex min-h-screen bg-slate-50/60 antialiased font-sans">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
