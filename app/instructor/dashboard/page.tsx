"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resultApi, InstructorDashboardStats } from "@/lib/api/result";
import { FileQuestion, FileSpreadsheet, CheckCircle2, BookOpen, ArrowRight, PlusCircle } from "lucide-react";

export default function InstructorDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<InstructorDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await resultApi.getInstructorDashboardStats();
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("Failed to load instructor dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <DashboardShell allowedRoles={["ROLE_INSTRUCTOR"]}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Instructor Portal
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Welcome, Prof. {user?.firstName} {user?.lastName} — Question Authoring & Examination Assessment
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/instructor/examinations/create">
              <Button className="shadow-md shadow-blue-500/20">
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Examination
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                My Courses
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {loading ? "..." : `${stats?.assignedCoursesCount ?? 0} Courses`}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {loading ? "Loading active offerings..." : `${stats?.totalEnrolledStudents ?? 0} Enrolled students`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Question Bank
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileQuestion className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {loading ? "..." : `${stats?.totalQuestionsCount ?? 0} Items`}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {loading ? "Loading questions..." : "Authored in question bank"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                My Examinations
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {loading ? "..." : `${stats?.totalExamsCount ?? 0} Exams`}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {loading
                  ? "Loading status..."
                  : `${stats?.pendingReviewExamsCount ?? 0} Pending, ${stats?.approvedExamsCount ?? 0} Approved`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Grading
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {loading ? "..." : `${stats?.pendingGradingSubmissionsCount ?? 0} Submissions`}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {loading
                  ? "Loading assessments..."
                  : `${stats?.completedGradingCount ?? 0} Tasks completed`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                New Examination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Author new examinations with questions, timing, attempts, and scoring rules created directly in the exam blueprint.
              </p>
              <Link href="/instructor/examinations/create" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                Create examination <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                Examination Authoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Assemble questions from your bank, specify durations and total marks, save blueprints as drafts, and submit to the Exam Officer.
              </p>
              <Link href="/instructor/examinations" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                Build examination <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Manual Grading
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Evaluate student short answers and essay submissions with dedicated rubric scoring, instructor feedback, and grade calculation.
              </p>
              <Link href="/instructor/grading" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                Grade submissions <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
