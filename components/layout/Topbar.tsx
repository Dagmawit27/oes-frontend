"use client";

import React from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useSidebar } from "./SidebarContext";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export function Topbar() {
  const { user, logout } = useAuth();
  const { isCollapsed, toggleCollapse } = useSidebar();

  if (!user) return null;

  const formatRoleName = (roles: string[]) => {
    if (roles.includes("ROLE_ADMIN")) return "Administrator";
    if (roles.includes("ROLE_EXAM_OFFICER")) return "Exam Officer";
    if (roles.includes("ROLE_INSTRUCTOR")) return "Instructor";
    if (roles.includes("ROLE_STUDENT")) return "Student";
    return "User";
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Sidebar Collapse/Expand Toggle Arrow */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar menu" : "Collapse sidebar menu"}
          title={isCollapsed ? "Expand sidebar menu" : "Collapse sidebar menu"}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-sky-600 hover:bg-sky-50 hover:border-sky-300 shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          )}
        </button>

        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline-block">
          {formatRoleName(user.roles)} Portal
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Real-time Notification Bell */}
        <NotificationBell />

        {/* User Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50/70 border border-sky-100 text-sm">
          <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-semibold">
            {user.firstName?.charAt(0)}
          </div>
          <span className="font-medium text-slate-800 text-xs sm:text-sm">
            {user.firstName} {user.lastName}
          </span>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          className="text-xs text-slate-600 hover:text-rose-600 hover:border-rose-200 h-9"
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}
