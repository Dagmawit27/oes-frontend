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
  History,
  Lock,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function ExamOfficerResultsPage() {
  const [exams, setExams] = useState<Examination[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [roster, setRoster] = useState<CourseExamRosterItem[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [publishingAll, setPublishingAll] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);

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
      const res = await examApi.getExaminations({ size: 100 });
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
      const res = await resultApi.getOfficerExamResults(examId);
      if (res.success && res.data) {
        setRoster(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load results roster.");
    } finally {
      setLoadingRoster(false);
    }
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const handlePublishSingle = async (resultId: number) => {
    setPublishingId(resultId);
    try {
      const res = await resultApi.publishResult(resultId);
      if (res.success) {
        toast.success("Examination result successfully published to candidate portal.");
        if (selectedExamId) loadRoster(selectedExamId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to publish result.");
    } finally {
      setPublishingId(null);
    }
  };

  const handlePublishAll = async () => {
    if (!selectedExamId) return;
    const completedUnpublished = roster.filter(
      (r) => r.gradingStatus === "COMPLETED" && r.publicationStatus === "DRAFT"
    ).length;

    if (completedUnpublished === 0) {
      toast.info("No completed unpublished results available for batch publication.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to publish ${completedUnpublished} completed examination result(s)? Candidates will immediately be able to view their scores.`
      )
    ) {
      return;
    }

    setPublishingAll(true);
    try {
      const res = await resultApi.publishAllExamResults(selectedExamId);
      if (res.success) {
        toast.success(`Batch publication complete! ${res.data.publishedCount} results published.`);
        loadRoster(selectedExamId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to batch publish results.");
    } finally {
      setPublishingAll(false);
    }
  };

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
  const filteredRoster = roster.filter(
    (item) =>
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const totalEnrolled = roster.length;
  const attemptedCount = roster.filter((r) => r.attemptStatus && r.attemptStatus !== "NOT_ATTEMPTED").length;
  const gradedCompleted = roster.filter((r) => r.gradingStatus === "COMPLETED").length;
  const publishedCount = roster.filter((r) => r.publicationStatus === "PUBLISHED").length;
  const readyToPublishCount = roster.filter(
    (r) => r.gradingStatus === "COMPLETED" && r.publicationStatus === "DRAFT"
  ).length;

  return (
    <ProtectedRoute allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-primary" />
                Examination Result Publication & Auditing
              </h1>
              <p className="text-slate-500 mt-1">
                Official Exam Officer portal for reviewing evaluated examination batches, authorizing candidate publication, and maintaining score audit trails.
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

              <Button
                onClick={handlePublishAll}
                disabled={publishingAll || readyToPublishCount === 0}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="h-4 w-4" />
                {publishingAll ? "Publishing..." : `Publish All (${readyToPublishCount} Ready)`}
              </Button>
            </div>
          </div>

          {/* Exam Selector */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 max-w-md">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      Target Examination
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
                      <span className="text-slate-400 text-xs block">Course</span>
                      <span className="font-semibold">{selectedExam.courseName || "General"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">Total Marks</span>
                      <span className="font-semibold font-mono">{Number(selectedExam.totalMarks).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Enrolled</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalEnrolled}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attempted</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{attemptedCount}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Evaluation Completed</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{gradedCompleted}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ready to Publish</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{readyToPublishCount}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Published to Students</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{publishedCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search candidate name or reg number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 shadow-xs"
            />
          </div>

          {/* Roster Table */}
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
              <CardTitle className="text-base font-bold text-slate-900">
                Official Examination Publication Roster
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              {loadingRoster ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm text-slate-500">Loading candidate publication records...</p>
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No candidates found for this examination.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/40 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-6">Reg Number</th>
                        <th className="py-3 px-6">Candidate Name</th>
                        <th className="py-3 px-6">Attempt Status</th>
                        <th className="py-3 px-6">Grading Status</th>
                        <th className="py-3 px-6">Earned Marks</th>
                        <th className="py-3 px-6">Publication Status</th>
                        <th className="py-3 px-6 text-right">Officer Authorization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRoster.map((item) => {
                        const isGraded = item.gradingStatus === "COMPLETED";
                        const isPublished = item.publicationStatus === "PUBLISHED";
                        const isReadyToPublish = isGraded && !isPublished;

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
                              ) : (
                                <Badge className="bg-slate-100 text-slate-500 border-slate-200">Not Attempted</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {isGraded ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Badge>
                              ) : item.gradingStatus === "IN_PROGRESS" ? (
                                <Badge className="bg-purple-50 text-purple-700 border-purple-200">Draft</Badge>
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
                              ) : (
                                <span className="text-slate-400 text-xs">
                                  {item.attemptStatus === "SUBMITTED" ? "Ungraded" : "Not Attempted"}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {isPublished ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  Published
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-600 border-slate-200">Draft</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right space-x-2">
                              {isReadyToPublish && item.resultId && (
                                <Button
                                  size="sm"
                                  onClick={() => handlePublishSingle(item.resultId!)}
                                  disabled={publishingId === item.resultId}
                                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                >
                                  <Send className="h-3 w-3" />
                                  {publishingId === item.resultId ? "Publishing..." : "Publish Result"}
                                </Button>
                              )}

                              {isPublished && item.resultId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openCorrectionModal(item)}
                                  className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  Audit Correction
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
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <Card className="w-full max-w-md bg-white border-slate-200 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Audit Correction (Official Publication)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Official correction recorded in compliance audit log.
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
                        Mandatory Audit Justification Reason <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={correctionReason}
                        onChange={(e) => setCorrectionReason(e.target.value)}
                        placeholder="Official justification for altering published examination marks..."
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
