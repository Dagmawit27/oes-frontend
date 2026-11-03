"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resultApi } from "@/lib/api/result";
import { AttemptGrading, SaveGradeItemRequest } from "@/types/result";
import { MathText } from "@/components/exam/MathText";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  HelpCircle,
  Save,
  Send,
  User,
  GraduationCap,
  AlertTriangle,
  FileText,
  Check,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

function AttemptGradingContent() {
  const params = useParams();
  const router = useRouter();
  const attemptId = Number(params?.attemptId);

  const [gradingData, setGradingData] = useState<AttemptGrading | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Local state for question grading entries: map from examQuestionId to { awardedMarks, feedback }
  const [gradeInputs, setGradeInputs] = useState<
    Record<number, { awardedMarks: string; feedback: string }>
  >({});

  useEffect(() => {
    if (attemptId) {
      loadGradingCanvas(attemptId);
    }
  }, [attemptId]);

  const loadGradingCanvas = async (id: number) => {
    setLoading(true);
    try {
      const res = await resultApi.getAttemptGrading(id);
      if (res.success && res.data) {
        setGradingData(res.data);

        // Initialize local state
        const initialInputs: Record<number, { awardedMarks: string; feedback: string }> = {};
        res.data.questions.forEach((q) => {
          initialInputs[q.examQuestionId] = {
            awardedMarks: q.awardedMarks !== null ? q.awardedMarks.toString() : "",
            feedback: q.feedback || "",
          };
        });
        setGradeInputs(initialInputs);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load candidate grading canvas.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarksChange = (examQuestionId: number, value: string) => {
    setGradeInputs((prev) => ({
      ...prev,
      [examQuestionId]: {
        ...prev[examQuestionId],
        awardedMarks: value,
      },
    }));
  };

  const handleFeedbackChange = (examQuestionId: number, value: string) => {
    setGradeInputs((prev) => ({
      ...prev,
      [examQuestionId]: {
        ...prev[examQuestionId],
        feedback: value,
      },
    }));
  };

  // Build payload
  const buildPayload = (): SaveGradeItemRequest[] => {
    return Object.entries(gradeInputs).map(([eqIdStr, data]) => {
      const eqId = Number(eqIdStr);
      const marks = data.awardedMarks.trim() === "" ? null : parseFloat(data.awardedMarks);
      return {
        examQuestionId: eqId,
        awardedMarks: marks !== null && !isNaN(marks) ? marks : null,
        feedback: data.feedback.trim() || undefined,
      };
    });
  };

  const validateAllMarksEntered = (): boolean => {
    if (!gradingData) return false;
    for (const q of gradingData.questions) {
      const input = gradeInputs[q.examQuestionId];
      if (!input || input.awardedMarks.trim() === "") {
        toast.error(`Please assign a mark for question Q${q.questionOrder} before completing grading.`);
        return false;
      }
      const val = parseFloat(input.awardedMarks);
      if (isNaN(val) || val < 0) {
        toast.error(`Invalid mark for question Q${q.questionOrder}. Must be non-negative.`);
        return false;
      }
      if (q.maximumMarks !== null && val > q.maximumMarks) {
        toast.error(
          `Mark for Q${q.questionOrder} (${val}) exceeds maximum available marks (${q.maximumMarks}).`
        );
        return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const grades = buildPayload();
      const res = await resultApi.saveDraftGrades(attemptId, { grades });
      if (res.success && res.data) {
        toast.success("Draft evaluation scores and feedback saved.");
        setGradingData(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save draft evaluation.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleCompleteGrading = async () => {
    if (!validateAllMarksEntered()) return;

    setCompleting(true);
    try {
      // First save current inputs
      const grades = buildPayload();
      await resultApi.saveDraftGrades(attemptId, { grades });

      // Then call complete grading
      const res = await resultApi.completeGrading(attemptId);
      if (res.success && res.data) {
        toast.success("Grading completed and finalized successfully!");
        setGradingData(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to finalize grading.");
    } finally {
      setCompleting(false);
    }
  };

  // Compute live current total marks earned from inputs
  const currentEarnedTotal = Object.values(gradeInputs).reduce((sum, item) => {
    const parsed = parseFloat(item.awardedMarks);
    return !isNaN(parsed) && parsed > 0 ? sum + parsed : sum;
  }, 0);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
        <DashboardShell>
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            <p className="text-sm text-slate-500 font-medium">Loading candidate examination canvas...</p>
          </div>
        </DashboardShell>
      </ProtectedRoute>
    );
  }

  if (!gradingData) {
    return (
      <ProtectedRoute allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
        <DashboardShell>
          <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Attempt Record Not Found</h2>
            <p className="text-slate-500 text-sm">
              The requested candidate attempt does not exist or you lack grading authorization.
            </p>
            <Button onClick={() => router.push("/instructor/results")}>Return to Results</Button>
          </div>
        </DashboardShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6 max-w-5xl mx-auto pb-24">
          {/* Top Bar with Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/instructor/results")}
              className="gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Candidate Roster
            </Button>

            <div className="flex items-center gap-2">
              <Badge
                className={
                  gradingData.gradingStatus === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : gradingData.gradingStatus === "IN_PROGRESS"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }
              >
                {gradingData.gradingStatus === "COMPLETED"
                  ? "Grading Completed"
                  : gradingData.gradingStatus === "IN_PROGRESS"
                  ? "Draft In Progress"
                  : "Grading Pending"}
              </Badge>
              <Badge variant="outline" className="border-slate-200">
                {gradingData.publicationStatus === "PUBLISHED" ? "Published" : "Draft (Unpublished)"}
              </Badge>
            </div>
          </div>

          {/* Candidate & Exam Summary Card */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <h2 className="text-xl font-bold text-slate-900">{gradingData.studentName}</h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      {gradingData.registrationNumber}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">
                    Exam: <span className="font-semibold text-slate-800">{gradingData.examTitle}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Submitted:{" "}
                    {gradingData.submittedAt
                      ? new Date(gradingData.submittedAt).toLocaleString()
                      : "Not recorded"}
                  </p>
                </div>

                {/* Total Marks Banner */}
                <div className="flex items-center gap-6 bg-slate-50 px-6 py-4 rounded-xl border border-slate-200/60 text-right">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Calculated Marks
                    </p>
                    <p className="text-2xl font-bold font-mono text-slate-900">
                      <span className="text-primary">{currentEarnedTotal.toFixed(2)}</span>
                      <span className="text-slate-400 text-base font-normal">
                        {" "}
                        / {Number(gradingData.totalMarks).toFixed(2)}
                      </span>
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Award className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions Grading List */}
          <div className="space-y-6">
            {gradingData.questions.map((q) => {
              const input = gradeInputs[q.examQuestionId] || { awardedMarks: "", feedback: "" };
              const isObjective =
                q.questionType === "SINGLE_CHOICE" ||
                q.questionType === "MULTIPLE_CHOICE" ||
                q.questionType === "TRUE_FALSE";
              const isNumeric = input.awardedMarks.trim() !== "";
              const numVal = isNumeric ? parseFloat(input.awardedMarks) : null;
              const hasError =
                numVal !== null &&
                (numVal < 0 || (q.maximumMarks !== null && numVal > q.maximumMarks));

              return (
                <Card
                  key={q.examQuestionId}
                  className={`border transition shadow-xs ${
                    hasError
                      ? "border-rose-300 ring-1 ring-rose-300"
                      : "border-slate-200"
                  }`}
                >
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          Question {q.questionOrder}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {q.questionType.replace(/_/g, " ")}
                        </Badge>
                        {q.isAutoGraded && (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                            Auto-Graded
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs font-mono font-medium text-slate-600">
                        Max Marks:{" "}
                        <span className="font-bold text-slate-900">
                          {q.maximumMarks !== null ? Number(q.maximumMarks).toFixed(2) : "—"}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-5">
                    {/* Question Text */}
                    <div className="text-slate-900 font-medium text-base leading-relaxed">
                      <MathText text={q.questionText} />
                    </div>

                    {/* Objective Questions Options Display */}
                    {isObjective && q.options && q.options.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Options & Candidate Selection
                        </p>
                        <div className="space-y-2">
                          {q.options.map((opt) => {
                            const isSelected = opt.isSelectedByStudent;
                            const isCorrect = opt.isCorrect;

                            return (
                              <div
                                key={opt.id}
                                className={`p-3 rounded-lg border text-sm flex items-center justify-between transition ${
                                  isSelected && isCorrect
                                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                                    : isSelected && !isCorrect
                                    ? "bg-rose-50/80 border-rose-300 text-rose-950"
                                    : isCorrect
                                    ? "bg-slate-50 border-emerald-200 text-slate-800"
                                    : "bg-white border-slate-200 text-slate-700"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                      isSelected
                                        ? isCorrect
                                          ? "bg-emerald-600 text-white"
                                          : "bg-rose-600 text-white"
                                        : "border border-slate-300 text-slate-500"
                                    }`}
                                  >
                                    {String.fromCharCode(65 + opt.optionOrder - 1)}
                                  </div>
                                  <MathText text={opt.optionText} />
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {isSelected && (
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] ${
                                        isCorrect
                                          ? "border-emerald-400 text-emerald-700 bg-emerald-50"
                                          : "border-rose-400 text-rose-700 bg-rose-50"
                                      }`}
                                    >
                                      Selected by Student
                                    </Badge>
                                  )}
                                  {isCorrect && (
                                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                                      <Check className="h-3 w-3" /> Correct Key
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Subjective Candidate Answer Text */}
                    {!isObjective && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Candidate Submitted Response
                        </p>
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 leading-relaxed min-h-[90px] whitespace-pre-wrap">
                          {q.studentAnswerText || (
                            <span className="text-slate-400 italic">No answer submitted by candidate.</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Instructor Scoring Inputs */}
                    <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Awarded Marks (out of {q.maximumMarks !== null ? Number(q.maximumMarks).toFixed(2) : "—"})
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={q.maximumMarks || 100}
                          value={input.awardedMarks}
                          onChange={(e) => handleMarksChange(q.examQuestionId, e.target.value)}
                          placeholder="e.g. 5.00"
                          className={`font-mono text-sm ${hasError ? "border-rose-500 focus:ring-rose-500" : ""}`}
                        />
                        {hasError && (
                          <p className="text-[11px] text-rose-600 mt-1">
                            Marks must be between 0 and {q.maximumMarks}.
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Instructor Feedback / Notes (Optional)
                        </label>
                        <Input
                          type="text"
                          value={input.feedback}
                          onChange={(e) => handleFeedbackChange(q.examQuestionId, e.target.value)}
                          placeholder="Provide specific constructive feedback to the candidate..."
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-6 shadow-lg">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Evaluated Total:
                </span>
                <span className="font-mono text-xl font-bold text-slate-900">
                  {currentEarnedTotal.toFixed(2)}{" "}
                  <span className="text-slate-400 text-sm font-normal">
                    / {Number(gradingData.totalMarks).toFixed(2)}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={savingDraft || completing}
                  className="gap-2 border-slate-300"
                >
                  <Save className="h-4 w-4" />
                  {savingDraft ? "Saving..." : "Save Draft"}
                </Button>

                <Button
                  size="sm"
                  onClick={handleCompleteGrading}
                  disabled={savingDraft || completing}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {completing ? "Finalizing..." : "Complete & Finalize Grading"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}

export default function AttemptGradingPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="flex h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DashboardShell>
      }
    >
      <AttemptGradingContent />
    </Suspense>
  );
}
