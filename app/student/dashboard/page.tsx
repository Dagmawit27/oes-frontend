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
              <Link href="/student/courses" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                View Courses & Exam Results <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
