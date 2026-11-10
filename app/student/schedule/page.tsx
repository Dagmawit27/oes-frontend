"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scheduleApi } from "@/lib/api/schedule";
import { StudentSchedule } from "@/types/schedule";
import {
  InteractiveExamCalendar,
  CalendarFilterState,
  toLocalDateKey,
  matchesCalendarFilter,
  formatCalendarFilterLabel,
} from "@/components/schedule/InteractiveExamCalendar";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  BookOpen,
  Search,
  CheckCircle2,
  FileText,
  ShieldAlert,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

function StudentScheduleContent() {
  const [schedules, setSchedules] = useState<StudentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExamForModal, setSelectedExamForModal] = useState<StudentSchedule | null>(null);

  // Calendar filter state: defaults to Current Day (today) on mount
  const [todayKey, setTodayKey] = useState<string>("2026-11-10");
  const [dateFilter, setDateFilter] = useState<CalendarFilterState>({
    mode: "single",
    startDateKey: "2026-11-10",
    endDateKey: null,
  });

  useEffect(() => {
    const nowKey = toLocalDateKey(new Date());
    setTodayKey(nowKey);
    setDateFilter({
      mode: "single",
      startDateKey: nowKey,
      endDateKey: null,
    });
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

  // Search-filtered schedules (non-date filter)
  const searchFilteredSchedules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schedules;
    return schedules.filter(
      (s) =>
        (s.examinationTitle && s.examinationTitle.toLowerCase().includes(q)) ||
        (s.courseCode && s.courseCode.toLowerCase().includes(q)) ||
        (s.courseName && s.courseName.toLowerCase().includes(q))
    );
  }, [schedules, searchQuery]);

  // Set of local YYYY-MM-DD keys containing scheduled exams (for calendar indicator dots)
  const examDateKeys = useMemo(() => {
    const set = new Set<string>();
    searchFilteredSchedules.forEach((item) => {
      const key = toLocalDateKey(item.scheduledStartAt);
      if (key) set.add(key);
    });
    return set;
  }, [searchFilteredSchedules]);

  // Final list matching the active day or date range selected in the calendar
  const displayedSchedules = useMemo(() => {
    return searchFilteredSchedules
      .filter((item) => matchesCalendarFilter(item.scheduledStartAt, dateFilter))
      .sort((a, b) => new Date(a.scheduledStartAt).getTime() - new Date(b.scheduledStartAt).getTime());
  }, [searchFilteredSchedules, dateFilter]);

  const activeDateLabel = useMemo(() => formatCalendarFilterLabel(dateFilter), [dateFilter]);

  return (
    <DashboardShell allowedRoles={["ROLE_STUDENT", "ROLE_ADMIN"]}>
      <div className="space-y-6">
        {/* Main Grid: Scheduled Exams List on Left (Col 8) + Search & Month Calendar on Right (Col 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Scheduled Exams List (replaced weekly hourly timeline table) */}
          <div className="lg:col-span-8 space-y-5">
           

            {/* Active Date Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">{activeDateLabel}</span>
                <Badge variant="outline" className="text-[11px] font-semibold bg-slate-50 text-slate-700">
                  {displayedSchedules.length} {displayedSchedules.length === 1 ? "Exam" : "Exams"}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5">
                {!(dateFilter.mode === "single" && dateFilter.startDateKey === todayKey) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDateFilter({ mode: "single", startDateKey: todayKey, endDateKey: null })
                    }
                    className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    Today
                  </Button>
                )}
                {dateFilter.mode !== "all" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter((prev) => ({ ...prev, mode: "all" }))}
                    className="h-7 text-xs text-slate-600"
                  >
                    Show All
                  </Button>
                )}
              </div>
            </div>

            {/* Scheduled Examinations List */}
            {loading ? (
              <Card className="border border-slate-200 rounded-2xl bg-white">
                <CardContent className="p-12 text-center text-xs text-slate-500">
                  Loading scheduled examinations...
                </CardContent>
              </Card>
            ) : displayedSchedules.length === 0 ? (
              <Card className="border border-dashed border-slate-300 rounded-2xl bg-white">
                <CardContent className="p-12 text-center space-y-3">
                  <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">
                    No Examinations Scheduled for {activeDateLabel}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Select any highlighted date with a green dot in the calendar, switch to Range mode (e.g., Day 5 – Day 10), or click below to see all upcoming and past scheduled exams.
                  </p>
                  {dateFilter.mode !== "all" && searchFilteredSchedules.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateFilter((prev) => ({ ...prev, mode: "all" }))}
                      className="text-xs mt-1"
                    >
                      Show All Scheduled Exams ({searchFilteredSchedules.length})
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {displayedSchedules.map((exam) => {
                  const start = new Date(exam.scheduledStartAt);
                  const close = new Date(exam.scheduledCloseAt);
                  const isSubmitted =
                    exam.attemptStatus === "SUBMITTED" ||
                    exam.attemptStatus === "AUTO_SUBMITTED" ||
                    exam.attemptStatus === "EXPIRED";
                  const isLive = Boolean(!isSubmitted && (exam.isAvailableNow || exam.isStartableNow || exam.isResumableNow));

                  return (
                    <Card
                      key={exam.scheduleId}
                      className={`border rounded-2xl transition-all hover:shadow-xs bg-white overflow-hidden ${
                        isLive ? "border-emerald-300" : "border-slate-200"
                      }`}
                    >
                      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Date & Time Box */}
                          <div
                            className={`px-3.5 py-2.5 rounded-xl border text-center shrink-0 min-w-[78px] ${
                              isLive
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider block">
                              {start.toLocaleDateString("en-US", { month: "short" })}
                            </span>
                            <span className="text-xl font-black leading-tight block">
                              {start.getDate()}
                            </span>
                            <span className="text-[10px] font-semibold block">
                              {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          {/* Course & Exam Details */}
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {exam.courseCode}
                              </span>
                              {exam.section && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Sec {exam.section}
                                </span>
                              )}
                              {isSubmitted ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Submitted
                                </Badge>
                              ) : isLive ? (
                                <Badge className="bg-emerald-600 text-white text-[10px]">
                                  Available Now
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-slate-600">
                                  {exam.status}
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-base font-bold text-slate-900 leading-snug">
                              {exam.examinationTitle}
                            </h3>
                            <p className="text-xs text-slate-500">{exam.courseName}</p>

                            <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                                {close.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({exam.durationMinutes} mins)
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {exam.roomName || "Online Examination Hall"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedExamForModal(exam)}
                            className="text-xs gap-1.5 border-slate-200 text-slate-700"
                          >
                            <span>View Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>

                          {isLive && (
                            <Link href="/student/examinations">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                              >
                                <span>Open Exam Hall</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

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

          {/* Right Column: Search & Interactive Month Calendar (kept in same place!) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search course or exam..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-white border-slate-200 rounded-2xl text-sm shadow-2xs"
              />
            </div>

            {/* Interactive Month Calendar Widget */}
            <InteractiveExamCalendar
              examDateKeys={examDateKeys}
              filter={dateFilter}
              onFilterChange={setDateFilter}
              todayKey={todayKey}
            />
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
                      {selectedExamForModal.eligibilityReason || "Enrolled in course assignment"}
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
