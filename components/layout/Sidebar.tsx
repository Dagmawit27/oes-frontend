"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useSidebar } from "./SidebarContext";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  CalendarClock,
  Clock,
  FileSpreadsheet,
  Award,
  BarChart3,
  LogOut,
  UserCheck,
  CheckCircle2,
  Bell,
  ClipboardCheck,
  ChevronLeft,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isCollapsed, toggleCollapse } = useSidebar();

  if (!user) return null;

  const isRole = (role: string) => user.roles.includes(role as never);

  const adminNav: NavItem[] = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Academic Hub", href: "/admin/academic", icon: GraduationCap },
    { label: "User Management", href: "/admin/users", icon: Users },
    { label: "Departments", href: "/admin/departments", icon: Building2 },
    { label: "Courses", href: "/admin/courses", icon: BookOpen },
    { label: "Enrollments", href: "/admin/enrollments", icon: UserCheck },
    { label: "Institutional Results", href: "/admin/results", icon: Award },
    { label: "System Reports", href: "/admin/reports", icon: BarChart3 },
  ];

  const officerNav: NavItem[] = [
    { label: "Dashboard", href: "/exam-officer/dashboard", icon: LayoutDashboard },
    { label: "Academic Offerings", href: "/exam-officer/academic", icon: BookOpen },
    { label: "Exam Approvals", href: "/exam-officer/approvals", icon: ClipboardCheck },
    { label: "Exam Scheduling", href: "/exam-officer/scheduling", icon: CalendarClock },
    { label: "Student Eligibility", href: "/exam-officer/eligibility", icon: UserCheck },
    { label: "Live Monitoring", href: "/exam-officer/monitoring", icon: Clock },
    { label: "Grading Review", href: "/exam-officer/grading-review", icon: CheckCircle2 },
    { label: "Result Publication", href: "/exam-officer/results", icon: Award },
  ];

  const instructorNav: NavItem[] = [
    { label: "Dashboard", href: "/instructor/dashboard", icon: LayoutDashboard },
    { label: "My Courses", href: "/instructor/courses", icon: BookOpen },
    { label: "Examinations", href: "/instructor/examinations", icon: FileSpreadsheet },
    { label: "Submissions", href: "/instructor/submissions", icon: ClipboardCheck },
    { label: "Manual Grading", href: "/instructor/grading", icon: CheckCircle2 },
    { label: "Course Results", href: "/instructor/results", icon: Award },
  ];

  const studentNav: NavItem[] = [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "Academic Profile", href: "/student/profile", icon: GraduationCap },
    { label: "My Courses", href: "/student/courses", icon: BookOpen },
    { label: "Available Exams", href: "/student/examinations", icon: FileSpreadsheet },
    { label: "Exam Schedule", href: "/student/schedule", icon: CalendarClock },
    { label: "Exam History", href: "/student/history", icon: Clock },
    { label: "My Results", href: "/student/results", icon: Award },
    { label: "Notifications", href: "/student/notifications", icon: Bell },
  ];

  let currentNav: NavItem[] = [];
  let roleTitle = "Portal";

  if (isRole("ROLE_ADMIN")) {
    currentNav = adminNav;
    roleTitle = "Administrator";
  } else if (isRole("ROLE_EXAM_OFFICER")) {
    currentNav = officerNav;
    roleTitle = "Exam Officer";
  } else if (isRole("ROLE_INSTRUCTOR")) {
    currentNav = instructorNav;
    roleTitle = "Instructor";
  } else if (isRole("ROLE_STUDENT")) {
    currentNav = studentNav;
    roleTitle = "Student";
  }

  return (
    <aside
      className={cn(
        "relative bg-white text-slate-700 flex flex-col h-screen sticky top-0 border-r border-slate-200/90 shadow-xs select-none transition-all duration-300 ease-in-out shrink-0 z-30",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "h-16 flex items-center border-b border-slate-100 bg-white gap-3 transition-all",
          isCollapsed ? "px-4 justify-center" : "px-5 justify-between"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          {!isCollapsed && (
            <div className="truncate animate-in fade-in duration-200">
              <span className="font-bold text-base text-slate-900 tracking-tight leading-tight block">
                College OES
              </span>
              <span className="text-xs text-sky-600 font-semibold">{roleTitle}</span>
            </div>
          )}
        </div>

        {/* Inner header toggle icon (when expanded) */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            title="Collapse sidebar menu"
            aria-label="Collapse sidebar menu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin bg-white">
        {!isCollapsed && (
          <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider animate-in fade-in duration-200">
            Navigation
          </div>
        )}
        {currentNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-all duration-150 group",
                isCollapsed
                  ? "justify-center px-0 py-2.5"
                  : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-sky-50 text-sky-700 font-semibold border-l-4 border-sky-600 shadow-xs"
                  : "text-slate-600 hover:bg-sky-50/80 hover:text-sky-700"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-sky-600" : "text-slate-400 group-hover:text-sky-600"
                )}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div
        className={cn(
          "p-3 border-t border-slate-100 bg-slate-50/60 flex items-center gap-3 transition-all",
          isCollapsed ? "flex-col justify-center" : "justify-between"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">
            {user.firstName?.charAt(0)}
            {user.lastName?.charAt(0)}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 truncate animate-in fade-in duration-200">
              <div className="text-sm font-semibold text-slate-800 truncate">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => logout()}
          title="Sign out"
          aria-label="Sign out"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
