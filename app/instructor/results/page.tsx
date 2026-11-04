"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { examApi } from "@/lib/api/exam";
import { resultApi } from "@/lib/api/result";
import { Examination } from "@/types/exam";
import { CourseExamRosterItem } from "@/types/result";
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
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function InstructorResultsPage() {
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
        setExams(res.data.content);
        if (res.data.content.length > 0 && !selectedExamId) {
          setSelectedExamId(res.data.content[0].id);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load examinations.");
    } finally {
      setLoadingExams(false);
    }
  };

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
      toast.error(`Marks cannot exceed total available examination marks (${correctingItem.totalMarks}).`);
      return;
    }

    if (!correctionReason.trim()) {
      toast.error("Please provide a justification reason for the audit log.");
      return;
    }

    setSubmittingCorrection(true);
    try {
      const res = await resultApi.correctPublishedResult(correctingItem.resultId, {
        newEarnedMarks: parsedMarks,
        reason: correctionReason.trim(),
      });
      if (res.success) {
        toast.success("Result corrected and audit record saved successfully.");
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

    if (statusFilter === "SUBMITTED") return item.attemptStatus === "SUBMITTED";
    if (statusFilter === "IN_PROGRESS") return item.attemptStatus === "IN_PROGRESS";
    if (statusFilter === "NOT_ATTEMPTED") return item.attemptStatus === "NOT_ATTEMPTED" || !item.attemptStatus;
    if (statusFilter === "PENDING_GRADING") return item.gradingStatus === "PENDING" || item.gradingStatus === "IN_PROGRESS";
    if (statusFilter === "COMPLETED") return item.gradingStatus === "COMPLETED";

    return true;
  });

  // Calculate statistics (Marks-based, strictly NO pass/fail)
  const totalEnrolled = roster.length;
  const attemptedCount = roster.filter((r) => r.attemptStatus && r.attemptStatus !== "NOT_ATTEMPTED").length;
  const submittedCount = roster.filter((r) => r.attemptStatus === "SUBMITTED").length;
  const gradedCount = roster.filter((r) => r.gradingStatus === "COMPLETED").length;
  const publishedCount = roster.filter((r) => r.publicationStatus === "PUBLISHED").length;

  return (
    <ProtectedRoute allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                <FileCheck2 className="h-8 w-8 text-primary" />
                Course Examination Results & Grading
              </h1>
              <p className="text-slate-500 mt-1">
                Evaluate student submissions, score subjective responses, manage draft grades, and audit published marks.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleExportCsv}
                disabled={!selectedExamId || roster.length === 0}
                className="gap-2 border-slate-200"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Exam Selector Strip */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 max-w-md">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      Active Examination
                    </label>
                    <select
                      value={selectedExamId || ""}
                      onChange={(e) => setSelectedExamId(Number(e.target.value))}
                      disabled={loadingExams || exams.length === 0}
                      className="w-full text-sm font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
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
                  <div className="flex items-center gap-6 text-sm text-slate-600 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200/60">
                    <div>
                      <span className="text-slate-400 text-xs block">Duration</span>
                      <span className="font-semibold">{selectedExam.durationMinutes} mins</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">Total Marks</span>
                      <span className="font-semibold font-mono">{Number(selectedExam.totalMarks).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">Questions</span>
                      <span className="font-semibold">{selectedExam.questions?.length || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Roster Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Enrolled</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalEnrolled}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Submissions</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {submittedCount}{" "}
                  <span className="text-xs font-normal text-slate-400">/ {attemptedCount} attempted</span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Grading Completed</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{gradedCount}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Published</p>
                <p className="text-2xl font-bold text-primary mt-1">{publishedCount}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Not Attempted</p>
                <p className="text-2xl font-bold text-slate-500 mt-1">{totalEnrolled - attemptedCount}</p>
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
                className="pl-9 bg-white border-slate-200 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
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
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Enrolled Student Roster</CardTitle>
                  <CardDescription className="text-xs">
                    Showing {filteredRoster.length} of {roster.length} registered candidates
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingRoster ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm text-slate-500">Loading candidate roster...</p>
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No candidate records match the selected criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/40 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-6">Reg Number</th>
                        <th className="py-3 px-6">Student Name</th>
                        <th className="py-3 px-6">Attempt Status</th>
                        <th className="py-3 px-6">Grading Status</th>
                        <th className="py-3 px-6">Marks Earned</th>
                        <th className="py-3 px-6">Publication</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRoster.map((item) => {
                        const isAttempted = item.attemptStatus && item.attemptStatus !== "NOT_ATTEMPTED";
                        const isSubmitted = item.attemptStatus === "SUBMITTED";
                        const isGraded = item.gradingStatus === "COMPLETED";
                        const isPublished = item.publicationStatus === "PUBLISHED";

                        return (
                          <tr key={item.studentId} className="hover:bg-slate-50/60 transition">
                            <td className="py-4 px-6 font-mono text-xs font-medium text-slate-700">
                              {item.registrationNumber}
                            </td>
                            <td className="py-4 px-6 font-semibold text-slate-900">
                              {item.studentName}
                            </td>
                            <td className="py-4 px-6">
                              {item.attemptStatus === "SUBMITTED" ? (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200">Submitted</Badge>
                              ) : item.attemptStatus === "IN_PROGRESS" ? (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200">In Progress</Badge>
                              ) : item.attemptStatus === "EXPIRED" ? (
                                <Badge className="bg-rose-50 text-rose-700 border-rose-200">Expired</Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-500 border-slate-200">Not Attempted</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {isGraded ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Badge>
                              ) : item.gradingStatus === "IN_PROGRESS" ? (
                                <Badge className="bg-purple-50 text-purple-700 border-purple-200">Draft In Progress</Badge>
                              ) : isAttempted ? (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending Review</Badge>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-4 px-6 font-mono font-medium">
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
                            <td className="py-4 px-6">
                              {isPublished ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Published</Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-600 border-slate-200">Draft</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right space-x-2">
                              {item.attemptId && (
                                <Link href={`/instructor/grading/${item.attemptId}`}>
                                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs font-medium">
                                    <PenTool className="h-3.5 w-3.5 text-primary" />
                                    {isGraded ? "Review Grades" : "Grade Attempt"}
                                  </Button>
                                </Link>
                              )}

                              {isPublished && item.resultId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openCorrectionModal(item)}
                                  className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
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

          {/* Result Correction Audit Modal */}
          {correctingItem && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <Card className="w-full max-w-md bg-white border-slate-200 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Correct Published Result
                    </CardTitle>
                    <CardDescription className="text-xs">
                      All adjustments are permanently audited with reason and timestamp.
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCorrectingItem(null)}
                    className="h-8 w-8 p-0"
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
                        <span className="font-mono font-bold text-primary">
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
                        placeholder="e.g. 24.50"
                        className="font-mono text-sm"
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
                        placeholder="Explain why this mark is being adjusted (e.g., student inquiry, manual re-evaluation)..."
                        className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
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
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submittingCorrection}
                    >
                      {submittingCorrection ? "Saving Audit..." : "Save Correction"}
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
