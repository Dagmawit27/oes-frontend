"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, FileSpreadsheet, Clock, Award, ArrowRight, PlayCircle } from "lucide-react";

export default function StudentDashboardPage() {
  const { user } = useAuth();

  return (
    <DashboardShell allowedRoles={["ROLE_STUDENT"]}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Hello, {user?.firstName}!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Student Examination Portal — Degree College Academic Assessment
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/student/examinations">
              <Button className="shadow-md shadow-blue-500/20">
                <PlayCircle className="w-4 h-4 mr-2" />
                View Available Exams
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Enrolled Courses
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">Enrolled</div>
              <p className="text-xs text-slate-500 mt-1">Current semester curriculum</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Available Exams
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600">0 Ready</div>
              <p className="text-xs text-slate-500 mt-1">Eligible to start</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Completed Exams
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">0 Finished</div>
              <p className="text-xs text-slate-500 mt-1">Submitted sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Published Results
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">0 Available</div>
              <p className="text-xs text-slate-500 mt-1">Official scores & grades</p>
            </CardContent>
          </Card>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-teal-600" />
                Active Examinations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Access scheduled exams, take tests with distraction-free UI, automatic answer saving, and official server countdown timers.
              </p>
              <Link href="/student/examinations" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                View exams <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Enrolled Courses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Check registered course offerings, instructor details, syllabus coverage, and scheduled assessment timetables.
              </p>
              <Link href="/student/courses" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                My courses <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                Grades & Transcripts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                View certified exam performance, marks breakdown, percentage scores, and official letter grades authorized for release.
              </p>
              <Link href="/student/results" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                Check results <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
