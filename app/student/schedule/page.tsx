"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scheduleApi } from "@/lib/api/schedule";
import { StudentSchedule, ScheduleStatus } from "@/types/schedule";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// Pastel styling options matching the UI mockup
const CARD_COLOR_STYLES = [
  {
    bg: "bg-purple-50 hover:bg-purple-100/80 border-purple-200 text-purple-900",
    badge: "bg-purple-200/80 text-purple-800",
    subtext: "text-purple-700/80",
    timeBadge: "bg-purple-100 text-purple-800",
  },
  {
    bg: "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900",
    badge: "bg-emerald-200/80 text-emerald-800",
    subtext: "text-emerald-700/80",
    timeBadge: "bg-emerald-100 text-emerald-800",
  },
  {
    bg: "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900",
    badge: "bg-amber-200/80 text-amber-800",
    subtext: "text-amber-700/80",
    timeBadge: "bg-amber-100 text-amber-800",
  },
  {
    bg: "bg-blue-50 hover:bg-blue-100/80 border-blue-200 text-blue-900",
    badge: "bg-blue-200/80 text-blue-800",
    subtext: "text-blue-700/80",
    timeBadge: "bg-blue-100 text-blue-800",
  },
];

const TIME_SLOTS = [
  "09:00 am",
  "10:00 am",
  "11:00 am",
  "12:00 pm",
  "01:00 pm",
  "02:00 pm",
  "03:00 pm",
  "04:00 pm",
  "05:00 pm",
  "06:00 pm",
];

function StudentScheduleContent() {
  const [schedules, setSchedules] = useState<StudentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExamForModal, setSelectedExamForModal] = useState<StudentSchedule | null>(null);

  // Calendar week navigation (starts with safe deterministic fallback)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    () => new Date("2026-03-09T00:00:00Z")
  );
  const [miniCalendarMonth, setMiniCalendarMonth] = useState<Date>(
    () => new Date("2026-03-01T00:00:00Z")
  );

  useEffect(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
    setMiniCalendarMonth(new Date());
  }, []);

  const loadStudentSchedules = async () => {
    try {
      setLoading(true);
      const res = await scheduleApi.getStudentSchedules();
      if (res.success && res.data) {
        setSchedules(res.data);
      }
    } catch {
      toast.error("Failed to load your examination schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentSchedules();
  }, []);

  // Compute 7 days of the active week
  const weekDays = useMemo(() => {
    const days = [];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push({
        date: d,
        dayNumber: d.getDate(),
        dayName: dayNames[d.getDay()],
        isToday: new Date().toDateString() === d.toDateString(),
        dateString: d.toISOString().split("T")[0],
      });
    }
    return days;
  }, [currentWeekStart]);

  // Navigate week
  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.examinationTitle.toLowerCase().includes(q) ||
        s.courseCode.toLowerCase().includes(q) ||
        s.courseName.toLowerCase().includes(q)
      );
    });
  }, [schedules, searchQuery]);

  // Group schedules by date for easy lookup
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, StudentSchedule[]>();
    filteredSchedules.forEach((item) => {
      const dateKey = new Date(item.scheduledStartAt).toISOString().split("T")[0];
      const existing = map.get(dateKey) || [];
      existing.push(item);
      map.set(dateKey, existing);
    });
    return map;
  }, [filteredSchedules]);

  // Mini calendar dates generator
  const miniCalendarDays = useMemo(() => {
    const year = miniCalendarMonth.getFullYear();
    const month = miniCalendarMonth.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, fullDate: null });
    }
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split("T")[0];
      const hasExam = schedules.some((s) => s.scheduledStartAt.startsWith(dateStr));
      const isToday = new Date().toDateString() === d.toDateString();
      days.push({ day: i, isCurrentMonth: true, hasExam, isToday, fullDate: d });
    }
    return days;
  }, [miniCalendarMonth, schedules]);

  const weekRangeLabel = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    const startMonth = currentWeekStart.toLocaleDateString(undefined, { month: "long" });
    const endMonth = end.toLocaleDateString(undefined, { month: "long" });
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${currentWeekStart.getDate()} - ${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${currentWeekStart.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
  }, [currentWeekStart]);

  return (
    <DashboardShell allowedRoles={["ROLE_STUDENT", "ROLE_ADMIN"]}>
      <div className="space-y-6">
        {/* Main Grid: Weekly Calendar on Left (Col 8) + Sidebar on Right (Col 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Weekly Timetable Grid */}
          <div className="lg:col-span-8 space-y-5">
            {/* Header / Week Navigator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Exam Schedule
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your personalized timetable of scheduled semester examinations and assessments
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-800">{weekRangeLabel}</span>
                  <div className="flex items-center ml-2 border-l border-slate-200 pl-2 gap-1">
                    <button
                      onClick={handlePrevWeek}
                      className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                      title="Previous week"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextWeek}
                      className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                      title="Next week"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Link href="/student/examinations">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <span>Available Exams</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Weekly Timetable Calendar Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/70 text-center">
                <div className="py-3 px-2 border-r border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-center">
                  Time
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.dateString}
                    className={`py-3 px-2 border-r border-slate-100 last:border-r-0 ${
                      day.isToday ? "bg-emerald-50/70" : ""
                    }`}
                  >
                    <p
                      className={`text-lg font-bold ${
                        day.isToday ? "text-emerald-700" : "text-slate-800"
                      }`}
                    >
                      {day.dayNumber}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        day.isToday ? "text-emerald-600 font-bold" : "text-slate-400"
                      }`}
                    >
                      {day.dayName}
                    </p>
                  </div>
                ))}
              </div>

              {/* Time Rows */}
              <div className="divide-y divide-slate-100 relative">
                {TIME_SLOTS.map((timeLabel, timeIdx) => {
                  const hour = 9 + timeIdx; // 9 to 18

                  return (
                    <div key={timeLabel} className="grid grid-cols-8 min-h-[72px]">
                      {/* Time Column */}
                      <div className="p-2 border-r border-slate-200 text-right pr-3 text-[11px] font-semibold text-slate-400 bg-slate-50/30 flex items-start justify-end">
                        {timeLabel}
                      </div>

                      {/* Day Cells */}
                      {weekDays.map((day, dayIdx) => {
                        const daySchedules = schedulesByDate.get(day.dateString) || [];
                        // Filter exams that match this time slot
                        const matchingSchedules = daySchedules.filter((s) => {
                          const schedHour = new Date(s.scheduledStartAt).getHours();
                          return schedHour === hour;
                        });

                        return (
                          <div
                            key={`${day.dateString}-${timeLabel}`}
                            className={`p-1 border-r border-slate-100 last:border-r-0 relative group hover:bg-slate-50/40 transition-colors ${
                              day.isToday ? "bg-emerald-50/20" : ""
                            }`}
                          >
                            {matchingSchedules.map((exam, sIdx) => {
                              const style =
                                CARD_COLOR_STYLES[(exam.examinationId + sIdx) % CARD_COLOR_STYLES.length];
                              const start = new Date(exam.scheduledStartAt);
                              const close = new Date(exam.scheduledCloseAt);

                              return (
                                <div
                                  key={exam.scheduleId}
                                  onClick={() => setSelectedExamForModal(exam)}
                                  className={`rounded-xl p-2.5 border shadow-2xs cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xs ${style.bg}`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.badge}`}
                                    >
                                      {exam.courseCode} / {exam.section || "A"}
                                    </span>
                                    {exam.isAvailableNow && (
                                      <span className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-xs font-bold leading-tight line-clamp-2">
                                    {exam.examinationTitle}
                                  </h4>

                                  <p className={`text-[10px] mt-1 font-medium ${style.subtext}`}>
                                    {exam.totalMarks} Marks • {exam.durationMinutes}m
                                  </p>

                                  <div
                                    className={`mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block ${style.timeBadge}`}
                                  >
                                    {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                                    {close.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
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

            {/* Exam Syllabus / Guidelines Widgets */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Exam Preparation & Guidelines
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Attempt Timing Policy</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Exams must be initiated within the scheduled window. Your personal duration timer
                        will never exceed the server’s hard scheduled closing time.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Academic Integrity Notice</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Randomized question sets, randomized option arrangements, and automated activity
                        monitoring are active during all official examination sessions.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Right Column: Search, Mini Calendar, and Upcoming Termtests */}
          <div className="lg:col-span-4 space-y-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search course or exam..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-white border-slate-200 rounded-xl text-sm"
              />
            </div>

            {/* Mini Calendar Widget */}
            <Card className="border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    {miniCalendarMonth.toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const m = new Date(miniCalendarMonth);
                        m.setMonth(m.getMonth() - 1);
                        setMiniCalendarMonth(m);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const m = new Date(miniCalendarMonth);
                        m.setMonth(m.getMonth() + 1);
                        setMiniCalendarMonth(m);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 mb-2">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>

                {/* Date Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {miniCalendarDays.map((d, idx) => (
                    <div
                      key={idx}
                      className={`h-8 flex flex-col items-center justify-center rounded-lg relative font-medium transition-colors ${
                        !d.isCurrentMonth
                          ? "text-slate-300"
                          : d.isToday
                          ? "bg-emerald-600 text-white font-bold"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{d.day}</span>
                      {d.hasExam && (
                        <span
                          className={`w-1 h-1 rounded-full absolute bottom-1 ${
                            d.isToday ? "bg-white" : "bg-emerald-500"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Termtest Schedule List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Termtest schedule
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {filteredSchedules.length} Scheduled
                </span>
              </div>

              {filteredSchedules.length === 0 ? (
                <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                  No upcoming examinations scheduled for your enrollments.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSchedules.slice(0, 5).map((exam, idx) => {
                    const start = new Date(exam.scheduledStartAt);
                    const timeOnly = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                    return (
                      <div
                        key={exam.scheduleId}
                        onClick={() => setSelectedExamForModal(exam)}
                        className="p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-200 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:border-emerald-100 group-hover:bg-emerald-50/50 text-slate-700 group-hover:text-emerald-700 text-center">
                            <span className="text-xs font-bold block">{timeOnly}</span>
                            <span className="text-[10px] text-slate-400 block uppercase">
                              {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-emerald-600 uppercase">
                              {exam.courseCode} • {exam.semesterName || "Semester"}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                              {exam.examinationTitle}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {exam.roomName || "Online Hall"} • {exam.durationMinutes} mins
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Examination Details Modal */}
        {selectedExamForModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-slate-900">Examination Specification</span>
                </div>
                <button
                  onClick={() => setSelectedExamForModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {selectedExamForModal.courseCode} — {selectedExamForModal.courseName}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-2">
                    {selectedExamForModal.examinationTitle}
                  </h3>
                  {selectedExamForModal.examinationDescription && (
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedExamForModal.examinationDescription}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Schedule Window</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {new Date(selectedExamForModal.scheduledStartAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-slate-500">
                      {new Date(selectedExamForModal.scheduledStartAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(selectedExamForModal.scheduledCloseAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Duration & Marks</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {selectedExamForModal.durationMinutes} Minutes
                    </p>
                    <p className="text-slate-500">
                      Total: {selectedExamForModal.totalMarks} pts | Pass: {selectedExamForModal.passingMarks} pts
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Exam Venue</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {selectedExamForModal.roomName || "Online Examination Hall"}
                    </p>
                    <p className="text-slate-500">
                      {selectedExamForModal.building || "Web-based proctored session"}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Eligibility Status</span>
                    <p className="font-bold text-emerald-700 mt-0.5">
                      {selectedExamForModal.eligibilityStatus}
                    </p>
                    <p className="text-slate-500">
                      {selectedExamForModal.eligibilityReason || "Enrolled in course offering"}
                    </p>
                  </div>
                </div>

                {selectedExamForModal.instructions && (
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
                    <span className="font-bold uppercase tracking-wider block">Candidate Instructions:</span>
                    <p>{selectedExamForModal.instructions}</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedExamForModal(null)}
                  >
                    Close
                  </Button>
                  <Link href="/student/examinations">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                      Go to Available Exams
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function StudentSchedulePage() {
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
      <StudentScheduleContent />
    </Suspense>
  );
}
