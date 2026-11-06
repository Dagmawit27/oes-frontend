"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scheduleApi } from "@/lib/api/schedule";
import { examApi } from "@/lib/api/exam";
import { academicApi } from "@/lib/api/academic";
import {
  ExamSchedule,
  ScheduleStatus,
  ExamRoom,
  CreateScheduleRequest,
  ScheduleConflict,
} from "@/types/schedule";
import { Examination } from "@/types/exam";
import { CourseOffering } from "@/types/academic";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  CalendarClock,
  Layers,
  ArrowRight,
  X,
  Building,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

function ExamOfficerSchedulingContent() {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [approvedExams, setApprovedExams] = useState<Examination[]>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar week navigation (starts from current week)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    () => new Date("2026-03-09T00:00:00Z")
  );

  useEffect(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  }, []);

  // Filters for list view
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedOffering, setSelectedOffering] = useState<string>("");

  // Create Schedule Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("12:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [instructions, setInstructions] = useState("Please arrive 15 minutes before exam start with college ID.");
  const [conflictReport, setConflictReport] = useState<ScheduleConflict | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);

      // Calendar window
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const [schedRes, examRes, roomRes, offRes] = await Promise.all([
        scheduleApi.getSchedules({
          courseOfferingId: selectedOffering ? Number(selectedOffering) : undefined,
          status: selectedStatus !== "ALL" ? (selectedStatus as ScheduleStatus) : undefined,
          size: 100,
        }),
        examApi.getExaminations({ status: "APPROVED", size: 50 }),
        scheduleApi.getRooms(),
        academicApi.getCourseOfferings(),
      ]);

      if (schedRes.success && schedRes.data) {
        setSchedules(schedRes.data.content);
      }
      if (examRes.success && examRes.data) {
        setApprovedExams(examRes.data.content);
        if (examRes.data.content.length > 0 && !selectedExamId) {
          setSelectedExamId(String(examRes.data.content[0].id));
          setDurationMinutes(examRes.data.content[0].durationMinutes || 60);
        }
      }
      if (roomRes.success && roomRes.data) {
        setRooms(roomRes.data);
      }
      if (offRes.success && offRes.data) {
        setOfferings(offRes.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load scheduling data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStatus, selectedOffering, currentWeekStart]);

  // When selected exam changes in create modal, auto-populate duration
  useEffect(() => {
    if (!selectedExamId) return;
    const exam = approvedExams.find((e) => String(e.id) === selectedExamId);
    if (exam && exam.durationMinutes) {
      setDurationMinutes(exam.durationMinutes);
    }
  }, [selectedExamId, approvedExams]);

  // Week days calculation for weekly calendar grid
  const weekDays = useMemo(() => {
    const days: { date: Date; name: string; dayNum: number; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
      const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      days.push({
        date: d,
        name: names[d.getDay()],
        dayNum: d.getDate(),
        isToday,
      });
    }
    return days;
  }, [currentWeekStart]);

  // Format week range text (e.g. "March 13 - 19, 2026")
  const weekRangeText = useMemo(() => {
    const startMonth = currentWeekStart.toLocaleDateString("en-US", { month: "short" });
    const endDay = new Date(currentWeekStart);
    endDay.setDate(endDay.getDate() + 6);
    const endMonth = endDay.toLocaleDateString("en-US", { month: "short" });
    const year = currentWeekStart.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${currentWeekStart.getDate()} - ${endDay.getDate()}, ${year}`;
    }
    return `${startMonth} ${currentWeekStart.getDate()} - ${endMonth} ${endDay.getDate()}, ${year}`;
  }, [currentWeekStart]);

  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleTodayWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  // Run dry-run conflict check
  const handleCheckConflicts = async () => {
    if (!scheduleDate || !startTime || !closeTime) {
      toast.error("Please select a date, start time, and close time first");
      return;
    }
    try {
      setCheckingConflict(true);
      const startIso = new Date(`${scheduleDate}T${startTime}:00`).toISOString();
      const closeIso = new Date(`${scheduleDate}T${closeTime}:00`).toISOString();

      const res = await scheduleApi.checkConflicts({
        examinationId: selectedExamId ? Number(selectedExamId) : undefined,
        start: startIso,
        close: closeIso,
        roomId: selectedRoomId ? Number(selectedRoomId) : undefined,
      });

      if (res.success && res.data) {
        setConflictReport(res.data);
        if (res.data.hasConflict) {
          toast.warning("Potential scheduling conflicts detected. Review details below.");
        } else {
          toast.success("No conflicts detected! Time window and room are available.");
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to analyze conflicts");
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedExamId) {
      toast.error("Please select an approved examination");
      return;
    }
    if (!scheduleDate || !startTime || !closeTime) {
      toast.error("Please select a date, start time, and close time");
      return;
    }

    const startIso = new Date(`${scheduleDate}T${startTime}:00`).toISOString();
    const closeIso = new Date(`${scheduleDate}T${closeTime}:00`).toISOString();

    if (new Date(closeIso) <= new Date(startIso)) {
      toast.error("Scheduled close time must be after start time");
      return;
    }

    const payload: CreateScheduleRequest = {
      examinationId: Number(selectedExamId),
      scheduledStartAt: startIso,
      scheduledCloseAt: closeIso,
      durationMinutes: Number(durationMinutes),
      roomId: selectedRoomId ? Number(selectedRoomId) : undefined,
      instructions: instructions.trim() || undefined,
      autoGenerateEligibility: true,
    };

    try {
      setIsSubmitting(true);
      const res = await scheduleApi.createSchedule(payload);
      if (res.success) {
        toast.success("Examination scheduled successfully! Student eligibility generated.");
        setShowCreateModal(false);
        setConflictReport(null);
        loadData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to schedule examination");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: ScheduleStatus) => {
    switch (status) {
      case "SCHEDULED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Scheduled</Badge>;
      case "RESCHEDULED":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Rescheduled</Badge>;
      case "ONGOING":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse">Ongoing</Badge>;
      case "CANCELLED":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Cancelled</Badge>;
      case "COMPLETED":
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Pastel colors palette for calendar exam cards
  const cardColorStyles = [
    { bg: "bg-sky-50/80 border-sky-200 text-sky-900", badge: "bg-sky-100 text-sky-800" },
    { bg: "bg-emerald-50/80 border-emerald-200 text-emerald-900", badge: "bg-emerald-100 text-emerald-800" },
    { bg: "bg-amber-50/80 border-amber-200 text-amber-900", badge: "bg-amber-100 text-amber-800" },
    { bg: "bg-purple-50/80 border-purple-200 text-purple-900", badge: "bg-purple-100 text-purple-800" },
    { bg: "bg-rose-50/80 border-rose-200 text-rose-900", badge: "bg-rose-100 text-rose-800" },
  ];

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <CalendarClock className="h-7 w-7 text-sky-600" />
              Examination Scheduling & Timetable
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Coordinate examination timetables, reserve physical rooms, detect student conflicts, and manage student eligibility.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-lg flex items-center text-xs font-semibold">
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  viewMode === "calendar"
                    ? "bg-white text-sky-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Calendar View
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  viewMode === "list"
                    ? "bg-white text-sky-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                List View
              </button>
            </div>

            <Button
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                setScheduleDate(today);
                setShowCreateModal(true);
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white gap-2 text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              Schedule Exam
            </Button>
          </div>
        </div>

        {/* CALENDAR VIEW (Inspired by user's design) */}
        {viewMode === "calendar" && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Main Weekly Timetable Grid */}
            <div className="xl:col-span-3 space-y-4">
              {/* Calendar Navigator Bar */}
              <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">{weekRangeText}</h2>
                  <div className="flex items-center gap-1 ml-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevWeek}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextWeek}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTodayWeek}
                    className="text-xs h-7 text-slate-600"
                  >
                    Today
                  </Button>
                  <span className="text-xs text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                    Week View
                  </span>
                </div>
              </div>

              {/* Weekly Time Grid */}
              <Card className="border border-slate-200 shadow-xs bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[750px]">
                    {/* Days Header */}
                    <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/70 text-center text-xs">
                      <div className="p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-r border-slate-200">
                        Time
                      </div>
                      {weekDays.map((d, i) => (
                        <div
                          key={i}
                          className={`p-2.5 border-r border-slate-200 last:border-r-0 ${
                            d.isToday ? "bg-sky-50/60 font-bold text-sky-700" : "text-slate-700"
                          }`}
                        >
                          <div className="text-[11px] font-medium text-slate-500 uppercase">{d.name}</div>
                          <div
                            className={`text-sm font-bold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${
                              d.isToday ? "bg-sky-600 text-white shadow-xs" : ""
                            }`}
                          >
                            {d.dayNum}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Time Slots Rows (09:00 to 18:00) */}
                    <div className="divide-y divide-slate-100 text-xs">
                      {[
                        "09:00 am",
                        "10:00 am",
                        "11:00 am",
                        "12:00 pm",
                        "01:00 pm",
                        "02:00 pm",
                        "03:00 pm",
                        "04:00 pm",
                        "05:00 pm",
                      ].map((slotTime, slotIdx) => {
                        const slotHour = 9 + slotIdx; // 9 to 17

                        return (
                          <div key={slotTime} className="grid grid-cols-8 min-h-[72px]">
                            {/* Time Column */}
                            <div className="p-2.5 text-[11px] font-medium text-slate-400 border-r border-slate-200 bg-slate-50/30 flex items-center justify-center">
                              {slotTime}
                            </div>

                            {/* 7 Days Columns */}
                            {weekDays.map((dayItem, dayIdx) => {
                              // Find schedules matching this day and starting near this hour
                              const matchedSchedules = schedules.filter((s) => {
                                const sDate = new Date(s.scheduledStartAt);
                                const isSameDay =
                                  sDate.getDate() === dayItem.date.getDate() &&
                                  sDate.getMonth() === dayItem.date.getMonth() &&
                                  sDate.getFullYear() === dayItem.date.getFullYear();
                                const sHour = sDate.getHours();
                                return isSameDay && sHour === slotHour;
                              });

                              return (
                                <div
                                  key={dayIdx}
                                  className={`p-1.5 border-r border-slate-100 last:border-r-0 relative group transition-colors ${
                                    dayItem.isToday ? "bg-sky-50/15" : "hover:bg-slate-50/50"
                                  }`}
                                >
                                  {matchedSchedules.map((s, idx) => {
                                    const style = cardColorStyles[(s.id + idx) % cardColorStyles.length];
                                    const startTimeStr = new Date(s.scheduledStartAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    });
                                    const closeTimeStr = new Date(s.scheduledCloseAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    });

                                    return (
                                      <Link
                                        key={s.id}
                                        href={`/exam-officer/scheduling/${s.id}`}
                                        className={`block p-2 rounded-lg border shadow-2xs transition-transform hover:-translate-y-0.5 ${style.bg} mb-1`}
                                      >
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                          <span className="font-bold text-[10px] tracking-tight truncate">
                                            {s.courseCode || "EXAM"}
                                          </span>
                                          <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${style.badge}`}>
                                            {s.durationMinutes}m
                                          </span>
                                        </div>
                                        <div className="font-semibold text-[11px] leading-tight line-clamp-1">
                                          {s.examinationTitle}
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] opacity-75 mt-1">
                                          <span>{startTimeStr} - {closeTimeStr}</span>
                                          {s.roomName && (
                                            <span className="truncate max-w-[60px] font-medium">{s.roomName}</span>
                                          )}
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Side Column (Mini Month Calendar & Termtest Upcoming list) */}
            <div className="space-y-4">
              {/* Mini Month Widget */}
              <Card className="border border-slate-200 shadow-xs bg-white">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-800">
                    {currentWeekStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-2">
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                    <span>Su</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((dNum) => {
                      const hasExam = schedules.some((s) => {
                        const d = new Date(s.scheduledStartAt);
                        return d.getDate() === dNum;
                      });
                      const isSelected = weekDays.some((wd) => wd.dayNum === dNum);

                      return (
                        <div
                          key={dNum}
                          className={`h-7 w-7 mx-auto rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                            isSelected
                              ? "bg-sky-600 text-white font-bold"
                              : hasExam
                              ? "bg-emerald-100 text-emerald-800 font-bold"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {dNum}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Examination Schedule List */}
              <Card className="border border-slate-200 shadow-xs bg-white">
                <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-sky-600" />
                    Upcoming Termtests ({schedules.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2.5">
                  {schedules.slice(0, 5).map((s) => (
                    <Link
                      key={s.id}
                      href={`/exam-officer/scheduling/${s.id}`}
                      className="block p-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                        <span className="font-semibold text-slate-700">
                          {new Date(s.scheduledStartAt).toLocaleDateString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>{s.durationMinutes} mins</span>
                      </div>
                      <div className="font-bold text-slate-900 line-clamp-1">{s.examinationTitle}</div>
                      <div className="flex items-center justify-between text-slate-500 mt-1">
                        <span>{s.courseCode} &bull; Sec {s.section || "A"}</span>
                        <span className="text-[11px] font-semibold text-sky-600">
                          {new Date(s.scheduledStartAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {schedules.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-4">No upcoming examinations.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search examinations or course..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 bg-slate-50 border-slate-200 text-xs"
                    />
                  </div>

                  <div>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="ALL">All Schedule Statuses</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="RESCHEDULED">Rescheduled</option>
                      <option value="ONGOING">Ongoing</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={selectedOffering}
                      onChange={(e) => setSelectedOffering(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">All Course Offerings</option>
                      {offerings.map((co) => (
                        <option key={co.id} value={co.id}>
                          {co.courseCode} - {co.courseName} (Sec {co.section})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedules Table */}
            <Card className="border border-slate-200 shadow-xs bg-white overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Examination</th>
                        <th className="py-3 px-4">Course & Section</th>
                        <th className="py-3 px-4">Scheduled Window</th>
                        <th className="py-3 px-4">Duration & Room</th>
                        <th className="py-3 px-4">Eligible Students</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {schedules.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 max-w-xs">
                            <Link
                              href={`/exam-officer/scheduling/${s.id}`}
                              className="font-semibold text-sky-700 hover:text-sky-900 line-clamp-1"
                            >
                              {s.examinationTitle}
                            </Link>
                            <span className="text-[11px] text-slate-500 block">
                              Total: {s.totalMarks} Marks (Pass: {s.passingMarks})
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-800">
                              {s.courseCode} - {s.courseName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Sec {s.section || "A"} &bull; {s.semesterName || "Fall 2025"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">
                              {new Date(s.scheduledStartAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {new Date(s.scheduledStartAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {" - "}
                              {new Date(s.scheduledCloseAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {s.durationMinutes} mins
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {s.roomName || "Online Exam"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                              <Users className="h-3.5 w-3.5 text-sky-600" />
                              {s.eligibleStudentCount} Students
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(s.status)}</td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Link href={`/exam-officer/scheduling/${s.id}`}>
                              <Button variant="outline" size="sm" className="text-xs gap-1.5 text-slate-600">
                                <Eye className="h-3.5 w-3.5" />
                                Manage
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Schedule Modal with Conflict Analysis */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2 text-sky-600">
                  <CalendarClock className="h-5 w-5" />
                  <h3 className="text-base font-bold text-slate-900">Schedule Approved Examination</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Examination Selector */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Approved Examination <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {approvedExams.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({e.courseCode} &bull; {e.totalMarks} Marks &bull; {e.durationMinutes} mins)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Date <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Start Time <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Closing Time <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="time"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Duration & Room */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Exam Duration (Minutes) <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="5"
                      max="300"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Physical Examination Room (Optional)</label>
                    <select
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">No Room (Online Remote Exam)</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.building || "Campus"} &bull; Cap: {r.capacity})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Special Schedule Instructions</label>
                  <textarea
                    rows={2}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Conflict Check Button & Report */}
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCheckConflicts}
                      disabled={checkingConflict}
                      className="text-xs gap-1.5 text-sky-700 border-sky-200 hover:bg-sky-50"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {checkingConflict ? "Analyzing Conflicts..." : "Check Student & Room Conflicts"}
                    </Button>
                    <span className="text-[11px] text-slate-400">Automatic validation before submission</span>
                  </div>

                  {conflictReport && (
                    <div
                      className={`mt-3 p-3 rounded-lg border text-xs ${
                        conflictReport.hasConflict
                          ? "bg-rose-50 border-rose-200 text-rose-900"
                          : "bg-emerald-50 border-emerald-200 text-emerald-900"
                      }`}
                    >
                      {conflictReport.hasConflict ? (
                        <div className="space-y-1.5">
                          <div className="font-bold flex items-center gap-1.5 text-rose-700">
                            <AlertTriangle className="h-4 w-4" />
                            Conflicts Detected:
                          </div>
                          {conflictReport.roomConflictMessage && (
                            <p>&bull; {conflictReport.roomConflictMessage}</p>
                          )}
                          {conflictReport.studentConflicts && conflictReport.studentConflicts.length > 0 && (
                            <div className="pl-2">
                              <p className="font-semibold">&bull; Overlapping Student Examinations:</p>
                              {conflictReport.studentConflicts.map((sc, i) => (
                                <p key={i} className="text-[11px] text-rose-800">
                                  - {sc.studentName} ({sc.studentIdNumber}) has exam: "{sc.conflictingExamTitle}"
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 font-medium text-emerald-800">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          No student exam overlaps or room conflicts found for this schedule.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSchedule}
                  disabled={isSubmitting}
                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs gap-1.5"
                >
                  {isSubmitting ? "Scheduling..." : "Confirm & Schedule Exam"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function ExamOfficerSchedulingPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
          <div className="py-20 flex justify-center items-center">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        </DashboardShell>
      }
    >
      <ExamOfficerSchedulingContent />
    </Suspense>
  );
}
