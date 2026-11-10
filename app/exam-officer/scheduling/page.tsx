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
  Eye,
  CalendarClock,
  Layers,
  ArrowRight,
  X,
  Building,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  InteractiveExamCalendar,
  CalendarFilterState,
  toLocalDateKey,
  matchesCalendarFilter,
  formatCalendarFilterLabel,
} from "@/components/schedule/InteractiveExamCalendar";

function ExamOfficerSchedulingContent() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [approvedExams, setApprovedExams] = useState<Examination[]>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Filters for list view
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedOffering, setSelectedOffering] = useState<string>("");

  // Create Schedule Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [collegeTimezone, setCollegeTimezone] = useState("Africa/Addis_Ababa");
  const [passcode1, setPasscode1] = useState("1234");
  const [passcode2, setPasscode2] = useState("5678");
  const [passcode3, setPasscode3] = useState("9012");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [instructions, setInstructions] = useState("Please arrive 15 minutes before exam start with college ID.");
  const [conflictReport, setConflictReport] = useState<ScheduleConflict | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);

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
  }, [selectedStatus, selectedOffering]);


  // Run dry-run conflict check
  const handleCheckConflicts = async () => {
    if (!scheduleDate || !startTime) {
      toast.error("Please select an examination date and start time first");
      return;
    }
    try {
      setCheckingConflict(true);
      const startIso = new Date(`${scheduleDate}T${startTime}:00`).toISOString();
      const closeIso = new Date(`${scheduleDate}T23:59:59`).toISOString();

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
    if (!scheduleDate || !startTime) {
      toast.error("Please select an examination date and scheduled start time");
      return;
    }

    if (!/^\d{4}$/.test(passcode1)) {
      toast.error("Passcode 1 must be exactly 4 numeric digits");
      return;
    }
    if (!/^\d{4}$/.test(passcode2)) {
      toast.error("Passcode 2 must be exactly 4 numeric digits");
      return;
    }
    if (!/^\d{4}$/.test(passcode3)) {
      toast.error("Passcode 3 must be exactly 4 numeric digits");
      return;
    }
    if (passcode1 === passcode2 || passcode1 === passcode3 || passcode2 === passcode3) {
      toast.error("All three passcodes must be distinct");
      return;
    }

    const payload: CreateScheduleRequest = {
      examinationId: Number(selectedExamId),
      examinationDate: scheduleDate,
      scheduledStartTime: startTime.length === 5 ? startTime + ":00" : startTime,
      timezone: collegeTimezone,
      passcode1: passcode1.trim(),
      passcode2: passcode2.trim(),
      passcode3: passcode3.trim(),
      roomId: selectedRoomId ? Number(selectedRoomId) : undefined,
      instructions: instructions.trim() || undefined,
      autoGenerateEligibility: true,
    };

    try {
      setIsSubmitting(true);
      const res = await scheduleApi.createSchedule(payload);
      if (res.success) {
        toast.success("Examination scheduled successfully! 3-passcode security sequence activated.");
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

  // Non-date filtered schedules (search applied)
  const nonDateFilteredSchedules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schedules;
    return schedules.filter(
      (s) =>
        (s.examinationTitle && s.examinationTitle.toLowerCase().includes(q)) ||
        (s.courseCode && s.courseCode.toLowerCase().includes(q)) ||
        (s.courseName && s.courseName.toLowerCase().includes(q))
    );
  }, [schedules, search]);

  // All local YYYY-MM-DD keys that contain at least one scheduled exam
  const examDateKeys = useMemo(() => {
    const set = new Set<string>();
    nonDateFilteredSchedules.forEach((s) => {
      const key = toLocalDateKey(s.scheduledStartAt);
      if (key) set.add(key);
    });
    return set;
  }, [nonDateFilteredSchedules]);

  // Final displayed schedules filtered by selected day or date range in the calendar
  const displayedSchedules = useMemo(() => {
    return nonDateFilteredSchedules
      .filter((s) => matchesCalendarFilter(s.scheduledStartAt, dateFilter))
      .sort((a, b) => new Date(a.scheduledStartAt).getTime() - new Date(b.scheduledStartAt).getTime());
  }, [nonDateFilteredSchedules, dateFilter]);

  const activeDateLabel = useMemo(() => formatCalendarFilterLabel(dateFilter), [dateFilter]);

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
              Coordinate examination schedules, reserve physical rooms, detect student conflicts, and manage student eligibility.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                const defaultDate =
                  dateFilter.mode === "single" && dateFilter.startDateKey
                    ? dateFilter.startDateKey
                    : todayKey;
                setScheduleDate(defaultDate);
                setShowCreateModal(true);
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white gap-2 text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              Schedule Exam
            </Button>
          </div>
        </div>

        {/* 2-Column Layout: Left = Scheduled Exams List, Right = Search + Month Calendar */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          {/* LEFT COLUMN (Main): Scheduled Exams List (replaced hourly timeline table) */}
          <div className="xl:col-span-3 space-y-4">
            {/* Filter Status & Dropdown Bar */}
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
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
                        onClick={() =>
                          setDateFilter((prev) => ({ ...prev, mode: "all" }))
                        }
                        className="h-7 text-xs text-slate-600"
                      >
                        Show All ({nonDateFilteredSchedules.length})
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Scheduled Exams List Table / Empty State */}
            {loading ? (
              <Card className="border border-slate-200 shadow-xs bg-white">
                <CardContent className="p-12 text-center text-xs text-slate-500">
                  Loading scheduled examinations...
                </CardContent>
              </Card>
            ) : displayedSchedules.length === 0 ? (
              <Card className="border border-dashed border-slate-300 shadow-2xs bg-white">
                <CardContent className="p-12 text-center space-y-3">
                  <CalendarClock className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">
                    No Examinations Scheduled for {activeDateLabel}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Select a dotted day in the calendar, switch to Range mode (e.g., Day 5 – Day 10), or view all scheduled examinations.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {dateFilter.mode !== "all" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateFilter((prev) => ({ ...prev, mode: "all" }))}
                        className="text-xs"
                      >
                        Show All Scheduled Exams ({nonDateFilteredSchedules.length})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        const defaultDate =
                          dateFilter.mode === "single" && dateFilter.startDateKey
                            ? dateFilter.startDateKey
                            : todayKey;
                        setScheduleDate(defaultDate);
                        setShowCreateModal(true);
                      }}
                      className="bg-sky-600 hover:bg-sky-700 text-white text-xs gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Schedule Exam
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
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
                        {displayedSchedules.map((s) => (
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
            )}
          </div>

          {/* RIGHT COLUMN (Sidebar): Search Input + Month Calendar (kept in same place!) */}
          <div className="xl:col-span-1 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search course or exam..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-2xl border-slate-200 bg-white shadow-2xs text-xs"
              />
            </div>

            {/* Interactive Calendar Widget */}
            <InteractiveExamCalendar
              examDateKeys={examDateKeys}
              filter={dateFilter}
              onFilterChange={setDateFilter}
              todayKey={todayKey}
            />
          </div>
        </div>

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

                {/* Date, Start Time & College Timezone Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Examination Date <span className="text-rose-500">*</span>
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
                      Scheduled Start Time <span className="text-rose-500">*</span>
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
                      College Timezone <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={collegeTimezone}
                      onChange={(e) => setCollegeTimezone(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="Africa/Addis_Ababa">Africa/Addis_Ababa (EAT, UTC+3)</option>
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                    </select>
                  </div>
                </div>

                {/* Duration & Access Window Notice */}
                <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sky-900 text-xs flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-sky-600" />
                      Individual Exam Duration:
                    </span>
                    <Badge variant="outline" className="bg-white text-sky-700 font-mono font-bold text-xs">
                      {approvedExams.find((e) => e.id === Number(selectedExamId))?.durationMinutes || 60} Minutes (Configured by Instructor)
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    <strong>Start Access Policy:</strong> Examination start opens at <strong>{startTime}</strong> and closes at <strong>23:59:59</strong> on the examination date. Each student receives their own full active duration after entering Passcode 1, with independent server timers.
                  </p>
                </div>

                {/* Three-Passcode Security Sequence */}
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Three-Passcode Security Sequence (4 Numeric Digits Each)
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Hashed with BCrypt</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Passcode 1 (Initial Start) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="4 digits"
                        value={passcode1}
                        onChange={(e) => setPasscode1(e.target.value.replace(/\D/g, ""))}
                        className="text-xs font-mono tracking-widest text-center"
                      />
                      <span className="text-[10px] text-slate-500">For candidate first start</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Passcode 2 (First Resume) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="4 digits"
                        value={passcode2}
                        onChange={(e) => setPasscode2(e.target.value.replace(/\D/g, ""))}
                        className="text-xs font-mono tracking-widest text-center"
                      />
                      <span className="text-[10px] text-slate-500">For 1st interruption recovery</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Passcode 3 (Later Resumes) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="4 digits"
                        value={passcode3}
                        onChange={(e) => setPasscode3(e.target.value.replace(/\D/g, ""))}
                        className="text-xs font-mono tracking-widest text-center"
                      />
                      <span className="text-[10px] text-slate-500">For 2nd+ interruption recoveries</span>
                    </div>
                  </div>
                </div>

                {/* Physical Room */}
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
