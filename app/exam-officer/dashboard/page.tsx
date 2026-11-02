"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, CalendarClock, Clock, Award, ArrowRight, ShieldCheck } from "lucide-react";

export default function ExamOfficerDashboardPage() {
  const { user } = useAuth();

  return (
    <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER"]}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Exam Officer Workspace
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Officer: {user?.firstName} {user?.lastName} — Examination Governance & Control
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/exam-officer/approvals">
              <Button className="shadow-md shadow-blue-500/20">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Review Examinations
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Approvals
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">0 Pending</div>
              <p className="text-xs text-slate-500 mt-1">Submitted by instructors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Scheduled Exams
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CalendarClock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">0 Upcoming</div>
              <p className="text-xs text-slate-500 mt-1">Ready for scheduled delivery</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Sessions
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">0 Ongoing</div>
              <p className="text-xs text-slate-500 mt-1">Real-time student attempts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Results to Publish
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">0 Awaiting</div>
              <p className="text-xs text-slate-500 mt-1">Subjective grading finalized</p>
            </CardContent>
          </Card>
        </div>

        {/* Core Responsibilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
                Examination Approval
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Inspect examination blueprints submitted by instructors, verify question distributions, and approve or reject with comments.
              </p>
              <Link href="/exam-officer/approvals" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                View submissions <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-blue-600" />
                Scheduling & Eligibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Set examination dates, official server deadlines, attempt limits, and enforce student course offering enrollment eligibility.
              </p>
              <Link href="/exam-officer/scheduling" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                Manage schedules <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Live Examination Monitor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Monitor student examination connections, ongoing autosave events, submission status, and broadcast official exam notices.
              </p>
              <Link href="/exam-officer/monitoring" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                Open monitor <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
