"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { examApi } from "@/lib/api/exam";
import { questionApi } from "@/lib/api/question";
import { Examination, UpdateExaminationRequest } from "@/types/exam";
import { Question } from "@/types/question";
import {
  FileText,
  ArrowLeft,
  Save,
  Send,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Shuffle,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface QuestionSelectionItem {
  questionId: number;
  questionText: string;
  questionType: string;
  difficultyLevel?: string;
  selected: boolean;
  marks: number;
  order: number;
}

function EditExaminationContent() {
  const params = useParams();
  const router = useRouter();
  const examId = Number(params.id);

  const [exam, setExam] = useState<Examination | null>(null);
  const [questionItems, setQuestionItems] = useState<QuestionSelectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalMarks, setTotalMarks] = useState(10);
  const [passingMarks, setPassingMarks] = useState(5);
  const [attemptLimit, setAttemptLimit] = useState(1);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState(0);

  useEffect(() => {
    if (!examId) return;

    const loadExamAndQuestions = async () => {
      try {
        setLoading(true);
        const res = await examApi.getExaminationById(examId);
        if (res.success && res.data) {
          const e = res.data;
          setExam(e);
          setTitle(e.title);
          setDescription(e.description || "");
          setInstructions(e.instructions || "");
          setDurationMinutes(e.durationMinutes);
          setTotalMarks(e.totalMarks);
          setPassingMarks(e.passingMarks);
          setAttemptLimit(e.attemptLimit);
          setRandomizeQuestions(e.randomizeQuestions);
          setRandomizeOptions(e.randomizeOptions);
          setNegativeMarkingEnabled(e.negativeMarkingEnabled);
          setNegativeMarkValue(e.negativeMarkValue || 0);

          // Build selected questions map
          const attachedMap = new Map<number, { marks: number; order: number }>();
          if (e.questions) {
            e.questions.forEach((q) => {
              attachedMap.set(q.questionId, { marks: q.marks, order: q.questionOrder });
            });
          }

          // Fetch all questions for this course offering to allow adding/toggling
          const qRes = await questionApi.getQuestions({
            courseId: undefined, // Will be filtered by bank or course if needed
            isActive: true,
            size: 100,
          });

          if (qRes.success && qRes.data) {
            const items: QuestionSelectionItem[] = qRes.data.content.map((q, idx) => {
              const attached = attachedMap.get(q.id);
              return {
                questionId: q.id,
                questionText: q.questionText,
                questionType: q.questionType,
                difficultyLevel: q.difficultyLevel,
                selected: !!attached,
                marks: attached ? attached.marks : q.defaultMarks || 1,
                order: attached ? attached.order : idx + 1,
              };
            });
            setQuestionItems(items);
          }
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to load examination");
      } finally {
        setLoading(false);
      }
    };

    loadExamAndQuestions();
  }, [examId]);

  const selectedItems = useMemo(() => questionItems.filter((i) => i.selected), [questionItems]);
  const sumOfMarks = useMemo(() => {
    return selectedItems.reduce((acc, curr) => acc + (Number(curr.marks) || 0), 0);
  }, [selectedItems]);

  const handleSyncTotal = () => {
    setTotalMarks(sumOfMarks);
    setPassingMarks(Math.round((sumOfMarks / 2) * 100) / 100);
  };

  const handleToggleQuestion = (index: number) => {
    setQuestionItems((prev) => {
      const copy = [...prev];
      copy[index].selected = !copy[index].selected;
      return copy;
    });
  };

  const handleMarkChange = (index: number, newMarks: number) => {
    setQuestionItems((prev) => {
      const copy = [...prev];
      copy[index].marks = newMarks;
      return copy;
    });
  };

  const handleOrderChange = (index: number, newOrder: number) => {
    setQuestionItems((prev) => {
      const copy = [...prev];
      copy[index].order = newOrder;
      return copy;
    });
  };

  const handleSave = async (andSubmit: boolean) => {
    if (!title.trim()) {
      toast.error("Examination title is required");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Please select at least one question");
      return;
    }
    if (Math.abs(Number(totalMarks) - sumOfMarks) > 0.01) {
      toast.error(`Total marks (${totalMarks}) does not match sum of selected questions (${sumOfMarks})`);
      return;
    }
    if (Number(passingMarks) > Number(totalMarks)) {
      toast.error("Passing marks cannot exceed total examination marks");
      return;
    }

    const payload: UpdateExaminationRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      instructions: instructions.trim() || undefined,
      durationMinutes: Number(durationMinutes),
      totalMarks: Number(totalMarks),
      passingMarks: Number(passingMarks),
      randomizeQuestions,
      randomizeOptions,
      attemptLimit: Number(attemptLimit),
      negativeMarkingEnabled,
      negativeMarkValue: negativeMarkingEnabled ? Number(negativeMarkValue) : 0,
      questions: selectedItems.map((item, idx) => ({
        questionId: item.questionId,
        questionOrder: item.order || idx + 1,
        marks: Number(item.marks),
      })),
    };

    try {
      setSubmitting(true);
      const res = await examApi.updateExamination(examId, payload);
      if (res.success && res.data) {
        if (andSubmit) {
          await examApi.submitExamination(examId);
          toast.success("Examination updated and submitted for review!");
        } else {
          toast.success("Examination updated successfully!");
        }
        router.push(`/instructor/examinations/${examId}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update examination");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-24 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
          <p className="text-sm">Loading examination editor...</p>
        </div>
      </DashboardShell>
    );
  }

  if (exam && exam.status !== "DRAFT" && exam.status !== "REJECTED") {
    return (
      <DashboardShell>
        <div className="py-24 text-center max-w-md mx-auto space-y-4">
          <Lock className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">Cannot Edit Locked Examination</h2>
          <p className="text-xs text-slate-600">
            This examination is currently in <strong>{exam.status}</strong> status and cannot be modified directly.
          </p>
          <Link href={`/instructor/examinations/${examId}`}>
            <Button className="text-xs">View Examination Details</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Link href={`/instructor/examinations/${examId}`}>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Edit Examination
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Revise questions, adjust marks distribution, and re-calibrate examination scoring.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={submitting}
              className="text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save Changes
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Save & Resubmit
            </Button>
          </div>
        </div>

        {/* Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-semibold text-slate-800">Examination Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Examination Title <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Instructions <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Questions Selection */}
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-800">
                    Questions Selection ({selectedItems.length} selected)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Select questions and calibrate individual question marks.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncTotal}
                  className="text-[11px] h-7 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <Award className="h-3 w-3" />
                  Sync Total ({sumOfMarks} M)
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {questionItems.map((item, idx) => (
                  <div
                    key={item.questionId}
                    className={`p-3 rounded-lg border transition-colors flex items-start gap-3 ${
                      item.selected
                        ? "border-indigo-200 bg-indigo-50/30"
                        : "border-slate-200 bg-white opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => handleToggleQuestion(idx)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] font-mono py-0">
                          #{item.order}
                        </Badge>
                        <Badge className="text-[10px] bg-slate-100 text-slate-700 py-0 border-0">
                          {item.questionType.replace("_", " ")}
                        </Badge>
                        {item.difficultyLevel && (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-800 py-0 border-0">
                            {item.difficultyLevel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
                        {item.questionText}
                      </p>
                    </div>

                    {item.selected && (
                      <div className="flex items-center gap-2 shrink-0">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Order</span>
                          <input
                            type="number"
                            min={1}
                            value={item.order}
                            onChange={(e) => handleOrderChange(idx, Number(e.target.value))}
                            className="w-14 h-7 text-xs border border-slate-300 rounded px-1.5 text-center font-medium"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Marks</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={item.marks}
                            onChange={(e) => handleMarkChange(idx, Number(e.target.value))}
                            className="w-16 h-7 text-xs border border-indigo-300 rounded px-1.5 text-center font-bold text-indigo-700 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Scoring Rules */}
          <div className="space-y-6">
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Marks & Scoring
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    Math.abs(Number(totalMarks) - sumOfMarks) < 0.01
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {Math.abs(Number(totalMarks) - sumOfMarks) < 0.01 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                    )}
                    <div>
                      <div className="font-semibold">
                        {Math.abs(Number(totalMarks) - sumOfMarks) < 0.01 ? "Marks Aligned" : "Marks Mismatch"}
                      </div>
                      <div className="text-[11px] opacity-80">
                        Sum: {sumOfMarks} / Target: {totalMarks}
                      </div>
                    </div>
                  </div>
                  {Math.abs(Number(totalMarks) - sumOfMarks) >= 0.01 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSyncTotal}
                      className="text-[10px] h-6 px-2 text-rose-700 border-rose-300 hover:bg-rose-100"
                    >
                      Fix Sum
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Total Marks</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(Number(e.target.value))}
                      className="text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Passing Marks</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={passingMarks}
                      onChange={(e) => setPassingMarks(Number(e.target.value))}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    Duration (Minutes)
                  </label>
                  <Input
                    type="number"
                    min="5"
                    max="300"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attempt Limit</label>
                  <select
                    value={attemptLimit}
                    onChange={(e) => setAttemptLimit(Number(e.target.value))}
                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1 Attempt</option>
                    <option value={2}>2 Attempts</option>
                    <option value={3}>3 Attempts</option>
                    <option value={99}>Unlimited</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-indigo-500" />
                  Examination Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Randomize Questions</span>
                    <span className="text-[11px] text-slate-500">Shuffle question order</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Randomize Options</span>
                    <span className="text-[11px] text-slate-500">Shuffle option choices</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={randomizeOptions}
                    onChange={(e) => setRandomizeOptions(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Negative Marking</span>
                      <span className="text-[11px] text-slate-500">Deduct marks for wrong answers</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={negativeMarkingEnabled}
                      onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>

                  {negativeMarkingEnabled && (
                    <div className="mt-2 pl-2 border-l-2 border-rose-300">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Deduction Value
                      </label>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        value={negativeMarkValue}
                        onChange={(e) => setNegativeMarkValue(Number(e.target.value))}
                        className="text-xs h-8"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function EditExaminationPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="py-24 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
            <p className="text-sm">Loading examination editor...</p>
          </div>
        </DashboardShell>
      }
    >
      <EditExaminationContent />
    </Suspense>
  );
}
