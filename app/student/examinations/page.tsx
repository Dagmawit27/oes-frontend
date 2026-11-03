"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scheduleApi } from "@/lib/api/schedule";
import { StudentSchedule, ExamNotification, ScheduleStatus, EligibilityStatus } from "@/types/schedule";
import {
  FileSpreadsheet,
  Clock,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Bell,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Info,
  Timer,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

function StudentExaminationsContent() {
  const [schedules, setSchedules] = useState<StudentSchedule[]>([]);
  const [notifications, setNotifications] = useState<ExamNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"available" | "upcoming" | "past">("available");
  const [search, setSearch] = useState("");
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedExamDetails, setSelectedExamDetails] = useState<StudentSchedule | null>(null);

  // Live timer tick with safe deterministic initial value for prerender
  const [currentTime, setCurrentTime] = useState<Date>(
    () => new Date("2026-03-09T00:00:00Z")
  );

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schedRes, notifRes] = await Promise.all([
        scheduleApi.getStudentSchedules(),
        scheduleApi.getMyNotifications(),
      ]);

      if (schedRes.success && schedRes.data) {
        setSchedules(schedRes.data);
      }
      if (notifRes.success && notifRes.data) {
        setNotifications(notifRes.data);
      }
    } catch {
      toast.error("Failed to load examination portal data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter schedules based on search
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const q = search.toLowerCase();
      return (
        s.examinationTitle.toLowerCase().includes(q) ||
        s.courseCode.toLowerCase().includes(q) ||
        s.courseName.toLowerCase().includes(q)
      );
    });
  }, [schedules, search]);

  // Categorize schedules
  const availableExams = useMemo(() => {
    return filteredSchedules.filter((s) => {
      const now = currentTime.getTime();
      const start = new Date(s.scheduledStartAt).getTime();
      const close = new Date(s.scheduledCloseAt).getTime();
      return (
        s.status !== "CANCELLED" &&
        now >= start &&
        now < close &&
        s.eligibilityStatus === "ELIGIBLE"
      );
    });
  }, [filteredSchedules, currentTime]);

  const upcomingExams = useMemo(() => {
    return filteredSchedules.filter((s) => {
      const now = currentTime.getTime();
      const start = new Date(s.scheduledStartAt).getTime();
      return (
        (s.status === "SCHEDULED" || s.status === "RESCHEDULED") &&
        now < start
      );
    });
  }, [filteredSchedules, currentTime]);

  const pastExams = useMemo(() => {
    return filteredSchedules.filter((s) => {
      const now = currentTime.getTime();
      const close = new Date(s.scheduledCloseAt).getTime();
      return s.status === "COMPLETED" || s.status === "CANCELLED" || now >= close;
    });
  }, [filteredSchedules, currentTime]);

  // Calculate remaining time countdown string
  const formatCountdown = (targetDateString: string) => {
    const diff = new Date(targetDateString).getTime() - currentTime.getTime();
    if (diff <= 0) return "00:00:00 (Window Closed)";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(
      seconds
    ).padStart(2, "0")}s`;
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <DashboardShell allowedRoles={["ROLE_STUDENT", "ROLE_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Student Examination Portal
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              My Academic Examinations
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Access available exam sessions, inspect official guidelines, and monitor your scheduled testing windows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotificationModal(true)}
              className="relative gap-2 border-slate-200 bg-white"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              <span>Notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {unreadNotificationsCount}
                </span>
              )}
            </Button>

            <Link href="/student/schedule">
              <Button size="sm" variant="outline" className="gap-2 border-slate-200 bg-white">
                <Calendar className="w-4 h-4 text-slate-600" />
                <span>Timetable Grid</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("available")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === "available"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>Available Now</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "available"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {availableExams.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === "upcoming"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>Upcoming</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "upcoming"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {upcomingExams.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("past")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === "past"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>Past & Concluded</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "past"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {pastExams.length}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search exam or course code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Tab 1: Available Now (Active Examination Hall) */}
        {activeTab === "available" && (
          <div className="space-y-4">
            {availableExams.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
                <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  No Examinations Active Right Now
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  You do not have any open examination windows at this exact moment. Please check your
                  upcoming timetable to prepare for future sessions.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("upcoming")}
                  className="mt-2 text-xs"
                >
                  View Upcoming Examinations
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {availableExams.map((exam) => {
                  const start = new Date(exam.scheduledStartAt);
                  const close = new Date(exam.scheduledCloseAt);

                  return (
                    <Card
                      key={exam.scheduleId}
                      className="border-2 border-emerald-500/80 shadow-md bg-gradient-to-r from-emerald-50/40 via-white to-white overflow-hidden"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                          {/* Info Column */}
                          <div className="space-y-3 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-emerald-600 text-white animate-pulse">
                                Live Session Open
                              </Badge>
                              <Badge variant="outline" className="border-emerald-300 text-emerald-800">
                                {exam.courseCode} — Sec {exam.section || "A"}
                              </Badge>
                              <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                                {exam.semesterName || "Current Semester"}
                              </Badge>
                            </div>

                            <div>
                              <h3 className="text-xl font-bold text-slate-900">
                                {exam.examinationTitle}
                              </h3>
                              <p className="text-xs text-slate-600 font-medium mt-0.5">
                                {exam.courseName}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 pt-1">
                              <div>
                                <span className="text-slate-400 font-medium block">Allocated Time</span>
                                <span className="font-bold text-slate-800">
                                  {exam.durationMinutes} Minutes
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium block">Passing Threshold</span>
                                <span className="font-bold text-slate-800">
                                  {exam.passingMarks} / {exam.totalMarks} Marks
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium block">Venue</span>
                                <span className="font-bold text-slate-800">
                                  {exam.roomName || "Online Examination Hall"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium block">Eligibility</span>
                                <span className="font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Cleared to Sit
                                </span>
                              </div>
                            </div>

                            {exam.instructions && (
                              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold">Instructions:</span> {exam.instructions}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Countdown and Action */}
                          <div className="w-full lg:w-72 bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200/80 text-center space-y-3 shrink-0">
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                                Effective Window Closes In
                              </span>
                              <div className="text-xl font-black font-mono text-emerald-900 mt-1">
                                {formatCountdown(exam.effectiveDeadline || exam.scheduledCloseAt)}
                              </div>
                              <span className="text-[10px] text-emerald-700 block mt-0.5">
                                Strict Server Deadline Enforcement
                              </span>
                            </div>

                            <Button
                              onClick={() => {
                                toast.success(
                                  `Initiating Examination Session: "${exam.examinationTitle}". Entering test runner (Milestone 9).`
                                );
                              }}
                              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm gap-2 text-sm"
                            >
                              <PlayCircle className="w-5 h-5" />
                              <span>Start Examination</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upcoming Examinations */}
        {activeTab === "upcoming" && (
          <div className="space-y-4">
            {upcomingExams.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Upcoming Examinations</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  You have no pending examinations scheduled on your calendar at this time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingExams.map((exam) => {
                  const start = new Date(exam.scheduledStartAt);
                  const close = new Date(exam.scheduledCloseAt);

                  return (
                    <Card
                      key={exam.scheduleId}
                      className="border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs hover:shadow-xs bg-white"
                    >
                      <CardHeader className="p-5 pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {exam.courseCode}
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]"
                          >
                            {exam.eligibilityStatus}
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold text-slate-900 mt-2">
                          {exam.examinationTitle}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          {exam.courseName} • Section {exam.section || "A"}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-5 pt-0 space-y-3">
                        <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Date:</span>
                            <span className="font-semibold text-slate-800">
                              {start.toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Window:</span>
                            <span className="font-semibold text-slate-800">
                              {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                              {close.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Duration:</span>
                            <span className="font-semibold text-slate-800">
                              {exam.durationMinutes} Minutes
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Room:</span>
                            <span className="font-semibold text-slate-800">
                              {exam.roomName || "Online Platform"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs">
                            <span className="text-slate-400">Starts in: </span>
                            <span className="font-bold text-emerald-700">
                              {formatCountdown(exam.scheduledStartAt)}
                            </span>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-slate-600 hover:text-emerald-700 gap-1"
                            onClick={() => setSelectedExamDetails(exam)}
                          >
                            <span>Guidelines</span>
                            <Info className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Past & Concluded Examinations */}
        {activeTab === "past" && (
          <div className="space-y-4">
            {pastExams.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 text-xs">
                No past examination records found.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Examination</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {pastExams.map((exam) => (
                      <tr key={exam.scheduleId} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {exam.examinationTitle}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {exam.courseCode} — {exam.courseName}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {new Date(exam.scheduledStartAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className={
                              exam.status === "COMPLETED"
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : exam.status === "CANCELLED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-slate-100 text-slate-600"
                            }
                          >
                            {exam.status === "SCHEDULED" ? "Window Concluded" : exam.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-400">
                          Archived
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Notifications Modal */}
        {showNotificationModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-slate-900">Examination Notifications</span>
                </div>
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 max-h-96 overflow-y-auto space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">
                    No examination notifications received yet.
                  </p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{notif.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotificationModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Exam Guidelines Modal */}
        {selectedExamDetails && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-slate-900">Official Instructions</span>
                </div>
                <button
                  onClick={() => setSelectedExamDetails(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 text-sm">
                  {selectedExamDetails.examinationTitle}
                </h4>
                <p className="text-slate-500">
                  Course: {selectedExamDetails.courseCode} — {selectedExamDetails.courseName}
                </p>

                <div className="p-3 bg-blue-50 text-blue-900 rounded-xl space-y-1">
                  <span className="font-bold uppercase tracking-wider block">Candidate Guidelines:</span>
                  <p>{selectedExamDetails.instructions || "Standard academic conduct rules apply."}</p>
                </div>

                <div className="space-y-1 text-slate-600 leading-relaxed">
                  <p>• Duration: {selectedExamDetails.durationMinutes} minutes</p>
                  <p>• Total Marks: {selectedExamDetails.totalMarks} points</p>
                  <p>• Venue: {selectedExamDetails.roomName || "Online Examination Hall"}</p>
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedExamDetails(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function StudentExaminationsPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell allowedRoles={["ROLE_STUDENT", "ROLE_ADMIN"]}>
          <div className="py-20 flex justify-center items-center">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        </DashboardShell>
      }
    >
      <StudentExaminationsContent />
    </Suspense>
  );
}
