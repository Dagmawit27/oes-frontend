"use client";

import React from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Badge } from "@/lib/../components/ui/badge";
import { Button } from "@/lib/../components/ui/button";
import { LogOut, User as UserIcon, Bell } from "lucide-react";

export function Topbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getRoleBadgeVariant = (roles: string[]) => {
    if (roles.includes("ROLE_ADMIN")) return "admin";
    if (roles.includes("ROLE_EXAM_OFFICER")) return "officer";
    if (roles.includes("ROLE_INSTRUCTOR")) return "instructor";
    if (roles.includes("ROLE_STUDENT")) return "student";
    return "secondary";
  };

  const formatRoleName = (roles: string[]) => {
    if (roles.includes("ROLE_ADMIN")) return "Administrator";
    if (roles.includes("ROLE_EXAM_OFFICER")) return "Exam Officer";
    if (roles.includes("ROLE_INSTRUCTOR")) return "Instructor";
    if (roles.includes("ROLE_STUDENT")) return "Student";
    return "User";
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      {/* Title / Breadcrumb Context */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-slate-800">
          College Online Examination System
        </h1>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <Badge variant={getRoleBadgeVariant(user.roles)}>
          {formatRoleName(user.roles)}
        </Badge>

        {/* User Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
            {user.firstName.charAt(0)}
          </div>
          <span className="font-medium text-slate-700">
            {user.firstName} {user.lastName}
          </span>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          className="text-slate-600 hover:text-red-600 hover:border-red-200"
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Sign Out
        </Button>
      </div>
    </header>
  );
}
