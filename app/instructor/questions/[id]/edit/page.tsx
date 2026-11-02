"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { questionApi } from "@/lib/api/question";
import {
  QuestionType,
  DifficultyLevel,
  QuestionOption,
  QuestionCategory,
  Question,
} from "@/types/question";
import {
  FileQuestion,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

function EditQuestionContent() {
  const router = useRouter();
  const params = useParams();
  const questionId = Number(params.id);

  const [question, setQuestion] = useState<Question | null>(null);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("SINGLE_CHOICE");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("MEDIUM");
  const [defaultMarks, setDefaultMarks] = useState<number>(1.0);
  const [explanation, setExplanation] = useState("");
  const [isActive, setIsActive] = useState<boolean>(true);

  // Options State
  const [options, setOptions] = useState<QuestionOption[]>([]);

  useEffect(() => {
    const fetchQuestionAndMetadata = async () => {
      try {
        setLoading(true);
        const [qRes, catRes] = await Promise.all([
          questionApi.getQuestionById(questionId),
          questionApi.getCategories(),
        ]);

        const q = qRes.data;
        setQuestion(q);
        setCategories(catRes.data);

        setCategoryId(q.categoryId);
        setQuestionText(q.questionText);
        setQuestionType(q.questionType);
        setDifficultyLevel(q.difficultyLevel);
        setDefaultMarks(Number(q.defaultMarks));
        setExplanation(q.explanation || "");
        setIsActive(q.isActive);
        setOptions(
          q.options && q.options.length > 0
            ? q.options.map((opt) => ({
                id: opt.id,
                optionText: opt.optionText,
                optionOrder: opt.optionOrder,
                isCorrect: Boolean(opt.isCorrect),
                explanation: opt.explanation,
              }))
            : []
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to load question details");
      } finally {
        setLoading(false);
      }
    };

    if (questionId) {
      fetchQuestionAndMetadata();
    }
  }, [questionId]);

  const addOption = () => {
    setOptions([
      ...options,
      {
        optionText: "",
        optionOrder: options.length + 1,
        isCorrect: false,
      },
    ]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2 && (questionType === "SINGLE_CHOICE" || questionType === "MULTIPLE_CHOICE")) {
      toast.error("At least 2 options are required");
      return;
    }
    const updated = options.filter((_, i) => i !== index).map((opt, i) => ({
      ...opt,
      optionOrder: i + 1,
    }));
    setOptions(updated);
  };

  const updateOptionText = (index: number, text: string) => {
    const updated = [...options];
    updated[index].optionText = text;
    setOptions(updated);
  };

  const setSingleCorrect = (index: number) => {
    const updated = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setOptions(updated);
  };

  const toggleMultiCorrect = (index: number) => {
    const updated = [...options];
    updated[index].isCorrect = !updated[index].isCorrect;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim()) {
      toast.error("Question prompt is required");
      return;
    }

    if (questionType === "SINGLE_CHOICE") {
      const correctCount = options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        toast.error("Single Choice questions must have exactly one correct option");
        return;
      }
      if (options.some((o) => !o.optionText.trim())) {
        toast.error("All options must contain text");
        return;
      }
    } else if (questionType === "MULTIPLE_CHOICE") {
      const correctCount = options.filter((o) => o.isCorrect).length;
      if (correctCount < 1) {
        toast.error("Multiple Choice questions must have at least one correct option");
        return;
      }
      if (options.some((o) => !o.optionText.trim())) {
        toast.error("All options must contain text");
        return;
      }
    }

    try {
      setSubmitting(true);
      await questionApi.updateQuestion(questionId, {
        categoryId: categoryId || undefined,
        questionText: questionText.trim(),
        questionType,
        difficultyLevel,
        defaultMarks,
        explanation: explanation.trim() || undefined,
        isActive,
        options,
      });

      toast.success("Question updated successfully. Version incremented.");
      router.push("/instructor/questions");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update question");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
        <div className="py-20 text-center text-sm text-slate-400">Loading question editor...</div>
      </DashboardShell>
    );
  }

  if (!question) {
    return (
      <DashboardShell allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
        <div className="py-20 text-center text-sm text-slate-400">
          Question not found.
          <Link href="/instructor/questions" className="block mt-2 text-blue-400">
            Return to Questions
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/instructor/questions">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Questions
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-800 text-slate-300 font-mono text-xs">
              Current Version: v{question.version}
            </Badge>
            <Badge className="bg-blue-600 text-white font-mono text-xs">
              Next on Save: v{question.version + 1}
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-800">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-amber-400" />
                Edit Examination Question #{question.id}
              </CardTitle>
              <CardDescription className="text-slate-400">
                Course: <span className="text-blue-400 font-semibold">{question.courseCode} - {question.courseName}</span> &bull; Author: {question.createdByName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Category (Tag)</label>
                  <select
                    value={categoryId || ""}
                    onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white mt-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">-- No Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Difficulty Level *</label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white mt-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Default Marks *</label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="100"
                    required
                    value={defaultMarks}
                    onChange={(e) => setDefaultMarks(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 mt-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Question Prompt / Problem Statement *</label>
                <textarea
                  rows={4}
                  required
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white mt-1.5 focus:outline-hidden focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 bg-slate-950"
                />
                <label htmlFor="isActiveToggle" className="text-xs text-slate-300">
                  Question is Active and Available for Examination Inclusion
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Option Builder Card */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-white">
                  Answer Options ({questionType})
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure option choices and answer indicators
                </CardDescription>
              </div>

              {(questionType === "SINGLE_CHOICE" || questionType === "MULTIPLE_CHOICE" || questionType === "SHORT_ANSWER") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Option
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {questionType === "ESSAY" ? (
                <div className="border border-dashed border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400 bg-slate-950/60">
                  <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-200 text-sm">Subjective Essay Question</p>
                  <p className="mt-1">Essay questions are evaluated post-exam by the instructor.</p>
                </div>
              ) : questionType === "TRUE_FALSE" ? (
                <div className="space-y-2.5">
                  {options.map((opt, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSingleCorrect(idx)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                        opt.isCorrect
                          ? "bg-emerald-950/40 border-emerald-500/70 text-emerald-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="tfChoice"
                          checked={opt.isCorrect}
                          onChange={() => setSingleCorrect(idx)}
                          className="text-emerald-500 bg-slate-900 border-slate-700"
                        />
                        <span className="font-semibold text-white">{opt.optionText}</span>
                      </div>
                      {opt.isCorrect && (
                        <Badge className="bg-emerald-600 text-white text-[10px]">Correct Answer</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {options.map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800"
                    >
                      {questionType === "SINGLE_CHOICE" ? (
                        <input
                          type="radio"
                          name="singleChoiceCorrect"
                          title="Mark as correct answer"
                          checked={Boolean(opt.isCorrect)}
                          onChange={() => setSingleCorrect(idx)}
                          className="w-4 h-4 text-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
                        />
                      ) : questionType === "MULTIPLE_CHOICE" ? (
                        <input
                          type="checkbox"
                          title="Mark as correct answer"
                          checked={Boolean(opt.isCorrect)}
                          onChange={() => toggleMultiCorrect(idx)}
                          className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 cursor-pointer"
                        />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}

                      <span className="w-6 h-6 rounded-md bg-slate-900 text-slate-400 border border-slate-800 flex items-center justify-center text-[10px] font-mono shrink-0 font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>

                      <Input
                        required
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                        value={opt.optionText}
                        onChange={(e) => updateOptionText(idx, e.target.value)}
                        className="bg-slate-900 border-slate-800 text-xs text-white flex-1"
                      />

                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-400" />
                Explanation & Internal Evaluation Rubric
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <textarea
                rows={3}
                placeholder="Pedagogical explanation or rubric notes..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-hidden focus:border-blue-500 leading-relaxed font-sans"
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/instructor/questions">
              <Button type="button" variant="ghost" className="text-slate-400 hover:text-white">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Updating..." : "Update Question (New Version)"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

export default function EditQuestionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading question editor...</div>}>
      <EditQuestionContent />
    </Suspense>
  );
}

