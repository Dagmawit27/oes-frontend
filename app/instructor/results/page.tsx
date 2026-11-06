"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { examApi } from "@/lib/api/exam";
import { resultApi } from "@/lib/api/result";
import { Examination } from "@/types/exam";
import { CourseExamRosterItem, isGradingCompleted, isResultPublished } from "@/types/result";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  History,
  PenTool,
  Search,
  UserCheck,
  Users,
  X,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function InstructorResultsContent() {
  const searchParams = useSearchParams();
  const urlExamId = searchParams.get("examId");

  const [exams, setExams] = useState<Examination[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [roster, setRoster] = useState<CourseExamRosterItem[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Correction Modal State
  const [correctingItem, setCorrectingItem] = useState<CourseExamRosterItem | null>(null);
  const [newEarnedMarks, setNewEarnedMarks] = useState<string>("");
  const [correctionReason, setCorrectionReason] = useState<string>("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  useEffect(() => {
    loadExaminations();
  }, []);

  const loadExaminations = async () => {
    setLoadingExams(true);
    try {
      const res = await examApi.getExaminations({ myExamsOnly: true, size: 100 });
      if (res.success && res.data) {
        // Sort latest exams first
        const sorted = [...res.data.content].sort((a, b) => b.id - a.id);
        setExams(sorted);
        if (sorted.length > 0) {
          const targetId = urlExamId ? Number(urlExamId) : (selectedExamId || sorted[0].id);
          setSelectedExamId(targetId);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load examinations.");
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    if (urlExamId) {
      setSelectedExamId(Number(urlExamId));
    }
  }, [urlExamId]);

  useEffect(() => {
    if (selectedExamId) {
      loadRoster(selectedExamId);
    }
  }, [selectedExamId]);

  const loadRoster = async (examId: number) => {
    setLoadingRoster(true);
    try {
      const res = await resultApi.getInstructorExamResults(examId);
      if (res.success && res.data) {
        setRoster(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load examination results roster.");
    } finally {
      setLoadingRoster(false);
    }
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const handleExportCsv = async () => {
    if (!selectedExamId || !selectedExam) return;
    try {
      toast.info("Generating CSV results export...");
      await resultApi.downloadResultsCsv(selectedExamId, selectedExam.title);
      toast.success("CSV export downloaded successfully.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to export results CSV.");
    }
  };

  const openCorrectionModal = (item: CourseExamRosterItem) => {
    setCorrectingItem(item);
    setNewEarnedMarks(item.earnedMarks !== null ? item.earnedMarks.toString() : "");
    setCorrectionReason("");
  };

  const submitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingItem || !correctingItem.resultId) return;

    const parsedMarks = parseFloat(newEarnedMarks);
    if (isNaN(parsedMarks) || parsedMarks < 0) {
      toast.error("Earned marks must be a valid non-negative number.");
      return;
    }

    if (correctingItem.totalMarks && parsedMarks > correctingItem.totalMarks) {
      toast.error(`Marks cannot exceed total available marks (${correctingItem.totalMarks}).`);
      return;
    }

    if (!correctionReason.trim()) {
      toast.error("Please provide an audit justification reason.");
      return;
    }

    setSubmittingCorrection(true);
    try {
      const res = await resultApi.correctPublishedResult(correctingItem.resultId, {
        newEarnedMarks: parsedMarks,
        reason: correctionReason.trim(),
      });
      if (res.success) {
        toast.success("Result corrected and audit record recorded successfully.");
        setCorrectingItem(null);
        if (selectedExamId) loadRoster(selectedExamId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record result correction.");
    } finally {
      setSubmittingCorrection(false);
    }
  };

  // Filter roster
  const filteredRoster = roster.filter((item) => {
    const matchesSearch =
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "SUBMITTED") return item.attemptStatus === "Submitted" || item.attemptStatus === "SUBMITTED";
    if (statusFilter === "IN_PROGRESS") return item.attemptStatus === "In Progress" || item.attemptStatus === "IN_PROGRESS";
    if (statusFilter === "NOT_ATTEMPTED") return item.attemptStatus === "Not Attempted" || item.attemptStatus === "NOT_ATTEMPTED" || !item.attemptStatus;
    if (statusFilter === "PENDING_GRADING") return !isGradingCompleted(item.gradingStatus) && (item.attemptStatus !== "Not Attempted" && item.attemptStatus !== "NOT_ATTEMPTED");
    if (statusFilter === "COMPLETED") return isGradingCompleted(item.gradingStatus);

    return true;
  });

  // Calculate statistics
  const totalEnrolled = roster.length;
  const attemptedCount = roster.filter((r) => r.attemptStatus && r.attemptStatus !== "Not Attempted" && r.attemptStatus !== "NOT_ATTEMPTED").length;
  const submittedCount = roster.filter((r) => r.attemptStatus === "Submitted" || r.attemptStatus === "SUBMITTED").length;
  const gradedCount = roster.filter((r) => isGradingCompleted(r.gradingStatus)).length;
  const publishedCount = roster.filter((r) => isResultPublished(r.publicationStatus)).length;

  return (
    <ProtectedRoute allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Top Header */}
          <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  <Award className="w-3.5 h-3.5 text-sky-600" />
                  Academic Assessment
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Course Examination Results & Roster
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Evaluate student submissions, score subjective responses, manage draft grades, and audit student marks.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedExamId && loadRoster(selectedExamId)}
                disabled={loadingRoster || !selectedExamId}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 text-xs h-9"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRoster ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={!selectedExamId || roster.length === 0}
                className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Exam Selector Strip */}
          <Card className="bg-white border-slate-200/90 shadow-xs">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60 shrink-0">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="flex-1 max-w-md">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      Target Examination
                    </label>
                    <select
                      value={selectedExamId || ""}
                      onChange={(e) => setSelectedExamId(Number(e.target.value))}
                      disabled={loadingExams || exams.length === 0}
                      className="w-full text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    >
                      {exams.length === 0 ? (
                        <option value="">No examinations found</option>
                      ) : (
                        exams.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.title} ({ex.courseCode || "Course"}) - {ex.status}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {selectedExam && (
                  <div className="flex items-center gap-6 text-xs text-slate-600 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/60">
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Duration</span>
                      <span className="font-semibold text-slate-800">{selectedExam.durationMinutes} mins</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Total Marks</span>
                      <span className="font-bold font-mono text-sky-700">{Number(selectedExam.totalMarks).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Questions</span>
                      <span className="font-semibold text-slate-800">{selectedExam.questionCount || selectedExam.questions?.length || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Roster Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Enrolled</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalEnrolled}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Course candidates</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Submissions</p>
                <p className="text-2xl font-bold text-sky-700 mt-1">
                  {submittedCount}{" "}
                  <span className="text-xs font-normal text-slate-400">/ {attemptedCount}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Attempted sittings</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Graded</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{gradedCount}</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Evaluation finalized</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Published</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{publishedCount}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Live for candidates</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Not Attempted</p>
                <p className="text-2xl font-bold text-slate-500 mt-1">{totalEnrolled - attemptedCount}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Absent students</p>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search candidates by name or reg number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-200 shadow-xs text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs h-9"
              >
                <option value="ALL">All Candidates</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PENDING_GRADING">Pending Grading</option>
                <option value="COMPLETED">Grading Completed</option>
                <option value="NOT_ATTEMPTED">Not Attempted</option>
              </select>
            </div>
          </div>

          {/* Candidate Results Roster Table */}
          <Card className="bg-white border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Enrolled Student Roster</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Showing {filteredRoster.length} of {roster.length} registered candidates
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingRoster ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
                  <p className="text-xs text-slate-500">Loading candidate roster...</p>
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No candidate records match the selected criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Reg Number</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Attempt Status</th>
                        <th className="py-3 px-4">Grading Status</th>
                        <th className="py-3 px-4">Marks Earned</th>
                        <th className="py-3 px-4">Publication</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRoster.map((item) => {
                        const isAttempted = item.attemptStatus && item.attemptStatus !== "Not Attempted" && item.attemptStatus !== "NOT_ATTEMPTED";
                        const isGraded = isGradingCompleted(item.gradingStatus);
                        const isPublished = isResultPublished(item.publicationStatus);

                        return (
                          <tr key={item.studentId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-semibold text-sky-700">
                              {item.registrationNumber}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-900">
                              {item.studentName}
                            </td>
                            <td className="py-3.5 px-4">
                              {item.attemptStatus === "Submitted" || item.attemptStatus === "SUBMITTED" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                  Submitted
                                </span>
                              ) : item.attemptStatus === "In Progress" || item.attemptStatus === "IN_PROGRESS" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  In Progress
                                </span>
                              ) : item.attemptStatus === "Expired" || item.attemptStatus === "EXPIRED" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  Expired
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                                  Not Attempted
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {isGraded ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Graded
                                </span>
                              ) : isAttempted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" /> Pending Review
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-medium">
                              {item.earnedMarks !== null ? (
                                <span className="text-slate-900 font-bold">
                                  {Number(item.earnedMarks).toFixed(2)}{" "}
                                  <span className="text-slate-400 font-normal text-xs">
                                    / {item.totalMarks ? Number(item.totalMarks).toFixed(2) : "—"}
                                  </span>
                                </span>
                              ) : isAttempted ? (
                                <span className="text-amber-600 text-xs">Ungraded</span>
                              ) : (
                                <span className="text-slate-400 text-xs">Not Attempted</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {isPublished ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Published
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  Draft (Officer Release)
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                              {item.attemptId && (
                                <Link href={`/instructor/grading/${item.attemptId}`}>
                                  <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5 h-8 text-xs font-medium shadow-xs">
                                    <PenTool className="h-3.5 w-3.5" />
                                    {isGraded ? "Review Grades" : "Grade Attempt"}
                                  </Button>
                                </Link>
                              )}

                              {isPublished && item.resultId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openCorrectionModal(item)}
                                  className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1 border-slate-200"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-sky-600" />
                                  Correct
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Correction Modal */}
          {correctingItem && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <Card className="w-full max-w-md bg-white border-slate-200 shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Audit Correction (Published Mark)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Modifications to published scores require audit logging.
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCorrectingItem(null)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>

                <form onSubmit={submitCorrection}>
                  <CardContent className="space-y-4 pt-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 text-xs space-y-1">
                      <p>
                        <span className="font-semibold text-slate-700">Candidate: </span>
                        {correctingItem.studentName} ({correctingItem.registrationNumber})
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">Current Earned Marks: </span>
                        <span className="font-mono font-bold text-sky-700">
                          {correctingItem.earnedMarks !== null ? Number(correctingItem.earnedMarks).toFixed(2) : "0.00"}
                        </span>{" "}
                        / {correctingItem.totalMarks ? Number(correctingItem.totalMarks).toFixed(2) : "—"}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        New Earned Marks (out of {correctingItem.totalMarks})
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={correctingItem.totalMarks || 100}
                        required
                        value={newEarnedMarks}
                        onChange={(e) => setNewEarnedMarks(e.target.value)}
                        placeholder="e.g. 18.50"
                        className="font-mono text-xs bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Audit Justification Reason <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={correctionReason}
                        onChange={(e) => setCorrectionReason(e.target.value)}
                        placeholder="Explain why this student's grade is being altered..."
                        className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 p-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900"
                      />
                    </div>
                  </CardContent>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCorrectingItem(null)}
                      disabled={submittingCorrection}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submittingCorrection}
                      className="bg-sky-600 hover:bg-sky-700 text-white text-xs shadow-xs"
                    >
                      {submittingCorrection ? "Auditing..." : "Save Correction"}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}

export default function InstructorResultsPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="py-24 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
            <p className="text-sm">Loading course results...</p>
          </div>
        </DashboardShell>
      }
    >
      <InstructorResultsContent />
    </Suspense>
  );
}
