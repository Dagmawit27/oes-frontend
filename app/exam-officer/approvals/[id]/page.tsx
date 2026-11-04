"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { examApi } from "@/lib/api/exam";
import { Examination, ExamStatus, ExamApproval, ReviewExaminationRequest } from "@/types/exam";
import {
  ClipboardCheck,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Award,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  UserCheck,
  History,
  Lock,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

function ExamOfficerReviewContent() {
  const params = useParams();
  const router = useRouter();
  const examId = Number(params.id);

  const [exam, setExam] = useState<Examination | null>(null);
  const [approvals, setApprovals] = useState<ExamApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  // Review Dialog States
  const [decisionType, setDecisionType] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadExam = async () => {
    try {
      setLoading(true);
      const [res, appRes] = await Promise.all([
        examApi.getExaminationById(examId),
        examApi.getApprovals(examId),
      ]);
      if (res.success && res.data) {
        setExam(res.data);
      }
      if (appRes.success && appRes.data) {
        setApprovals(appRes.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load examination details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      loadExam();
    }
  }, [examId]);

  const handleExecuteDecision = async () => {
    if (!decisionType) return;

    if (decisionType === "REJECTED" && !reviewComments.trim()) {
      toast.error("Feedback comments are mandatory when rejecting an examination so the instructor can address issues.");
      return;
    }

    try {
      setSubmittingReview(true);
      const payload: ReviewExaminationRequest = {
        decision: decisionType,
        comments: reviewComments.trim() || undefined,
      };

      const res = await examApi.reviewExamination(examId, payload);
      if (res.success) {
        if (decisionType === "APPROVED") {
          toast.success("Examination approved! Immutable question snapshots have been generated.");
        } else {
          toast.info("Examination rejected with revision feedback provided to instructor.");
        }
        setDecisionType(null);
        setReviewComments("");
        loadExam();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record examination review decision");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Awaiting Review</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Rejected</Badge>;
      case "SCHEDULED":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-24 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
          <p className="text-sm">Loading examination for audit...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!exam) {
    return (
      <DashboardShell>
        <div className="py-24 text-center text-slate-500">
          <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-lg font-semibold">Examination not found</p>
          <Link href="/exam-officer/approvals">
            <Button className="mt-4 text-xs">Back to Approvals Queue</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/exam-officer/approvals">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{exam.title}</h1>
                {getStatusBadge(exam.status)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Instructor: <strong>{exam.createdByName}</strong> ({exam.createdByEmail}) &bull;{" "}
                {exam.courseCode} - {exam.courseName} (Sec {exam.section})
              </p>
            </div>
          </div>

          {/* Action Decision Buttons for Pending Examination */}
          {exam.status === "SUBMITTED" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setDecisionType("REJECTED")}
                className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50 gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                Reject with Feedback
              </Button>
              <Button
                onClick={() => setDecisionType("APPROVED")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-medium shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve Examination
              </Button>
            </div>
          )}

          {exam.status === "APPROVED" && (
            <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1.5 text-xs py-1.5 px-3">
              <Lock className="h-4 w-4" />
              Approved & Snapshotted
            </Badge>
          )}
        </div>

        {/* Examination Parameters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Duration</span>
                <span className="text-base font-bold text-slate-800">{exam.durationMinutes} mins</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Total Marks</span>
                <span className="text-base font-bold text-slate-800">{exam.totalMarks} Marks</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Passing Marks</span>
                <span className="text-base font-bold text-slate-800">{exam.passingMarks} Marks</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Questions</span>
                <span className="text-base font-bold text-slate-800">{exam.questionCount} Items</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions & Controls Audit */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-semibold text-slate-800">Student Instructions & Integrity Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Student Instructions</span>
              <pre className="text-slate-600 font-sans whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                {exam.instructions || "Standard examination guidelines apply."}
              </pre>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">Attempt Limit</span>
                <span className="font-medium text-slate-700">{exam.attemptLimit} Attempt(s)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Randomize Questions</span>
                <span className="font-medium text-slate-700">{exam.randomizeQuestions ? "Yes" : "No"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Randomize Options</span>
                <span className="font-medium text-slate-700">{exam.randomizeOptions ? "Yes" : "No"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Negative Marking</span>
                <span className="font-medium text-slate-700">
                  {exam.negativeMarkingEnabled ? `-${exam.negativeMarkValue}` : "Disabled"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Full Questions Audit with Answer Keys */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Examination Question Audit ({exam.questions?.length || 0})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Verify question accuracy, answer keys, marks weightage, and explanations.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              Total: {exam.totalMarks} Marks
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            {!exam.questions || exam.questions.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">No questions found in this examination.</p>
            ) : (
              <div className="space-y-3">
                {exam.questions.map((q) => (
                  <div
                    key={q.questionId}
                    className="border border-slate-200 rounded-lg overflow-hidden bg-white"
                  >
                    <div
                      onClick={() => setExpandedQuestionId(expandedQuestionId === q.questionId ? null : q.questionId)}
                      className="p-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="h-6 w-6 rounded bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {q.questionOrder}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge className="text-[10px] bg-slate-100 text-slate-700 py-0 border-0">
                              {q.questionType?.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 leading-snug">
                            {q.questionText}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-xs">
                          {q.marks} Marks
                        </Badge>
                        {expandedQuestionId === q.questionId ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Question Answers & Keys */}
                    {expandedQuestionId === q.questionId && (
                      <div className="p-3 bg-slate-50/70 border-t border-slate-200 text-xs space-y-2">
                        {q.options && q.options.length > 0 ? (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-500 block">Options & Verified Answer Key:</span>
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={opt.id || optIdx}
                                className={`p-2 rounded border text-xs flex items-center justify-between ${
                                  opt.isCorrect
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                                    : "bg-white border-slate-200 text-slate-700"
                                }`}
                              >
                                <span>
                                  {String.fromCharCode(65 + optIdx)}. {opt.optionText}
                                </span>
                                {opt.isCorrect && (
                                  <Badge className="bg-emerald-600 text-white text-[10px] py-0 border-0">
                                    Correct Answer Key
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No predefined options (Short Answer / Essay question evaluated manually).</p>
                        )}

                        {q.explanation && (
                          <div className="mt-2 p-2.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-900">
                            <strong>Official Teacher Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prior Review Audit Trail */}
        {approvals.length > 0 && (
          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-sm font-semibold text-slate-800">Historical Review Audits</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {approvals.map((app) => (
                  <div key={app.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {app.decision === "APPROVED" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-0">APPROVED</Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 border-0">REJECTED</Badge>
                        )}
                        <span className="font-semibold text-slate-800">{app.reviewerName}</span>
                        <span className="text-[11px] text-slate-400">({app.reviewerEmail})</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(app.reviewedAt).toLocaleString()}
                      </span>
                    </div>
                    {app.comments && (
                      <p className="text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">
                        "{app.comments}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decision Modal (Approve or Reject) */}
        {decisionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-3 mb-3">
                {decisionType === "APPROVED" ? (
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                ) : (
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                    <XCircle className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {decisionType === "APPROVED" ? "Approve Examination" : "Reject Examination"}
                  </h3>
                  <p className="text-xs text-slate-500">Exam: {exam.title}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {decisionType === "APPROVED"
                  ? "Approving this examination will lock the question snapshots and authorize it for scheduling. Future modifications to the question bank will not affect this approved version."
                  : "Rejecting this examination will send it back to the instructor for required modifications. You must provide specific revision feedback below."}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reviewer Comments {decisionType === "REJECTED" && <span className="text-rose-500">* (Mandatory)</span>}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    decisionType === "APPROVED"
                      ? "Optional remarks or approval note..."
                      : "Explain what questions need adjustment, marks imbalances, or changes required..."
                  }
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDecisionType(null);
                    setReviewComments("");
                  }}
                  disabled={submittingReview}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExecuteDecision}
                  disabled={submittingReview}
                  className={`text-xs gap-1.5 text-white ${
                    decisionType === "APPROVED"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submittingReview
                    ? "Recording..."
                    : decisionType === "APPROVED"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function ExamOfficerReviewPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="py-24 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
            <p className="text-sm">Loading examination review...</p>
          </div>
        </DashboardShell>
      }
    >
      <ExamOfficerReviewContent />
    </Suspense>
  );
}
