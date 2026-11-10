"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { examApi } from "@/lib/api/exam";
import { resultApi } from "@/lib/api/result";
import { Examination } from "@/types/exam";
import {
  CourseExamRosterItem,
  isGradingCompleted,
  isResultPublished,
} from "@/types/result";
import {
  ArrowLeft,
  Download,
  Edit3,
  FileCheck2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

function GradingReviewDetailContent() {
  const params = useParams();
  const examId = Number(params?.examId);

  const [exam, setExam] = useState<Examination | null>(null);
  const [roster, setRoster] = useState<CourseExamRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [publishingAll, setPublishingAll] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);

  // Correction Modal State
  const [correctingItem, setCorrectingItem] = useState<CourseExamRosterItem | null>(null);
  const [newEarnedMarks, setNewEarnedMarks] = useState<string>("");
  const [correctionReason, setCorrectionReason] = useState<string>("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  const loadDetailData = useCallback(async () => {
    if (!examId || Number.isNaN(examId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [examRes, rosterRes] = await Promise.allSettled([
        examApi.getExaminationById(examId),
        resultApi.getOfficerExamResults(examId),
      ]);

      if (examRes.status === "fulfilled" && examRes.value.success && examRes.value.data) {
        setExam(examRes.value.data);
      } else {
        setExam(null);
      }

      if (rosterRes.status === "fulfilled" && rosterRes.value.success && rosterRes.value.data) {
        setRoster(rosterRes.value.data);
      } else {
        setRoster([]);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load examination grading details");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadDetailData();
  }, [loadDetailData]);

  const handlePublishSingle = async (resultId: number) => {
    setPublishingId(resultId);
    try {
      const res = await resultApi.publishResult(resultId);
      if (res.success) {
        toast.success("Examination result successfully published to candidate portal.");
        await loadDetailData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to publish result.");
    } finally {
      setPublishingId(null);
    }
  };

  const handlePublishAll = async () => {
    if (!examId) return;
    const completedUnpublished = roster.filter(
      (r) => isGradingCompleted(r.gradingStatus) && !isResultPublished(r.publicationStatus)
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
      const res = await resultApi.publishAllExamResults(examId);
      if (res.success) {
        toast.success(`Batch publication complete! ${res.data.publishedCount} results published.`);
        await loadDetailData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to batch publish results.");
    } finally {
      setPublishingAll(false);
    }
  };

  const handleExportCsv = async () => {
    if (!exam) return;
    try {
      toast.info("Generating CSV results export...");
      await resultApi.downloadResultsCsv(exam.id, exam.title);
      toast.success("CSV export downloaded successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to export results CSV.");
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
    if (Number.isNaN(parsedMarks) || parsedMarks < 0) {
      toast.error("Earned marks must be a valid non-negative number.");
      return;
    }

    if (correctingItem.totalMarks && parsedMarks > correctingItem.totalMarks) {
      toast.error(
        `Marks cannot exceed total available examination marks (${correctingItem.totalMarks}).`
      );
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
        await loadDetailData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record result correction.");
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const filteredRoster = roster.filter(
    (item) =>
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalEnrolled = roster.length;
  const attemptedCount = roster.filter(
    (r) =>
      r.attemptStatus &&
      r.attemptStatus.toUpperCase() !== "NOT_ATTEMPTED" &&
      r.attemptStatus.toUpperCase() !== "NOT ATTEMPTED"
  ).length;
  const gradedCompleted = roster.filter((r) => isGradingCompleted(r.gradingStatus)).length;
  const publishedCount = roster.filter((r) => isResultPublished(r.publicationStatus)).length;
  const readyToPublishCount = roster.filter(
    (r) => isGradingCompleted(r.gradingStatus) && !isResultPublished(r.publicationStatus)
  ).length;

  return (
    <ProtectedRoute allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {loading ? (
            <div className="py-24 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
              <p className="text-sm">Loading examination grading review details...</p>
            </div>
          ) : !exam ? (
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="py-16 text-center space-y-3">
                <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h2 className="text-lg font-bold text-slate-900">Examination Not Found</h2>
                <p className="text-xs text-slate-500">
                  The requested examination could not be loaded or does not exist.
                </p>
                <Link href="/exam-officer/grading-review">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Grading Review
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Top Header Card */}
              <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Link
                    href="/exam-officer/grading-review"
                    className="mt-1 p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                    title="Back to Grading Review"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                        Grading Review & Publication
                      </span>
                      <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-700">
                        {exam.status}
                      </Badge>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1.5">
                      {exam.title}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      {exam.courseCode} — {exam.courseName}
                      {exam.section ? ` (Sec ${exam.section})` : ""} &bull;{" "}
                      {exam.semesterName || "Current Term"} &bull; Total Marks:{" "}
                      <span className="font-semibold text-slate-700">
                        {Number(exam.totalMarks).toFixed(2)}
                      </span>{" "}
                      (Pass:{" "}
                      <span className="font-semibold text-slate-700">
                        {Number(exam.passingMarks).toFixed(2)}
                      </span>
                      )
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadDetailData}
                    disabled={loading}
                    className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCsv}
                    disabled={roster.length === 0}
                    className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={handlePublishAll}
                    disabled={publishingAll || readyToPublishCount === 0}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 shadow-xs"
                  >
                    <Send className="h-4 w-4" />
                    {publishingAll ? "Publishing..." : `Publish All (${readyToPublishCount} Ready)`}
                  </Button>
                </div>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card className="bg-white border-slate-200/90 shadow-xs">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total Enrolled
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{totalEnrolled}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Candidates in roster</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200/90 shadow-xs">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Attempted
                    </p>
                    <p className="text-2xl font-bold text-sky-700 mt-1">{attemptedCount}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Candidate submissions</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200/90 shadow-xs">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Evaluation Done
                    </p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{gradedCompleted}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Graded attempts</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200/90 shadow-xs">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Ready to Publish
                    </p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{readyToPublishCount}</p>
                    <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                      Awaiting authorization
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200/90 shadow-xs">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Published
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{publishedCount}</p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                      Live for students
                    </p>
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
                  className="pl-9 bg-white border-slate-200 shadow-xs text-xs h-9"
                />
              </div>

              {/* Roster Table */}
              <Card className="bg-white border-slate-200/90 shadow-xs overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Official Candidate Evaluation & Publication Roster
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Audit candidate scoring, authorize official publication, and record corrections
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {filteredRoster.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      No candidates found for this examination.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            <th className="py-3 px-4">Reg Number</th>
                            <th className="py-3 px-4">Candidate Name</th>
                            <th className="py-3 px-4">Attempt Status</th>
                            <th className="py-3 px-4">Grading Status</th>
                            <th className="py-3 px-4">Earned Marks</th>
                            <th className="py-3 px-4">Publication Status</th>
                            <th className="py-3 px-4 text-right">Officer Authorization</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredRoster.map((item) => {
                            const isGraded = isGradingCompleted(item.gradingStatus);
                            const isPublished = isResultPublished(item.publicationStatus);
                            const isReadyToPublish = isGraded && !isPublished;

                            return (
                              <tr key={item.studentId} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3.5 px-4 font-mono text-xs font-semibold text-sky-700">
                                  {item.registrationNumber}
                                </td>
                                <td className="py-3.5 px-4 font-medium text-slate-900">
                                  {item.studentName}
                                </td>
                                <td className="py-3.5 px-4">
                                  {item.attemptStatus && item.attemptStatus.toUpperCase() === "SUBMITTED" ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                      Submitted
                                    </span>
                                  ) : item.attemptStatus &&
                                    item.attemptStatus.toUpperCase().replace(/\s+/g, "_") === "IN_PROGRESS" ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                      In Progress
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                      Not Attempted
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  {isGraded ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Completed
                                    </span>
                                  ) : item.gradingStatus &&
                                    item.gradingStatus.toUpperCase().replace(/\s+/g, "_") === "IN_PROGRESS" ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                      Draft
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
                                  ) : (
                                    <span className="text-slate-400 text-xs">
                                      {item.attemptStatus === "SUBMITTED" ? "Ungraded" : "Not Attempted"}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  {isPublished ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Published
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                      Draft
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right space-x-2">
                                  {isReadyToPublish && item.resultId && (
                                    <Button
                                      size="sm"
                                      onClick={() => handlePublishSingle(item.resultId!)}
                                      disabled={publishingId === item.resultId}
                                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                                    >
                                      <Send className="h-3 w-3" />
                                      {publishingId === item.resultId ? "Publishing..." : "Publish Result"}
                                    </Button>
                                  )}

                                  {isPublished && item.resultId && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openCorrectionModal(item)}
                                      className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1 border-slate-200"
                                    >
                                      <Edit3 className="h-3.5 w-3.5 text-sky-600" />
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
            </>
          )}

          {/* Audit Correction Modal */}
          {correctingItem && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <Card className="w-full max-w-md bg-white border-slate-200 shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Audit Correction (Official Publication)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Official correction recorded in compliance audit log.
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
                          {correctingItem.earnedMarks !== null
                            ? Number(correctingItem.earnedMarks).toFixed(2)
                            : "0.00"}
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
                        className="font-mono text-xs bg-slate-50 border-slate-200"
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

export default function ExamOfficerGradingReviewDetailPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
          <div className="py-24 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
            <p className="text-sm">Loading examination grading details...</p>
          </div>
        </DashboardShell>
      }
    >
      <GradingReviewDetailContent />
    </Suspense>
  );
}
