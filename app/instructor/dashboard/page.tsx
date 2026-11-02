"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileQuestion, FileSpreadsheet, CheckCircle2, BookOpen, ArrowRight, PlusCircle } from "lucide-react";

export default function InstructorDashboardPage() {
  const { user } = useAuth();

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
            <Link href="/instructor/questions">
              <Button className="shadow-md shadow-blue-500/20">
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Questions
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
              <div className="text-2xl font-bold text-slate-900">Assigned</div>
              <p className="text-xs text-slate-500 mt-1">Active course offerings</p>
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
              <div className="text-2xl font-bold text-slate-900">5 Types</div>
              <p className="text-xs text-slate-500 mt-1">MCQ, T/F, Short Answer, Essay</p>
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
              <div className="text-2xl font-bold text-slate-900">Draft / Submitted</div>
              <p className="text-xs text-slate-500 mt-1">Awaiting approval or live</p>
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
              <div className="text-2xl font-bold text-slate-900">0 Items</div>
              <p className="text-xs text-slate-500 mt-1">Subjective answer assessment</p>
            </CardContent>
          </Card>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-blue-600" />
                Question Bank
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Author multiple-choice, true/false, short answer, and essay questions. Categorize by course offering and difficulty.
              </p>
              <Link href="/instructor/questions" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                Manage questions <ArrowRight className="w-4 h-4 ml-1" />
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
