"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  Calendar,
  Layers,
  FileQuestion,
  ClipboardCheck,
  CalendarClock,
  Clock,
  FileSpreadsheet,
  Award,
  BarChart3,
  LogOut,
  UserCheck,
  CheckCircle2,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const isRole = (role: string) => user.roles.includes(role as never);

  const adminNav: NavItem[] = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Academic Hub", href: "/admin/academic", icon: GraduationCap },
    { label: "User Management", href: "/admin/users", icon: Users },
    { label: "Departments", href: "/admin/departments", icon: Building2 },
    { label: "Courses", href: "/admin/courses", icon: BookOpen },
    { label: "Enrollments", href: "/admin/enrollments", icon: UserCheck },
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
    { label: "Question Bank", href: "/instructor/questions", icon: FileQuestion },
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
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <span className="font-bold text-base text-white tracking-tight leading-tight block">
            College OES
          </span>
          <span className="text-xs text-blue-400 font-medium">{roleTitle}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Navigation
        </div>
        {currentNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white truncate">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-slate-400 truncate">{user.email}</div>
        </div>
        <button
          onClick={() => logout()}
          title="Sign out"
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
