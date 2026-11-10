"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resultApi } from "@/lib/api/result";
import { StudentCourseResults, StudentExamResult, StudentGradeDetail } from "@/types/result";
import { MathText } from "@/components/exam/MathText";
import {
  ChevronLeft,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  X,
  ShieldCheck,
  Clock,
  BookOpen,
  HelpCircle,
  Calendar,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";

function StudentExamDetailReviewContent() {
  const params = useParams();
  const courseOfferingId = params?.courseOfferingId ? Number(params.courseOfferingId) : null;
  const examId = params?.examId ? Number(params.examId) : null;

  const [courseResults, setCourseResults] = useState<StudentCourseResults[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await resultApi.getStudentResults();
        if (res.success && res.data) {
          setCourseResults(res.data);
        }
      } catch (err) {
        toast.error("Failed to load examination results.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [courseOfferingId, examId]);

  // Find course and examination record
  const currentCourse = useMemo(() => {
    if (!courseOfferingId) return null;
    return courseResults.find((c) => c.courseId === courseOfferingId) || null;
  }, [courseResults, courseOfferingId]);

  const currentExam = useMemo<StudentExamResult | null>(() => {
    if (!currentCourse || !examId) return null;
    return currentCourse.examinations?.find((e) => e.examinationId === examId) || null;
  }, [currentCourse, examId]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (!currentExam || !currentExam.details) {
      return { total: 0, correct: 0, partial: 0, incorrect: 0, scorePercent: 0 };
    }

    const details = currentExam.details;
    const total = details.length;
    let correct = 0;
    let partial = 0;
    let incorrect = 0;

    details.forEach((d) => {
      const awarded = d.awardedMarks !== null ? Number(d.awardedMarks) : 0;
      const max = d.maximumMarks !== null ? Number(d.maximumMarks) : 0;
      if (max > 0 && awarded >= max) {
        correct++;
      } else if (awarded > 0 && awarded < max) {
        partial++;
      } else {
        incorrect++;
      }
    });

    const scorePercent =
      currentExam.totalMarks > 0 && currentExam.earnedMarks !== null
        ? Math.round((Number(currentExam.earnedMarks) / Number(currentExam.totalMarks)) * 100)
        : 0;

    return { total, correct, partial, incorrect, scorePercent };
  }, [currentExam]);

  return (
    <DashboardShell allowedRoles={["ROLE_STUDENT", "ROLE_ADMIN"]}>
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Link href={`/student/courses/${courseOfferingId}`}>
            <Button variant="outline" size="sm" className="gap-2 bg-white border-slate-200 text-slate-700">
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Course Examinations</span>
            </Button>
          </Link>

          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            <span>My Courses</span> &gt;{" "}
            <span className="font-mono text-slate-800">{currentCourse?.courseCode || "COURSE"}</span> &gt;{" "}
            <span className="text-slate-800">{currentExam?.examinationTitle || "Examination"}</span> &gt;{" "}
            <span className="text-blue-600 font-semibold">Answer Review</span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-xs text-slate-500">Loading verified question and answer review...</p>
          </div>
        ) : !currentExam ? (
          <Card className="border-dashed border-2 border-slate-200 py-16 text-center bg-white rounded-2xl">
            <CardContent className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Examination Record Not Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Could not find examination results for the requested sitting. Please return to the course exams list.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Score & Publication Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-8 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-xs">
                        {currentCourse?.courseCode}
                      </span>
                      <Badge className="bg-emerald-500 text-white font-semibold text-xs border-0 gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Officer Approved & Published
                      </Badge>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{currentExam.examinationTitle}</h1>
                    <p className="text-xs text-blue-100 font-medium">
                      {currentCourse?.courseName} • Section Official Results
                    </p>
                  </div>

                  {/* Big Score Box */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 text-center sm:text-right shrink-0">
                    <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">
                      Awarded Marks
                    </span>
                    <div className="text-3xl sm:text-4xl font-black font-mono mt-0.5">
                      {currentExam.earnedMarks !== null ? Number(currentExam.earnedMarks).toFixed(2) : "0.00"}
                      <span className="text-base text-blue-200 font-normal">
                        {" "}
                        / {Number(currentExam.totalMarks).toFixed(2)}
                      </span>
                    </div>
                    <span className="inline-block mt-1 text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
                      {stats.scorePercent}% Score
                    </span>
                  </div>
                </div>
              </div>

              {/* Stat summary pills */}
              <div className="p-4 sm:p-6 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-slate-500" />
                    <span>
                      Total Questions: <strong className="text-slate-900">{stats.total}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Correct: <strong className="text-emerald-800">{stats.correct}</strong>
                    </span>
                  </div>
                  {stats.partial > 0 && (
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>
                        Partially Correct: <strong className="text-amber-800">{stats.partial}</strong>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-rose-700">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>
                      Incorrect: <strong className="text-rose-800">{stats.incorrect}</strong>
                    </span>
                  </div>
                </div>

                {currentExam.publishedAt && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Published: {new Date(currentExam.publishedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Answer Key Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Review Legend:
              </span>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <span>Correct Answer</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-400 flex items-center justify-center text-[10px] text-emerald-700 font-bold">
                    ✓
                  </span>
                  <span>Your Answer (Correct)</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-700">
                  <span className="w-4 h-4 rounded bg-rose-100 border border-rose-400 flex items-center justify-center text-[10px] text-rose-700 font-bold">
                    ✗
                  </span>
                  <span>Your Answer (Incorrect)</span>
                </div>
              </div>
            </div>

            {/* Question-by-Question List */}
            <div className="space-y-5">
              {currentExam.details?.map((item: StudentGradeDetail, idx: number) => {
                const awarded = item.awardedMarks !== null ? Number(item.awardedMarks) : 0;
                const max = item.maximumMarks !== null ? Number(item.maximumMarks) : 0;
                const isFullMarks = max > 0 && awarded >= max;
                const isPartialMarks = max > 0 && awarded > 0 && awarded < max;
                const isZeroMarks = awarded === 0;

                const options = item.options || [];

                return (
                  <Card
                    key={item.examQuestionId || idx}
                    className="bg-white border-slate-200 rounded-2xl overflow-hidden shadow-2xs transition-all"
                  >
                    {/* Question Header */}
                    <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                          Question {item.questionOrder ?? idx + 1}
                        </span>

                        {item.questionType && (
                          <Badge variant="outline" className="text-[10px] uppercase font-mono text-slate-600 bg-white">
                            {item.questionType.replace(/_/g, " ")}
                          </Badge>
                        )}

                        {item.isAutoGraded && (
                          <Badge className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px]">
                            Auto-Graded
                          </Badge>
                        )}
                      </div>

                      {/* Score Badge */}
                      <div className="flex items-center gap-3">
                        {isFullMarks ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs gap-1 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Correct
                          </Badge>
                        ) : isPartialMarks ? (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs gap-1 font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Partially Correct
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-xs gap-1 font-bold">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Incorrect
                          </Badge>
                        )}

                        <span className="font-mono font-bold text-slate-800 text-xs">
                          {awarded.toFixed(2)} / {max.toFixed(2)} Marks
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 sm:p-6 space-y-4">
                      {/* Question Text */}
                      <div className="text-sm font-semibold text-slate-900 leading-relaxed">
                        <MathText text={item.questionText} />
                      </div>

                      {/* Options / Choices List */}
                      {options.length > 0 ? (
                        <div className="space-y-2.5 pt-2">
                          {options.map((opt, optIdx) => {
                            const optionLetter = String.fromCharCode(65 + optIdx);
                            const isCorrect = Boolean(opt.isCorrect);
                            const isSelected = Boolean(opt.isSelectedByStudent);

                            let containerStyle =
                              "bg-white border-slate-200 text-slate-700 hover:border-slate-300";
                            let badgeLetterStyle = "bg-slate-100 text-slate-600";

                            if (isSelected && isCorrect) {
                              containerStyle =
                                "bg-emerald-50/80 border-emerald-500 shadow-2xs text-emerald-950 font-medium";
                              badgeLetterStyle = "bg-emerald-600 text-white font-bold";
                            } else if (isSelected && !isCorrect) {
                              containerStyle =
                                "bg-rose-50/80 border-rose-400 shadow-2xs text-rose-950 font-medium";
                              badgeLetterStyle = "bg-rose-600 text-white font-bold";
                            } else if (isCorrect && !isSelected) {
                              containerStyle =
                                "bg-emerald-50/30 border-emerald-400 border-dashed text-emerald-900 font-medium";
                              badgeLetterStyle = "bg-emerald-100 text-emerald-800 font-bold border border-emerald-300";
                            }

                            return (
                              <div
                                key={opt.id || optIdx}
                                className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border text-xs transition-all ${containerStyle}`}
                              >
                                <div className="flex items-start gap-3 flex-1">
                                  <span
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${badgeLetterStyle}`}
                                  >
                                    {optionLetter}
                                  </span>
                                  <div className="mt-0.5 flex-1">
                                    <MathText text={opt.optionText} />
                                    {opt.explanation && (
                                      <p className="text-[11px] text-slate-500 mt-1 italic">
                                        Note: {opt.explanation}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Status tags for this choice */}
                                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                  {isSelected && isCorrect && (
                                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-bold shadow-xs">
                                      <Check className="w-3 h-3" />
                                      Your Answer (Correct)
                                    </Badge>
                                  )}
                                  {isSelected && !isCorrect && (
                                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-bold shadow-xs">
                                      <X className="w-3 h-3" />
                                      Your Answer (Incorrect)
                                    </Badge>
                                  )}
                                  {isCorrect && !isSelected && (
                                    <Badge
                                      variant="outline"
                                      className="text-emerald-700 border-emerald-300 bg-emerald-50 text-[10px] gap-1 font-bold"
                                    >
                                      <Check className="w-3 h-3" />
                                      Correct Answer
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : item.studentAnswerText ? (
                        <div className="space-y-3 pt-2">
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                              Your Submitted Response:
                            </span>
                            <div className="text-xs text-slate-800 font-mono whitespace-pre-wrap">
                              {item.studentAnswerText}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Instructor / Grading Feedback */}
                      {item.feedback && (
                        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block font-bold text-blue-900">Instructor Evaluation Feedback:</strong>
                            <p className="mt-0.5 text-blue-900">{item.feedback}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function StudentExamDetailReviewPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell allowedRoles={["ROLE_STUDENT", "ROLE_ADMIN"]}>
          <div className="py-20 flex justify-center items-center">
            <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
        </DashboardShell>
      }
    >
      <StudentExamDetailReviewContent />
    </Suspense>
  );
}
