"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Building2, BookOpen, Layers, ShieldCheck, ArrowRight, UserPlus, FileSpreadsheet } from "lucide-react";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <DashboardShell allowedRoles={["ROLE_ADMIN"]}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user?.firstName}!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Administrator Console — College Online Examination System
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/users">
              <Button className="shadow-md shadow-blue-500/20">
                <UserPlus className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Users
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">4 Active</div>
              <p className="text-xs text-slate-500 mt-1">Admin, Officer, Instructor, Student</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Departments
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">Configured</div>
              <p className="text-xs text-slate-500 mt-1">Ready for Milestone 5</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Academic Programs
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">Undergraduate</div>
              <p className="text-xs text-slate-500 mt-1">Degree college curriculum</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                System Security
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">Enforced</div>
              <p className="text-xs text-slate-500 mt-1">JWT + Role-based RBAC</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                User Administration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Manage accounts, grant roles (Administrator, Exam Officer, Instructor, Student), and manage college credentials.
              </p>
              <Link href="/admin/users" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                Manage accounts <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Academic Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Set up departments, academic programs, semester calendars, and course offerings for students.
              </p>
              <Link href="/admin/departments" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                Academic setup <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                System Audit & Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Monitor examination compliance, track login attempts, and review overall college statistics.
              </p>
              <Link href="/admin/reports" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                View statistics <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
