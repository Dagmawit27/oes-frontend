"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { examApi } from "@/lib/api/exam";
import { Examination, ExamStatus, ExamQuestion, ExamApproval } from "@/types/exam";
import {
  FileText,
  ArrowLeft,
  Edit3,
  Send,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  History,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

function ExaminationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const examId = Number(params.id);

  const [exam, setExam] = useState<Examination | null>(null);
  const [approvals, setApprovals] = useState<ExamApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmitForReview = async () => {
    if (!exam) return;
    try {
      setSubmitting(true);
      const res = await examApi.submitExamination(exam.id);
      if (res.success) {
        toast.success("Examination submitted for review!");
        loadExam();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit examination");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending Review</Badge>;
      case "DRAFT":
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Draft</Badge>;
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
          <p className="text-sm">Loading examination details...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!exam) {
    return (
      <DashboardShell>
        <div className="py-24 text-center text-slate-500">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-lg font-semibold">Examination not found</p>
          <Link href="/instructor/examinations">
            <Button className="mt-4 text-xs">Back to Examinations</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Top Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/instructor/examinations">
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
                {exam.courseCode} - {exam.courseName} (Section {exam.section}) &bull; {exam.semesterName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(exam.status === "DRAFT" || exam.status === "REJECTED") && (
              <>
                <Link href={`/instructor/examinations/${exam.id}/edit`}>
                  <Button variant="outline" className="text-xs gap-1.5">
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Examination
                  </Button>
                </Link>
                <Button
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </Button>
              </>
            )}
            {exam.status === "APPROVED" && (
              <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1 text-xs py-1 px-3">
                <Lock className="h-3.5 w-3.5" />
                Examination Locked & Snapshotted
              </Badge>
            )}
          </div>
        </div>

        {/* Rejection Alert Banner (if exam was rejected by Exam Officer) */}
        {exam.status === "REJECTED" && approvals.length > 0 && (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-900">Revision Required by Exam Officer</h3>
                <p className="text-xs text-rose-800 font-medium">
                  Reviewer: {approvals[0].reviewerName} ({new Date(approvals[0].reviewedAt).toLocaleString()})
                </p>
                <p className="text-xs text-rose-700 mt-2 bg-white/70 p-2.5 rounded border border-rose-200">
                  "{approvals[0].comments}"
                </p>
                <p className="text-[11px] text-rose-600 mt-1">
                  Click "Edit Examination" above to adjust questions or marks, then resubmit for approval.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
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

        {/* Exam Description & Instructions */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-semibold text-slate-800">Instructions & Exam Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            {exam.description && (
              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Description</span>
                <p className="text-slate-600 leading-relaxed">{exam.description}</p>
              </div>
            )}
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Student Instructions</span>
              <pre className="text-slate-600 font-sans whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                {exam.instructions || "No custom instructions provided."}
              </pre>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">Attempt Limit</span>
                <span className="font-medium text-slate-700">{exam.attemptLimit} Attempt(s)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Randomize Questions</span>
                <span className="font-medium text-slate-700">{exam.randomizeQuestions ? "Enabled" : "Disabled"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Randomize Options</span>
                <span className="font-medium text-slate-700">{exam.randomizeOptions ? "Enabled" : "Disabled"}</span>
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

        {/* Selected Questions List */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Examination Questions ({exam.questions?.length || 0})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Questions assigned to this examination with calibrated marks.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              Sum: {exam.totalMarks} Marks
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            {!exam.questions || exam.questions.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">No questions attached to this examination.</p>
            ) : (
              <div className="space-y-3">
                {exam.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/30"
                  >
                    <div
                      onClick={() => setExpandedQuestionId(expandedQuestionId === q.questionId ? null : q.questionId)}
                      className="p-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="h-6 w-6 rounded bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {q.questionOrder}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge className="text-[10px] bg-slate-200 text-slate-700 py-0 border-0">
                              {q.questionType?.replace("_", " ") || "QUESTION"}
                            </Badge>
                            {q.difficultyLevel && (
                              <Badge className="text-[10px] bg-emerald-100 text-emerald-800 py-0 border-0">
                                {q.difficultyLevel}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 leading-snug">
                            {q.questionText}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-xs">
                          {q.marks} M
                        </Badge>
                        {expandedQuestionId === q.questionId ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Options Preview */}
                    {expandedQuestionId === q.questionId && (
                      <div className="p-3 bg-white border-t border-slate-200 text-xs space-y-2">
                        {q.options && q.options.length > 0 ? (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-500 block">Options & Answers:</span>
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={opt.id || optIdx}
                                className={`p-2 rounded border text-xs flex items-center justify-between ${
                                  opt.isCorrect
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-medium"
                                    : "bg-slate-50 border-slate-200 text-slate-700"
                                }`}
                              >
                                <span>
                                  {String.fromCharCode(65 + optIdx)}. {opt.optionText}
                                </span>
                                {opt.isCorrect && (
                                  <Badge className="bg-emerald-600 text-white text-[10px] py-0 border-0">
                                    Correct Answer
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No option choices (Short answer / Essay).</p>
                        )}

                        {q.explanation && (
                          <div className="mt-2 p-2 bg-indigo-50 rounded border border-indigo-100 text-[11px] text-indigo-800">
                            <strong>Explanation:</strong> {q.explanation}
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

        {/* Approval History Audit Log */}
        {approvals.length > 0 && (
          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-sm font-semibold text-slate-800">Review & Approval History</CardTitle>
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
      </div>
    </DashboardShell>
  );
}

export default function ExaminationDetailPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="py-24 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
            <p className="text-sm">Loading examination...</p>
          </div>
        </DashboardShell>
      }
    >
      <ExaminationDetailContent />
    </Suspense>
  );
}
