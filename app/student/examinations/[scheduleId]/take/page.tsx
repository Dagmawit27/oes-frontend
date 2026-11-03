"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { executionApi } from "@/lib/api/execution";
import {
  ExamExecutionPayload,
  ExamQuestionDelivery,
  StudentAnswer,
  ExamSubmissionResult,
} from "@/types/execution";
import { MathText } from "@/components/exam/MathText";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Clock,
  Flag,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Send,
  HelpCircle,
  Check,
  ShieldAlert,
  ArrowLeft,
  FileCheck2,
  Loader2,
} from "lucide-react";

interface AnswerState {
  selectedOptionIds: number[];
  answerText: string;
  isFlagged: boolean;
  syncStatus: "synced" | "saving" | "unsaved" | "error";
}

function ExamRunnerContent() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = Number(params?.scheduleId);

  // Core examination state
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<ExamExecutionPayload | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});

  // Session & proctoring state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<ExamSubmissionResult | null>(null);
  const [tabBlurCount, setTabBlurCount] = useState(0);

  // Debounce ref for text answers
  const saveTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});

  // 1. Initial Load: Start or resume exam
  useEffect(() => {
    if (!scheduleId || isNaN(scheduleId)) {
      toast.error("Invalid examination schedule specified.");
      router.push("/student/examinations");
      return;
    }

    const loadExam = async () => {
      try {
        setLoading(true);
        const res = await executionApi.startOrResumeExam(scheduleId);
        if (res.success && res.data) {
          const payload = res.data;
          setExamData(payload);

          // Populate initial answer states from savedAnswers
          const initialAnswers: Record<number, AnswerState> = {};
          payload.questions.forEach((q) => {
            const saved = payload.savedAnswers?.find(
              (a) => a.examQuestionId === q.examQuestionId
            );
            initialAnswers[q.examQuestionId] = {
              selectedOptionIds: saved?.selectedOptionIds || [],
              answerText: saved?.answerText || "",
              isFlagged: saved?.isFlagged || false,
              syncStatus: "synced",
            };
          });
          setAnswers(initialAnswers);

          // Calculate initial remaining seconds
          const deadline = new Date(payload.deadlineAt).getTime();
          const now = payload.serverCurrentTime
            ? new Date(payload.serverCurrentTime).getTime()
            : Date.now();
          const remainingSecs = Math.max(0, Math.floor((deadline - now) / 1000));
          setTimeRemaining(remainingSecs);
        } else {
          toast.error(res.message || "Failed to initiate examination.");
          router.push("/student/examinations");
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(
          error.response?.data?.message ||
            "Unable to start examination. Please check schedule eligibility."
        );
        router.push("/student/examinations");
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [scheduleId, router]);

  // 2. High-precision Timer Countdown
  useEffect(() => {
    if (timeRemaining === null || submissionResult) return;

    if (timeRemaining <= 0) {
      toast.warning("Official examination deadline reached. Auto-submitting answers...");
      handleFinalSubmit(true);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, submissionResult]);

  // 3. Telemetry & Proctoring Listeners
  useEffect(() => {
    if (!examData || submissionResult) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabBlurCount((c) => c + 1);
        executionApi.logEvent(examData.attemptId, {
          eventType: "TAB_BLUR",
          payload: `Tab blur event detected at ${new Date().toISOString()}`,
        });
        toast.warning("Warning: Leaving or switching exam browser tabs is strictly logged.", {
          duration: 4000,
        });
      }
    };

    const handleResize = () => {
      executionApi.logEvent(examData.attemptId, {
        eventType: "WINDOW_RESIZED",
        payload: `Window resized to ${window.innerWidth}x${window.innerHeight}`,
      });
    };

    const handleOnline = () => {
      setIsOnline(true);
      executionApi.logEvent(examData.attemptId, {
        eventType: "RECONNECTED",
        payload: "Network connection restored",
      });
      toast.success("Network connection restored. Answer synchronization resumed.");
    };

    const handleOffline = () => {
      setIsOnline(false);
      executionApi.logEvent(examData.attemptId, {
        eventType: "DISCONNECTED",
        payload: "Network connection lost",
      });
      toast.error("Network disconnected! Local changes will synchronize upon reconnection.");
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleResize);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [examData, submissionResult]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // 4. Autosave Handler
  const triggerSave = useCallback(
    async (
      examQuestionId: number,
      selectedOptionIds: number[],
      answerText: string,
      isFlagged: boolean
    ) => {
      if (!examData) return;

      setAnswers((prev) => ({
        ...prev,
        [examQuestionId]: {
          selectedOptionIds,
          answerText,
          isFlagged,
          syncStatus: "saving",
        },
      }));

      try {
        await executionApi.saveAnswer(examData.attemptId, {
          examQuestionId,
          selectedOptionIds,
          answerText,
          isFlagged,
        });

        setAnswers((prev) => ({
          ...prev,
          [examQuestionId]: {
            ...prev[examQuestionId],
            syncStatus: "synced",
          },
        }));
      } catch (err) {
        console.error("Autosave failed", err);
        setAnswers((prev) => ({
          ...prev,
          [examQuestionId]: {
            ...prev[examQuestionId],
            syncStatus: "error",
          },
        }));
        toast.error("Autosave warning: could not sync answer to server. Retrying...");
      }
    },
    [examData]
  );

  // Current Question Helpers
  const currentQuestion: ExamQuestionDelivery | undefined =
    examData?.questions[currentIndex];

  const currentAnswerState: AnswerState =
    currentQuestion && answers[currentQuestion.examQuestionId]
      ? answers[currentQuestion.examQuestionId]
      : {
          selectedOptionIds: [],
          answerText: "",
          isFlagged: false,
          syncStatus: "synced",
        };

  // Option Click Handler
  const handleSelectOption = (optionId: number) => {
    if (!currentQuestion || submissionResult) return;

    let updatedOptions: number[];
    if (
      currentQuestion.questionType === "SINGLE_CHOICE" ||
      currentQuestion.questionType === "TRUE_FALSE"
    ) {
      updatedOptions = [optionId];
    } else {
      // Multiple Choice
      const exists = currentAnswerState.selectedOptionIds.includes(optionId);
      if (exists) {
        updatedOptions = currentAnswerState.selectedOptionIds.filter((id) => id !== optionId);
      } else {
        updatedOptions = [...currentAnswerState.selectedOptionIds, optionId];
      }
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.examQuestionId]: {
        ...currentAnswerState,
        selectedOptionIds: updatedOptions,
        syncStatus: "saving",
      },
    }));

    triggerSave(
      currentQuestion.examQuestionId,
      updatedOptions,
      currentAnswerState.answerText,
      currentAnswerState.isFlagged
    );
  };

  // Text Answer Change Handler (debounced)
  const handleTextChange = (text: string) => {
    if (!currentQuestion || submissionResult) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.examQuestionId]: {
        ...currentAnswerState,
        answerText: text,
        syncStatus: "unsaved",
      },
    }));

    if (saveTimeoutRef.current[currentQuestion.examQuestionId]) {
      clearTimeout(saveTimeoutRef.current[currentQuestion.examQuestionId]);
    }

    saveTimeoutRef.current[currentQuestion.examQuestionId] = setTimeout(() => {
      triggerSave(
        currentQuestion.examQuestionId,
        currentAnswerState.selectedOptionIds,
        text,
        currentAnswerState.isFlagged
      );
    }, 600);
  };

  // Toggle Flag Question
  const handleToggleFlag = () => {
    if (!currentQuestion || submissionResult) return;

    const nextFlag = !currentAnswerState.isFlagged;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.examQuestionId]: {
        ...currentAnswerState,
        isFlagged: nextFlag,
        syncStatus: "saving",
      },
    }));

    triggerSave(
      currentQuestion.examQuestionId,
      currentAnswerState.selectedOptionIds,
      currentAnswerState.answerText,
      nextFlag
    );

    toast.info(nextFlag ? "Question flagged for review." : "Question unflagged.");
  };

  // Clear Answer
  const handleClearAnswer = () => {
    if (!currentQuestion || submissionResult) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.examQuestionId]: {
        ...currentAnswerState,
        selectedOptionIds: [],
        answerText: "",
        syncStatus: "saving",
      },
    }));

    triggerSave(currentQuestion.examQuestionId, [], "", currentAnswerState.isFlagged);
    toast.info("Answer cleared.");
  };

  // Submission Handler
  const handleFinalSubmit = async (autoExpire: boolean = false) => {
    if (!examData || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await executionApi.submitExam(examData.attemptId);
      if (res.success && res.data) {
        setSubmissionResult(res.data);
        setShowSubmitModal(false);
        if (autoExpire) {
          toast.warning("Examination deadline expired. Final answers locked.");
        } else {
          toast.success("Examination successfully submitted and locked!");
        }
      } else {
        toast.error(res.message || "Failed to submit examination.");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to submit examination.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute Statistics
  const stats = useMemo(() => {
    if (!examData) return { total: 0, answered: 0, unanswered: 0, flagged: 0, percentage: 0 };
    const total = examData.questions.length;
    let answered = 0;
    let flagged = 0;

    examData.questions.forEach((q) => {
      const a = answers[q.examQuestionId];
      const hasOption = a?.selectedOptionIds && a.selectedOptionIds.length > 0;
      const hasText = a?.answerText && a.answerText.trim().length > 0;
      if (hasOption || hasText) {
        answered++;
      }
      if (a?.isFlagged) {
        flagged++;
      }
    });

    const unanswered = Math.max(0, total - answered);
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
    return { total, answered, unanswered, flagged, percentage };
  }, [examData, answers]);

  // Format Countdown String
  const formattedCountdown = useMemo(() => {
    if (timeRemaining === null) return "00:00:00";
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }, [timeRemaining]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <h2 className="text-xl font-bold text-slate-800">Entering Examination Hall...</h2>
        <p className="text-xs text-slate-500 max-w-sm text-center">
          Verifying security clearance, loading randomized test items, and synchronizing official
          server clocks.
        </p>
      </div>
    );
  }

  // Submission Receipt Screen
  if (submissionResult) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-xl bg-white shadow-xl rounded-3xl border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileCheck2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black">Examination Completed</h2>
            <p className="text-blue-100 text-xs mt-1">
              Your examination attempt has been officially recorded and locked.
            </p>
          </div>

          <CardContent className="p-8 space-y-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Examination Title</span>
                <span className="font-bold text-slate-900">{submissionResult.examinationTitle}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Attempt Reference ID</span>
                <span className="font-mono font-bold text-blue-600">
                  ATT-#{submissionResult.attemptId}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Questions Completed</span>
                <span className="font-bold text-slate-900">
                  {submissionResult.answeredQuestions} of {submissionResult.totalQuestions}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Submission Timestamp</span>
                <span className="font-medium text-slate-700">
                  {new Date(submissionResult.submittedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Attempt Status</span>
                <Badge className="bg-emerald-600 text-white">
                  {submissionResult.status}
                </Badge>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950">
                <span className="font-bold block">Submission Acknowledged</span>
                Your responses have been securely archived in PostgreSQL and queued for automated
                and instructor evaluation. You may safely exit this window.
              </div>
            </div>

            <Button
              onClick={() => router.push("/student/examinations")}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm"
            >
              Return to Student Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!examData || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">No Examination Content Available</h2>
          <Button onClick={() => router.push("/student/examinations")} className="mt-4">
            Back to Portal
          </Button>
        </div>
      </div>
    );
  }

  // Active sync status indicator text
  const isAnySaving = Object.values(answers).some((a) => a.syncStatus === "saving");

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans select-none">
      {/* 1. DISTRACTION-FREE TOP HEADER */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Brand / Logo (matching mockup "EXAMORA") */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <span className="font-black text-xl tracking-tight text-slate-900">
            EXAMORA
          </span>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {tabBlurCount > 0 && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-800 text-[11px] gap-1 px-2.5 py-1"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>{tabBlurCount} Warning(s)</span>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-slate-600 hover:text-slate-900 rounded-lg h-9 w-9 p-0"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSubmitModal(true)}
            className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50"
          >
            Finish & Submit
          </Button>
        </div>
      </header>

      {/* 2. MAIN TEST TAKING CANVAS */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: ACTIVE QUESTION CARD (Mockup left canvas) */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* Course Title & Progress Bar Header */}
                <div className="space-y-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      {examData.courseName || examData.examinationTitle}
                    </h2>
                    <Badge variant="outline" className="text-xs font-bold border-blue-200 text-blue-700 bg-blue-50/50">
                      {currentQuestion.marks} Marks
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-500">
                        Question {currentIndex + 1} of {examData.questions.length}
                      </span>
                      <span className="text-blue-600 font-bold">
                        {stats.percentage}% Completed
                      </span>
                    </div>

                    {/* Progress Bar (Crisp blue fill) */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Question Statement (Supports mathematical formulas like If f(x) = 2x² - 3x + 5, what is f(2)?) */}
                <div className="py-2">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
                    <MathText text={currentQuestion.questionText} />
                  </h3>
                </div>

                {/* Options / Text Input Section */}
                <div className="space-y-3 pt-2">
                  {/* Single Choice / Multiple Choice / True-False Options */}
                  {(currentQuestion.questionType === "SINGLE_CHOICE" ||
                    currentQuestion.questionType === "MULTIPLE_CHOICE" ||
                    currentQuestion.questionType === "TRUE_FALSE") && (
                    <div className="space-y-2.5">
                      {currentQuestion.options.map((opt, idx) => {
                        const isSelected = currentAnswerState.selectedOptionIds.includes(opt.id);
                        const letterLabel = String.fromCharCode(65 + idx); // A, B, C, D...

                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectOption(opt.id)}
                            className={`p-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? "bg-blue-50/70 border-blue-600 ring-1 ring-blue-600 text-blue-950 font-semibold shadow-xs"
                                : "bg-white border-slate-200/90 text-slate-800 hover:border-blue-300 hover:bg-slate-50/50"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 flex-1">
                              {/* Option Selector Pill / Radio Circle */}
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                  isSelected
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>

                              <span className="text-slate-400 font-bold text-xs">
                                {letterLabel}.
                              </span>

                              <div className="text-slate-900 flex-1">
                                <MathText text={opt.optionText} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer / Essay Question */}
                  {(currentQuestion.questionType === "SHORT_ANSWER" ||
                    currentQuestion.questionType === "ESSAY") && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Your Written Response ({currentQuestion.questionType === "ESSAY" ? "Detailed Essay" : "Short Answer"})
                      </label>
                      <textarea
                        rows={currentQuestion.questionType === "ESSAY" ? 8 : 4}
                        value={currentAnswerState.answerText || ""}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder="Type your structured answer here. Answers are automatically saved as you write..."
                        className="w-full p-4 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
                      />
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>
                          {currentAnswerState.answerText?.trim().split(/\s+/).filter(Boolean).length || 0} words
                        </span>
                        <span>
                          {currentAnswerState.syncStatus === "saving" && "Saving changes..."}
                          {currentAnswerState.syncStatus === "synced" && "✓ Auto-saved"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Question Action Toolbar (Flag Question, Clear Answer) */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    {/* Flag Question Button */}
                    <button
                      type="button"
                      onClick={handleToggleFlag}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        currentAnswerState.isFlagged
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "text-slate-600 hover:bg-slate-100 border border-transparent"
                      }`}
                    >
                      <Flag
                        className={`w-3.5 h-3.5 ${
                          currentAnswerState.isFlagged ? "fill-amber-600 text-amber-600" : "text-slate-500"
                        }`}
                      />
                      <span>{currentAnswerState.isFlagged ? "Flagged for Review" : "Flag Question"}</span>
                    </button>

                    {/* Clear Answer Button */}
                    <button
                      type="button"
                      onClick={handleClearAnswer}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Clear Answer</span>
                    </button>
                  </div>

                  {/* Sync status indicator */}
                  <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                    {currentAnswerState.syncStatus === "saving" && (
                      <>
                        <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                        <span>Saving...</span>
                      </>
                    )}
                    {currentAnswerState.syncStatus === "synced" && (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Saved</span>
                      </>
                    )}
                    {currentAnswerState.syncStatus === "error" && (
                      <span className="text-red-500">Sync error</span>
                    )}
                  </div>
                </div>

                {/* Footer Navigation: [<- Previous] and [Next ->] */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                    disabled={currentIndex === 0}
                    className="h-10 px-5 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Button>

                  {currentIndex < examData.questions.length - 1 ? (
                    <Button
                      onClick={() =>
                        setCurrentIndex((idx) => Math.min(examData.questions.length - 1, idx + 1))
                      }
                      className="h-10 px-6 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-lg shadow-sm"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowSubmitModal(true)}
                      className="h-10 px-6 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-lg shadow-sm"
                    >
                      <span>Review & Submit</span>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: QUESTIONS GRID & EXAM STATUS (Mockup right canvas) */}
          <div className="lg:col-span-4 space-y-4">
            {/* CARD 1: QUESTIONS Grid (5 Columns) */}
            <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    QUESTIONS
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400">
                    {stats.answered}/{stats.total} Answered
                  </span>
                </div>

                {/* 5-Column Question Number Grid */}
                <div className="grid grid-cols-5 gap-2.5">
                  {examData.questions.map((q, idx) => {
                    const isCurrent = idx === currentIndex;
                    const ans = answers[q.examQuestionId];
                    const isAnswered =
                      (ans?.selectedOptionIds && ans.selectedOptionIds.length > 0) ||
                      (ans?.answerText && ans.answerText.trim().length > 0);
                    const isFlagged = ans?.isFlagged;

                    // Formatted 2-digit number (01, 02...)
                    const label = String(idx + 1).padStart(2, "0");

                    // Determine styling based on mockup
                    let badgeClass = "border border-slate-200 text-slate-600 hover:bg-slate-50";

                    if (isCurrent) {
                      badgeClass =
                        "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-blue-400 ring-offset-2";
                    } else if (isFlagged) {
                      badgeClass =
                        "bg-amber-50 text-amber-800 border-2 border-amber-400 font-bold";
                    } else if (isAnswered) {
                      badgeClass =
                        "bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold";
                    }

                    return (
                      <button
                        key={q.examQuestionId}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-10 rounded-xl text-xs flex items-center justify-center transition-all relative cursor-pointer ${badgeClass}`}
                      >
                        <span>{label}</span>
                        {isFlagged && !isCurrent && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1.5 right-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend (matching mockup bottom legend) */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>Answered</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-600" />
                    <span>Current</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 bg-white" />
                    <span>Unanswered</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-white">
                      <Flag className="w-2 h-2 fill-white text-white" />
                    </div>
                    <span>Flagged</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: EXAM STATUS Widget (Bottom Right) */}
            <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    EXAM STATUS
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Online</span>
                  </div>
                </div>

                {/* System Monitors */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">
                      {isAnySaving ? "Auto-saving responses..." : "Auto-save enabled"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <>
                        <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium">Connection stable</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-bold text-amber-700">Offline (Queueing)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Monospace Countdown Clock */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Time Remaining
                  </span>
                  <div
                    className={`text-2xl font-black font-mono tracking-wider ${
                      timeRemaining !== null && timeRemaining < 300
                        ? "text-red-600 animate-pulse"
                        : "text-slate-900"
                    }`}
                  >
                    {formattedCountdown}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Strict Server Authority
                  </span>
                </div>

                {/* Prominent Submit Examination Button */}
                <Button
                  onClick={() => setShowSubmitModal(true)}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Examination</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* 3. CONFIRMATION SUBMIT MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardContent className="p-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Ready to Submit Examination?
                </h3>
                <p className="text-xs text-slate-500">
                  Please review your answering summary before final lock. Once submitted, your
                  answers cannot be changed.
                </p>
              </div>

              {/* Roster Summary */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                  <span className="text-emerald-600 font-bold block text-base">
                    {stats.answered}
                  </span>
                  <span className="text-[11px] text-emerald-800">Answered</span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <span className="text-slate-600 font-bold block text-base">
                    {stats.unanswered}
                  </span>
                  <span className="text-[11px] text-slate-600">Unanswered</span>
                </div>

                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <span className="text-amber-600 font-bold block text-base">
                    {stats.flagged}
                  </span>
                  <span className="text-[11px] text-amber-800">Flagged</span>
                </div>
              </div>

              {stats.unanswered > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    You have <strong className="font-bold">{stats.unanswered}</strong> unanswered{" "}
                    {stats.unanswered === 1 ? "question" : "questions"}. Are you sure you wish to
                    submit now?
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 h-11 text-xs font-semibold"
                >
                  Return to Exam
                </Button>

                <Button
                  onClick={() => handleFinalSubmit(false)}
                  disabled={isSubmitting}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      <span>Locking...</span>
                    </>
                  ) : (
                    <span>Confirm Submit</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function ExamRunnerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <ExamRunnerContent />
    </Suspense>
  );
}
