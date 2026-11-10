"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scheduleApi } from "@/lib/api/schedule";
import { academicApi } from "@/lib/api/academic";
import {
  ExamSchedule,
  ExamEligibility,
  EligibilityStatus,
  ScheduleStatus,
  ExamRoom,
  RescheduleRequest,
  ScheduleConflict,
  isSchedulePassedOrClosed,
  isScheduleReadOnly,
} from "@/types/schedule";
import { Student } from "@/types/academic";
import {
  CalendarClock,
  ArrowLeft,
  Clock,
  Calendar,
  MapPin,
  Building,
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  UserPlus,
  RefreshCw,
  Search,
  BookOpen,
  Info,
  Check,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  Lock,
  Award,
} from "lucide-react";
import { toast } from "sonner";

function ScheduleDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = Number(params?.id);

  const [schedule, setSchedule] = useState<ExamSchedule | null>(null);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Student filter & search
  const [searchStudent, setSearchStudent] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Modals
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAddExceptionModal, setShowAddExceptionModal] = useState(false);
  const [selectedEligibilityToEdit, setSelectedEligibilityToEdit] = useState<ExamEligibility | null>(null);

  // Reschedule Form state
  const [reschedDate, setReschedDate] = useState("");
  const [reschedStartTime, setReschedStartTime] = useState("09:00");
  const [reschedCloseTime, setReschedCloseTime] = useState("12:00");
  const [reschedDuration, setReschedDuration] = useState(60);
  const [reschedRoomId, setReschedRoomId] = useState<string>("");
  const [reschedReason, setReschedReason] = useState("");
  const [reschedConflict, setReschedConflict] = useState<ScheduleConflict | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [isSubmittingResched, setIsSubmittingResched] = useState(false);

  // Cancel Form state
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Add Exception Form state
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [exceptionReason, setExceptionReason] = useState("Authorized Special Academic Exception");
  const [exceptionStatus, setExceptionStatus] = useState<EligibilityStatus>("ELIGIBLE");
  const [isSubmittingException, setIsSubmittingException] = useState(false);

  // Edit Eligibility state
  const [editStatus, setEditStatus] = useState<EligibilityStatus>("ELIGIBLE");
  const [editReason, setEditReason] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const loadData = async () => {
    if (!scheduleId) return;
    try {
      setLoading(true);
      const [schedRes, roomsRes, studRes] = await Promise.all([
        scheduleApi.getScheduleById(scheduleId),
        scheduleApi.getRooms(),
        academicApi.getAllStudents(),
      ]);

      if (schedRes.success && schedRes.data) {
        setSchedule(schedRes.data);

        if (isSchedulePassedOrClosed(schedRes.data)) {
          router.replace(`/exam-officer/grading-review/${schedRes.data.examinationId}`);
          return;
        }

        // Prepopulate reschedule form
        const start = new Date(schedRes.data.scheduledStartAt);
        const close = new Date(schedRes.data.scheduledCloseAt);
        setReschedDate(start.toISOString().split("T")[0]);
        setReschedStartTime(start.toTimeString().substring(0, 5));
        setReschedCloseTime(close.toTimeString().substring(0, 5));
        setReschedDuration(schedRes.data.durationMinutes);
        if (schedRes.data.roomId) {
          setReschedRoomId(schedRes.data.roomId.toString());
        }
      } else {
        toast.error("Failed to load examination schedule details");
      }

      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data);
      }

      if (studRes.success && studRes.data) {
        setAllStudents(studRes.data);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error fetching schedule data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [scheduleId]);

  // Filtered Eligibilities
  const filteredEligibilities = useMemo(() => {
    if (!schedule || !schedule.eligibilities) return [];
    return schedule.eligibilities.filter((e) => {
      const matchSearch =
        searchStudent.trim() === "" ||
        e.studentName.toLowerCase().includes(searchStudent.toLowerCase()) ||
        e.studentIdNumber.toLowerCase().includes(searchStudent.toLowerCase()) ||
        e.studentEmail.toLowerCase().includes(searchStudent.toLowerCase());

      const matchStatus =
        filterStatus === "ALL" || e.eligibilityStatus === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [schedule, searchStudent, filterStatus]);

  // Check conflicts for rescheduling
  const handleCheckRescheduleConflict = async () => {
    if (!reschedDate || !reschedStartTime || !reschedCloseTime) {
      toast.error("Please enter valid reschedule date and times");
      return;
    }
    const startIso = `${reschedDate}T${reschedStartTime}:00Z`;
    const closeIso = `${reschedDate}T${reschedCloseTime}:00Z`;

    try {
      setCheckingConflict(true);
      const res = await scheduleApi.checkConflicts({
        examinationId: schedule?.examinationId,
        start: startIso,
        close: closeIso,
        roomId: reschedRoomId ? Number(reschedRoomId) : undefined,
        excludeScheduleId: scheduleId,
      });

      if (res.success && res.data) {
        setReschedConflict(res.data);
        if (res.data.hasConflict) {
          toast.warning("Conflicts detected for the selected reschedule window!");
        } else {
          toast.success("No scheduling conflicts detected for this time slot");
        }
      }
    } catch {
      toast.error("Failed to verify conflicts");
    } finally {
      setCheckingConflict(false);
    }
  };

  // Submit Reschedule
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule || isScheduleReadOnly(schedule)) {
      toast.error("Closed or cancelled schedules cannot be rescheduled");
      return;
    }
    if (!reschedDate || !reschedStartTime || !reschedCloseTime) {
      toast.error("Please fill in required date and time fields");
      return;
    }

    const startIso = `${reschedDate}T${reschedStartTime}:00Z`;
    const closeIso = `${reschedDate}T${reschedCloseTime}:00Z`;

    if (new Date(closeIso) <= new Date(startIso)) {
      toast.error("Closing time must be strictly after start time");
      return;
    }

    try {
      setIsSubmittingResched(true);
      const req: RescheduleRequest = {
        scheduledStartAt: startIso,
        scheduledCloseAt: closeIso,
        durationMinutes: reschedDuration,
        roomId: reschedRoomId ? Number(reschedRoomId) : undefined,
        reason: reschedReason || "Operational Schedule Adjustment",
      };

      const res = await scheduleApi.reschedule(scheduleId, req);
      if (res.success) {
        toast.success("Examination rescheduled successfully! Affected students have been notified.");
        setShowRescheduleModal(false);
        loadData();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reschedule examination");
    } finally {
      setIsSubmittingResched(false);
    }
  };

  // Submit Cancel
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule || isScheduleReadOnly(schedule)) {
      toast.error("Closed or cancelled schedules cannot be modified");
      return;
    }
    try {
      setIsSubmittingCancel(true);
      const res = await scheduleApi.cancelSchedule(scheduleId, cancelReason);
      if (res.success) {
        toast.success("Schedule cancelled and students notified");
        setShowCancelModal(false);
        loadData();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel schedule");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Submit Add Exception
  const handleAddExceptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule || isScheduleReadOnly(schedule)) {
      toast.error("Eligibility roster is locked for closed or cancelled schedules");
      return;
    }
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }

    try {
      setIsSubmittingException(true);
      const res = await scheduleApi.addStudentEligibility(scheduleId, {
        studentId: Number(selectedStudentId),
        eligibilityStatus: exceptionStatus,
        reason: exceptionReason,
      });

      if (res.success) {
        toast.success("Student exception added successfully!");
        setShowAddExceptionModal(false);
        setSelectedStudentId("");
        loadData();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add student exception");
    } finally {
      setIsSubmittingException(false);
    }
  };

  // Submit Edit Eligibility Status
  const handleEditEligibilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule || isScheduleReadOnly(schedule)) {
      toast.error("Eligibility roster is locked for closed or cancelled schedules");
      return;
    }
    if (!selectedEligibilityToEdit) return;

    try {
      setIsSubmittingEdit(true);
      const res = await scheduleApi.updateEligibility(scheduleId, selectedEligibilityToEdit.studentId, {
        eligibilityStatus: editStatus,
        reason: editReason,
      });

      if (res.success) {
        toast.success(`Eligibility updated to ${editStatus}`);
        setSelectedEligibilityToEdit(null);
        loadData();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update student eligibility");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Remove Student Eligibility
  const handleRemoveEligibility = async (studentId: number, studentName: string) => {
    if (!schedule || isScheduleReadOnly(schedule)) {
      toast.error("Eligibility roster is locked for closed or cancelled schedules");
      return;
    }
    if (!confirm(`Are you sure you want to remove ${studentName} from this examination schedule?`)) {
      return;
    }

    try {
      const res = await scheduleApi.removeEligibility(scheduleId, studentId);
      if (res.success) {
        toast.success(`Removed ${studentName} from schedule`);
        loadData();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove student eligibility");
    }
  };

  if (loading) {
    return (
      <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-sky-600" />
          <p className="text-slate-500 font-medium">Loading schedule information...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!schedule) {
    return (
      <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
        <div className="text-center py-20 space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-2xl font-bold text-slate-900">Schedule Not Found</h2>
          <p className="text-slate-500">The requested examination schedule does not exist or was deleted.</p>
          <Button onClick={() => router.push("/exam-officer/scheduling")}>
            Back to Scheduling Dashboard
          </Button>
        </div>
      </DashboardShell>
    );
  }

  const startDate = new Date(schedule.scheduledStartAt);
  const closeDate = new Date(schedule.scheduledCloseAt);
  const isPassed = isSchedulePassedOrClosed(schedule);
  const isReadOnly = isScheduleReadOnly(schedule);

  const getStatusBadge = (status: ScheduleStatus) => {
    switch (status) {
      case "SCHEDULED":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>;
      case "ONGOING":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Ongoing</Badge>;
      case "COMPLETED":
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Completed</Badge>;
      case "RESCHEDULED":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Rescheduled</Badge>;
      case "CANCELLED":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getEligibilityBadge = (status: EligibilityStatus) => {
    switch (status) {
      case "ELIGIBLE":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Eligible</Badge>;
      case "EXEMPTED":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Exempted</Badge>;
      case "BLOCKED":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Blocked</Badge>;
      case "INELIGIBLE":
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Ineligible</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter students who are NOT already enrolled in this schedule for the Add Exception picker
  const eligibleStudentIds = new Set((schedule.eligibilities || []).map((e) => e.studentId));
  const availableStudentsForException = allStudents.filter((s) => !eligibleStudentIds.has(s.id));

  return (
    <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <div className="space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/exam-officer/scheduling"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                  Schedule #{schedule.id}
                </span>
                {getStatusBadge(schedule.status)}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                {schedule.examinationTitle}
              </h1>
            </div>
          </div>

          {/* Action buttons */}
          {!isReadOnly ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => setShowRescheduleModal(true)}
              >
                <CalendarClock className="w-4 h-4" />
                Reschedule Exam
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => setShowCancelModal(true)}
              >
                <XCircle className="w-4 h-4" />
                Cancel Schedule
              </Button>
            </div>
          ) : isPassed ? (
            <Link href={`/exam-officer/grading-review/${schedule.examinationId}`}>
              <Button className="gap-2 bg-sky-600 hover:bg-sky-700 text-white">
                <Award className="w-4 h-4" />
                Open Grading Review
              </Button>
            </Link>
          ) : (
            <Badge className="bg-slate-100 text-slate-600 border-slate-200 gap-1.5 py-1.5 px-3">
              <Lock className="w-3.5 h-3.5" />
              Read-Only
            </Badge>
          )}
        </div>

        {/* Locked / Passed Exam Notice Banner */}
        {isReadOnly && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">
                  {isPassed
                    ? "Examination Sitting Passed & Closed — Editing Locked"
                    : "Schedule Cancelled — Editing Locked"}
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  {isPassed
                    ? "This examination window has closed. Managing, rescheduling, and roster modifications are disabled. Redirecting to Grading Review..."
                    : "Cancelled schedules cannot be rescheduled or modified."}
                </p>
              </div>
            </div>
            {isPassed && (
              <Link href={`/exam-officer/grading-review/${schedule.examinationId}`}>
                <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white text-xs gap-1.5 shrink-0">
                  <Award className="w-3.5 h-3.5" />
                  Go to Grading Review
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Schedule Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border border-slate-200 shadow-xs">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Date & Window</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {startDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                    {closeDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-xs">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Duration & Marks</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {schedule.durationMinutes} Minutes
                  </p>
                  <p className="text-xs text-slate-500">
                    Total: {schedule.totalMarks} pts | Pass: {schedule.passingMarks} pts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-xs">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Venue / Room</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {schedule.roomName ? schedule.roomName : "Online / Remote Examination"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {schedule.building ? `Building: ${schedule.building}` : "No physical room reserved"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-xs">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Eligible Students</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {schedule.eligibleStudentCount} Enrolled
                  </p>
                  <p className="text-xs text-slate-500">
                    Section {schedule.section || "A"} • {schedule.courseCode}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course & Instructions Info Card */}
        <Card className="border border-slate-200">
          <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <CardTitle className="text-sm font-semibold text-slate-800">
                  Course & Examination Specifications
                </CardTitle>
              </div>
              <span className="text-xs text-slate-500">
                Created by: {schedule.createdByName || "Exam Officer"} on{" "}
                {new Date(schedule.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Course</span>
                <p className="font-semibold text-slate-800">
                  {schedule.courseCode} — {schedule.courseName}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Term & Academic Year</span>
                <p className="text-slate-700">
                  {schedule.semesterName || "Semester"} ({schedule.academicYearName || "Academic Year"})
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Course Instructor</span>
                <p className="text-slate-700">
                  {schedule.instructorName || "Assigned Faculty"}
                </p>
              </div>
            </div>

            {schedule.instructions && (
              <div className="mt-3 p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-900 uppercase">Candidate Instructions</p>
                  <p className="text-sm text-blue-800 mt-0.5">{schedule.instructions}</p>
                </div>
              </div>
            )}

            {/* Official Attempt Deadline Rule Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900 uppercase">
                  Server-Authoritative Attempt Deadline Policy
                </p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  The backend guarantees the official deadline rule:{" "}
                  <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-semibold">
                    deadline = min(studentAttemptStart + durationMinutes, scheduledCloseAt)
                  </code>
                  . Students who begin late cannot exceed the hard closing window (
                  {closeDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Eligibility Management Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Student Eligibility Roster ({schedule.eligibilities?.length || 0})
              </h2>
              <p className="text-xs text-slate-500">
                Manage candidate eligibility, grant administrative exemptions, or block unauthorized attempts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <Button
                  onClick={() => setShowAddExceptionModal(true)}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Student Exception
                </Button>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search student by name, ID, or email..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ELIGIBLE">Eligible</option>
                <option value="EXEMPTED">Exempted</option>
                <option value="BLOCKED">Blocked</option>
                <option value="INELIGIBLE">Ineligible</option>
              </select>
            </div>
          </div>

          {/* Eligibility Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Registration ID</th>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Remarks / Exception Reason</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEligibilities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No eligible student records match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEligibilities.map((eligibility) => (
                    <tr key={eligibility.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div>
                          <p className="font-semibold">{eligibility.studentName}</p>
                          <p className="text-xs text-slate-500">{eligibility.studentEmail}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        {eligibility.studentIdNumber}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {eligibility.programName || "Undergraduate"}
                      </td>
                      <td className="py-3.5 px-4">
                        {getEligibilityBadge(eligibility.eligibilityStatus)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {eligibility.reason || "Enrolled in course assignment"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isReadOnly ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                            <Lock className="w-3.5 h-3.5" />
                            Locked
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => {
                                setSelectedEligibilityToEdit(eligibility);
                                setEditStatus(eligibility.eligibilityStatus);
                                setEditReason(eligibility.reason || "");
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              Update
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                              onClick={() =>
                                handleRemoveEligibility(eligibility.studentId, eligibility.studentName)
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reschedule Modal */}
        {!isReadOnly && showRescheduleModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 text-amber-700 font-bold">
                  <CalendarClock className="w-5 h-5" />
                  <span>Reschedule Examination</span>
                </div>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Examination</label>
                  <p className="text-sm font-bold text-slate-900 mt-1">{schedule.examinationTitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">New Exam Date</label>
                    <Input
                      type="date"
                      value={reschedDate}
                      onChange={(e) => setReschedDate(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Duration (Minutes)</label>
                    <Input
                      type="number"
                      min={1}
                      value={reschedDuration}
                      onChange={(e) => setReschedDuration(Number(e.target.value))}
                      className="mt-1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Start Time</label>
                    <Input
                      type="time"
                      value={reschedStartTime}
                      onChange={(e) => setReschedStartTime(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Window Close Time</label>
                    <Input
                      type="time"
                      value={reschedCloseTime}
                      onChange={(e) => setReschedCloseTime(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Assigned Room</label>
                  <select
                    value={reschedRoomId}
                    onChange={(e) => setReschedRoomId(e.target.value)}
                    className="w-full mt-1 h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">No Physical Room (Online Only)</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} ({room.building}) — Cap: {room.capacity}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Reason for Rescheduling</label>
                  <textarea
                    rows={2}
                    value={reschedReason}
                    onChange={(e) => setReschedReason(e.target.value)}
                    placeholder="e.g., Unscheduled faculty emergency, system maintenance, or college holiday..."
                    className="w-full mt-1 p-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                {/* Conflict Check Button & Feedback */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Conflict Verification</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCheckRescheduleConflict}
                      disabled={checkingConflict}
                      className="h-7 text-xs border-slate-300"
                    >
                      {checkingConflict ? "Checking..." : "Verify Conflicts"}
                    </Button>
                  </div>

                  {reschedConflict && (
                    <div className="text-xs pt-1">
                      {reschedConflict.hasConflict ? (
                        <div className="text-rose-600 flex items-start gap-1.5 font-medium">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            {reschedConflict.roomConflictMessage && (
                              <p>{reschedConflict.roomConflictMessage}</p>
                            )}
                            {reschedConflict.studentConflicts && reschedConflict.studentConflicts.length > 0 && (
                              <p>
                                {reschedConflict.studentConflicts.length} enrolled students have an
                                overlapping exam scheduled.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-emerald-700 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Slot is clear: No student or room overlaps detected.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRescheduleModal(false)}
                    disabled={isSubmittingResched}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={isSubmittingResched}
                  >
                    {isSubmittingResched ? "Rescheduling..." : "Confirm & Notify Students"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Schedule Modal */}
        {!isReadOnly && showCancelModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
                <div className="flex items-center gap-2 text-rose-700 font-bold">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Cancel Examination Schedule</span>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCancelSubmit} className="p-5 space-y-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to cancel the schedule for{" "}
                  <strong className="text-slate-900">{schedule.examinationTitle}</strong>? This action
                  will immediately prevent any student from starting attempts and notify all enrolled candidates.
                </p>

                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Cancellation Reason (shared in notification)
                  </label>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Provide an explanation for cancelling this scheduled examination..."
                    className="w-full mt-1 p-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCancelModal(false)}
                    disabled={isSubmittingCancel}
                  >
                    Keep Schedule
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={isSubmittingCancel}
                  >
                    {isSubmittingCancel ? "Cancelling..." : "Confirm Cancellation"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Student Exception Modal */}
        {!isReadOnly && showAddExceptionModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  <span>Add Student Exception</span>
                </div>
                <button
                  onClick={() => setShowAddExceptionModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddExceptionSubmit} className="p-5 space-y-4">
                <p className="text-xs text-slate-500">
                  Register an individual student who is not part of the standard course assignment enrollment,
                  or assign special eligibility clearance.
                </p>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Select Student</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full mt-1 h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">-- Choose student --</option>
                    {availableStudentsForException.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.userFullName} ({student.registrationNumber}) — {student.programName || "Enrolled Student"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Eligibility Status</label>
                  <select
                    value={exceptionStatus}
                    onChange={(e) => setExceptionStatus(e.target.value as EligibilityStatus)}
                    className="w-full mt-1 h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ELIGIBLE">Eligible (Granted Access)</option>
                    <option value="EXEMPTED">Exempted (Special Academic Standing)</option>
                    <option value="BLOCKED">Blocked (Hold Placed)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Authorization Reason</label>
                  <textarea
                    rows={2}
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                    placeholder="Enter reason for manual eligibility granting..."
                    className="w-full mt-1 p-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddExceptionModal(false)}
                    disabled={isSubmittingException}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isSubmittingException}
                  >
                    {isSubmittingException ? "Saving..." : "Add to Roster"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Eligibility Modal */}
        {!isReadOnly && selectedEligibilityToEdit && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Update Student Eligibility</span>
                </div>
                <button
                  onClick={() => setSelectedEligibilityToEdit(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditEligibilitySubmit} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Student</label>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedEligibilityToEdit.studentName} ({selectedEligibilityToEdit.studentIdNumber})
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as EligibilityStatus)}
                    className="w-full mt-1 h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ELIGIBLE">ELIGIBLE (Candidate permitted to sit for exam)</option>
                    <option value="EXEMPTED">EXEMPTED (Exempt from taking exam)</option>
                    <option value="BLOCKED">BLOCKED (Candidate barred from exam)</option>
                    <option value="INELIGIBLE">INELIGIBLE (Does not meet course criteria)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Administrative Remarks</label>
                  <textarea
                    rows={2}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Enter reason for status modification..."
                    className="w-full mt-1 p-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedEligibilityToEdit(null)}
                    disabled={isSubmittingEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isSubmittingEdit}
                  >
                    {isSubmittingEdit ? "Updating..." : "Save Status"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function ExamOfficerScheduleDetailsPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
          <div className="py-20 flex justify-center items-center">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        </DashboardShell>
      }
    >
      <ScheduleDetailsContent />
    </Suspense>
  );
}
