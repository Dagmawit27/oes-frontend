"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
  BookOpen,
  UserCheck,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { toast } from "sonner";

const approvalChartConfig = {
  exams: {
    label: "Exams",
    color: "#2563eb",
  },
} satisfies ChartConfig;

const scheduleChartConfig = {
  sittings: {
    label: "Sittings",
    color: "#8b5cf6",
  },
} satisfies ChartConfig;

const monitoringChartConfig = {
  candidates: {
    label: "Candidates",
    color: "#10b981",
  },
} satisfies ChartConfig;

const offeringsChartConfig = {
  enrolled: {
    label: "Enrolled",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

export default function ExamOfficerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [pendingExams, setPendingExams] = useState<Examination[]>([]);
  const [pendingTotalCount, setPendingTotalCount] = useState(0);
  const [allExams, setAllExams] = useState<Examination[]>([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState<ExamSchedule[]>([]);
  const [activeSessions, setActiveSessions] = useState<ScheduleMonitoringSummary[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [totalApprovedExams, setTotalApprovedExams] = useState(0);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [pendingRes, allExamsRes, schedRes, monitorRes, offerRes, approvedRes] =
        await Promise.allSettled([
          examApi.getExaminations({ status: "SUBMITTED", size: 10 }),
          examApi.getExaminations({ size: 100 }),
          scheduleApi.getSchedules({ size: 50 }),
          monitoringApi.getActiveSchedules(),
          academicApi.getCourseOfferings(),
          examApi.getExaminations({ status: "APPROVED", size: 1 }),
        ]);

      if (pendingRes.status === "fulfilled" && pendingRes.value.success && pendingRes.value.data) {
        setPendingExams(pendingRes.value.data.content);
        setPendingTotalCount(
          pendingRes.value.data.totalElements ?? pendingRes.value.data.content.length
        );
      }
      if (allExamsRes.status === "fulfilled" && allExamsRes.value.success && allExamsRes.value.data) {
        setAllExams(allExamsRes.value.data.content);
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

  const pendingCount = pendingTotalCount || pendingExams.length;
  const scheduledCount = upcomingSchedules.filter(
    (s) => s.status === "SCHEDULED" || s.status === "RESCHEDULED"
  ).length;
  const activeCount = activeSessions.filter(
    (s) => s.scheduleStatus === "ONGOING" || s.activeAttempts > 0
  ).length;
  const totalOfferingsCount = offerings.length;

  const totalActiveAttempts = activeSessions.reduce(
    (sum, s) => sum + (s.activeAttempts || 0),
    0
  );
  const totalSubmittedCandidates = activeSessions.reduce(
    (sum, s) => sum + (s.submittedCount || 0),
    0
  );
  const totalEnrolledStudents = offerings.reduce(
    (sum, o) => sum + (o.enrolledStudentsCount || 0),
    0
  );

  // Live DB Chart 1: Examination Lifecycle Pipeline (Line Chart)
  const approvalChartData = useMemo(
    () => [
      { stage: "Draft", exams: allExams.filter((e) => e.status === "DRAFT").length },
      { stage: "Submit", exams: allExams.filter((e) => e.status === "SUBMITTED").length },
      { stage: "Appr", exams: allExams.filter((e) => e.status === "APPROVED").length },
      {
        stage: "Sched",
        exams: allExams.filter((e) => e.status === "SCHEDULED" || e.status === "ONGOING").length,
      },
      { stage: "Done", exams: allExams.filter((e) => e.status === "COMPLETED").length },
    ],
    [allExams]
  );

  // Live DB Chart 2: Scheduled Sittings by Course (Bar Chart)
  const scheduleChartData = useMemo(() => {
    const courseMap: Record<string, number> = {};
    offerings.slice(0, 6).forEach((o) => {
      if (o.courseCode) courseMap[o.courseCode] = 0;
    });
    upcomingSchedules.forEach((s) => {
      const key = s.courseCode || "EXAM";
      courseMap[key] = (courseMap[key] || 0) + 1;
    });
    const entries = Object.entries(courseMap)
      .slice(0, 6)
      .map(([course, sittings]) => ({ course, sittings }));
    return entries.length > 0 ? entries : [{ course: "None", sittings: 0 }];
  }, [offerings, upcomingSchedules]);

  // Live DB Chart 3: Invigilation / Candidate Throughput (Emerald Area Chart)
  const monitoringChartData = useMemo(() => {
    if (activeSessions.length > 0) {
      return activeSessions.slice(0, 6).map((s) => ({
        session: s.courseCode || `#${s.scheduleId}`,
        candidates: s.totalEligible || s.activeAttempts + s.submittedCount,
      }));
    }
    const schedCandidates = upcomingSchedules
      .filter((s) => s.status === "SCHEDULED" || s.status === "RESCHEDULED")
      .reduce((sum, s) => sum + (s.eligibleStudentCount || 0), 0);
    const liveCandidates = upcomingSchedules
      .filter((s) => s.status === "ONGOING")
      .reduce((sum, s) => sum + (s.eligibleStudentCount || 0), 0);
    const doneCandidates = upcomingSchedules
      .filter((s) => s.status === "COMPLETED")
      .reduce((sum, s) => sum + (s.eligibleStudentCount || 0), 0);
    return [
      { session: "Sched", candidates: schedCandidates },
      { session: "Live", candidates: liveCandidates },
      { session: "Done", candidates: doneCandidates },
    ];
  }, [activeSessions, upcomingSchedules]);

  // Live DB Chart 4: Course Offerings Enrollment Load (Amber Area Chart)
  const offeringsChartData = useMemo(() => {
    const entries = offerings.slice(0, 6).map((o) => ({
      course: o.courseCode || `#${o.id}`,
      enrolled: o.enrolledStudentsCount || 0,
    }));
    return entries.length > 0 ? entries : [{ course: "N/A", enrolled: 0 }];
  }, [offerings]);

  return (
    <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* 4 Stats Cards with Live Database Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pending Approvals (Royal Blue Line Chart from DB) */}
          <Card className="flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md transition-shadow bg-white border-slate-200">
            <CardHeader className="flex flex-row items-start justify-between pb-1 space-y-0">
              <div>
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Approvals
                </CardTitle>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {loading ? "..." : `${pendingCount} Pending`}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <span className="text-emerald-600 font-semibold inline-flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> Live DB
                  </span>
                  {totalApprovedExams} approved
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-3 px-3">
              <ChartContainer config={approvalChartConfig} className="h-[90px] w-full aspect-auto">
                <LineChart
                  accessibilityLayer
                  data={approvalChartData}
                  margin={{ left: 8, right: 8, top: 4, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="stage"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    fontSize={10}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Line
                    dataKey="exams"
                    type="natural"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Card 2: Scheduled Exams (Purple Bar Chart from DB) */}
          <Card className="flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md transition-shadow bg-white border-slate-200">
            <CardHeader className="flex flex-row items-start justify-between pb-1 space-y-0">
              <div>
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Scheduled Exams
                </CardTitle>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {loading ? "..." : `${scheduledCount} Active`}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <span className="text-purple-600 font-semibold inline-flex items-center">
                    {upcomingSchedules.length} Sittings
                  </span>
                  across timetable
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-3 px-3">
              <ChartContainer config={scheduleChartConfig} className="h-[90px] w-full aspect-auto">
                <BarChart
                  accessibilityLayer
                  data={scheduleChartData}
                  margin={{ left: 8, right: 8, top: 4, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="course"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    fontSize={10}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="sittings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Card 3: Live Active Sessions (Emerald Area Chart from DB) */}
          <Card className="flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md transition-shadow bg-white border-slate-200">
            <CardHeader className="flex flex-row items-start justify-between pb-1 space-y-0">
              <div>
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Live Active Sessions
                </CardTitle>
                <div className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                  {loading ? "..." : `${activeCount} Ongoing`}
                  {activeCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <span className="text-emerald-600 font-semibold inline-flex items-center">
                    {totalActiveAttempts} Active
                  </span>
                  {totalSubmittedCandidates} submitted
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-3 px-3">
              <ChartContainer config={monitoringChartConfig} className="h-[90px] w-full aspect-auto">
                <AreaChart
                  accessibilityLayer
                  data={monitoringChartData}
                  margin={{ left: 8, right: 8, top: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="officerEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="session"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    fontSize={10}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Area
                    dataKey="candidates"
                    type="monotone"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#officerEmeraldGrad)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Card 4: Course Offerings (Amber Area Chart from DB) */}
          <Card className="flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md transition-shadow bg-white border-slate-200">
            <CardHeader className="flex flex-row items-start justify-between pb-1 space-y-0">
              <div>
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Course Offerings
                </CardTitle>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {loading ? "..." : `${totalOfferingsCount} Active`}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <span className="text-amber-600 font-semibold inline-flex items-center">
                    <Activity className="w-3 h-3 mr-0.5" /> {totalEnrolledStudents}
                  </span>
                  enrolled candidates
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-3 px-3">
              <ChartContainer config={offeringsChartConfig} className="h-[90px] w-full aspect-auto">
                <AreaChart
                  accessibilityLayer
                  data={offeringsChartData}
                  margin={{ left: 8, right: 8, top: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="officerAmberGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="course"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    fontSize={10}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Area
                    dataKey="enrolled"
                    type="monotone"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#officerAmberGrad)"
                  />
                </AreaChart>
              </ChartContainer>
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
