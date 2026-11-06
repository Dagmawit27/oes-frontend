"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { examApi } from "@/lib/api/exam";
import { scheduleApi } from "@/lib/api/schedule";
import { monitoringApi } from "@/lib/api/monitoring";
import { academicApi } from "@/lib/api/academic";
import { Examination } from "@/types/exam";
import { ExamSchedule } from "@/types/schedule";
import { ScheduleMonitoringSummary } from "@/types/monitoring";
import { CourseOffering } from "@/types/academic";
import {
  ClipboardCheck,
  CalendarClock,
  Clock,
  Award,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Eye,
  Calendar,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export default function ExamOfficerDashboardPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [pendingExams, setPendingExams] = useState<Examination[]>([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState<ExamSchedule[]>([]);
  const [activeSessions, setActiveSessions] = useState<ScheduleMonitoringSummary[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [totalApprovedExams, setTotalApprovedExams] = useState(0);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [pendingRes, schedRes, monitorRes, offerRes, approvedRes] = await Promise.allSettled([
        examApi.getExaminations({ status: "SUBMITTED", size: 10 }),
        scheduleApi.getSchedules({ size: 10 }),
        monitoringApi.getActiveSchedules(),
        academicApi.getCourseOfferings(),
        examApi.getExaminations({ status: "APPROVED", size: 1 }),
      ]);

      if (pendingRes.status === "fulfilled" && pendingRes.value.success && pendingRes.value.data) {
        setPendingExams(pendingRes.value.data.content);
      }
      if (schedRes.status === "fulfilled" && schedRes.value.success && schedRes.value.data) {
        setUpcomingSchedules(schedRes.value.data.content);
      }
      if (monitorRes.status === "fulfilled" && monitorRes.value.data) {
        setActiveSessions(monitorRes.value.data);
      }
      if (offerRes.status === "fulfilled" && offerRes.value.success && offerRes.value.data) {
        setOfferings(offerRes.value.data);
      }
      if (approvedRes.status === "fulfilled" && approvedRes.value.success && approvedRes.value.data) {
        setTotalApprovedExams(approvedRes.value.data.totalElements || 0);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
      toast.error("Failed to load officer dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const pendingCount = pendingExams.length;
  const scheduledCount = upcomingSchedules.filter(
    (s) => s.status === "SCHEDULED" || s.status === "RESCHEDULED"
  ).length;
  const activeCount = activeSessions.filter(
    (s) => s.scheduleStatus === "ONGOING" || s.activeAttempts > 0
  ).length;
  const totalOfferingsCount = offerings.length;

  return (
    <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                Exam Officer Control Center
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">Academic Year 2025/2026</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-sm text-slate-500">
              Manage examination blueprints, verify question allocations, schedule exam sittings, and govern candidate results.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboardData}
              disabled={loading}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/exam-officer/approvals">
              <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5 text-xs shadow-xs">
                <ClipboardCheck className="w-4 h-4" />
                Review Submissions
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Pending Approvals */}
          <Card className="bg-white border-slate-200/90 shadow-xs hover:border-sky-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Approvals
              </CardTitle>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {loading ? "..." : pendingCount}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span className={pendingCount > 0 ? "text-amber-600 font-semibold" : "text-slate-500"}>
                  {pendingCount === 1 ? "1 exam" : `${pendingCount} exams`} awaiting review
                </span>
              </p>
            </CardContent>
          </Card>

          {/* 2. Scheduled Exams */}
          <Card className="bg-white border-slate-200/90 shadow-xs hover:border-sky-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Scheduled Exams
              </CardTitle>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200/60">
                <CalendarClock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {loading ? "..." : scheduledCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Active examination sittings
              </p>
            </CardContent>
          </Card>

          {/* 3. Active Sessions */}
          <Card className="bg-white border-slate-200/90 shadow-xs hover:border-sky-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Live Active Sessions
              </CardTitle>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                <Clock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                {loading ? "..." : activeCount}
                {activeCount > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time invigilation running
              </p>
            </CardContent>
          </Card>

          {/* 4. Course Offerings */}
          <Card className="bg-white border-slate-200/90 shadow-xs hover:border-sky-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Course Offerings
              </CardTitle>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
                <BookOpen className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {loading ? "..." : totalOfferingsCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {totalApprovedExams} approved blueprints
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Queue Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Examination Approvals */}
          <Card className="bg-white border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-sky-600" />
                  Submissions Awaiting Approval ({pendingExams.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Teacher examination blueprints requiring audit and sign-off
                </CardDescription>
              </div>
              <Link href="/exam-officer/approvals">
                <Button variant="ghost" size="sm" className="text-xs text-sky-600 hover:text-sky-700 h-8 gap-1">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading pending reviews...</div>
              ) : pendingExams.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/80 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800">Queue is Clear</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    No examination blueprints are currently pending your approval.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingExams.slice(0, 5).map((exam) => (
                    <div
                      key={exam.id}
                      className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-sm">
                            {exam.title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Awaiting
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-700">{exam.courseCode} - {exam.courseName}</span>
                          <span>&bull;</span>
                          <span>{exam.createdByName || "Instructor"}</span>
                          <span>&bull;</span>
                          <span className="font-semibold text-slate-700">{exam.totalMarks} Marks</span>
                        </div>
                      </div>
                      <Link href={`/exam-officer/approvals/${exam.id}`}>
                        <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8 gap-1 shrink-0">
                          Review <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Exam Schedules */}
          <Card className="bg-white border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-sky-600" />
                  Upcoming Examination Sittings ({upcomingSchedules.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Scheduled time windows, room allocations, and eligible candidates
                </CardDescription>
              </div>
              <Link href="/exam-officer/scheduling">
                <Button variant="ghost" size="sm" className="text-xs text-sky-600 hover:text-sky-700 h-8 gap-1">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading schedule...</div>
              ) : upcomingSchedules.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800">No Scheduled Sittings</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Schedule approved examinations into exam rooms and calendar time slots.
                  </p>
                  <Link href="/exam-officer/scheduling" className="mt-3 inline-block">
                    <Button size="sm" variant="outline" className="text-xs">
                      Schedule Exam
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {upcomingSchedules.slice(0, 5).map((sched) => (
                    <div
                      key={sched.id}
                      className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-sm">
                            {sched.examinationTitle}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              sched.status === "SCHEDULED"
                                ? "bg-sky-50 text-sky-700 border border-sky-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {sched.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                          <span>{sched.courseCode}</span>
                          <span>&bull;</span>
                          <span className="text-slate-700 font-medium">
                            {new Date(sched.scheduledStartAt).toLocaleDateString()}
                          </span>
                          <span>&bull;</span>
                          <span>
                            {new Date(sched.scheduledStartAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                            {new Date(sched.scheduledCloseAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {sched.roomName && (
                            <>
                              <span>&bull;</span>
                              <span className="text-slate-700 font-medium">{sched.roomName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Link href={`/exam-officer/scheduling/${sched.id}`}>
                        <Button variant="outline" size="sm" className="text-xs h-8 gap-1 shrink-0 text-slate-700">
                          Manage <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Operations Navigation Grid */}
        <div>
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900">Governance & Operations Portals</h2>
            <p className="text-xs text-slate-500">Access role-authorized operations and tools</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Approvals */}
            <Card className="bg-white border-slate-200/90 shadow-xs hover:border-sky-300 transition-all group">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60 group-hover:scale-105 transition-transform">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                    Examination Approvals
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Audit submitted examinations, inspect question balance, verify scoring rules, and authorize exam lock-in.
                  </p>
                </div>
                <Link
                  href="/exam-officer/approvals"
                  className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-700 pt-1"
                >
                  Open Approvals Queue <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card className="bg-white border-slate-200/90 shadow-xs hover:border-sky-300 transition-all group">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60 group-hover:scale-105 transition-transform">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                    Scheduling & Rooms
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Set calendar time windows, detect room & candidate timetable conflicts, and allocate campus test halls.
                  </p>
                </div>
                <Link
                  href="/exam-officer/scheduling"
                  className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-700 pt-1"
                >
                  Manage Schedules <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </CardContent>
            </Card>

            {/* Student Eligibility */}
            <Card className="bg-white border-slate-200/90 shadow-xs hover:border-sky-300 transition-all group">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60 group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                    Student Eligibility
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Verify enrollment rosters, confirm student eligibility prerequisites, and issue authorized administrative exemptions.
                  </p>
                </div>
                <Link
                  href="/exam-officer/eligibility"
                  className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-700 pt-1"
                >
                  Review Candidate Rosters <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </CardContent>
            </Card>

            {/* Live Monitoring */}
            <Card className="bg-white border-slate-200/90 shadow-xs hover:border-sky-300 transition-all group">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60 group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                    Live Invigilation & Monitoring
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Watch real-time WebSocket attempt heartbeats, inspect student autosave telemetry, and broadcast official exam announcements.
                  </p>
                </div>
                <Link
                  href="/exam-officer/monitoring"
                  className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-700 pt-1"
                >
                  Open Live Monitor <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </CardContent>
            </Card>

            {/* Academic Offerings */}
            <Card className="bg-white border-slate-200/90 shadow-xs hover:border-sky-300 transition-all group">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                    Academic Offerings & Rosters
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Inspect active semester courses, assigned faculty members, capacity caps, and enrolled student directories.
                  </p>
                </div>
                <Link
                  href="/exam-officer/academic"
                  className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-700 pt-1"
                >
                  View Offerings <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </CardContent>
            </Card>

            {/* Results Publication */}
            <Card className="bg-white border-slate-200/90 shadow-xs hover:border-sky-300 transition-all group">
              <CardContent className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60 group-hover:scale-105 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                    Result Publication & Audit
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Audit finalized instructor scoring, authorize candidate grade publication, adjust marks with audit trails, and export CSVs.
                  </p>
                </div>
                <Link
                  href="/exam-officer/results"
                  className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-700 pt-1"
                >
                  Publish & Audit Results <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
