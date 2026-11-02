"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { questionApi } from "@/lib/api/question";
import { academicApi } from "@/lib/api/academic";
import {
  QuestionType,
  DifficultyLevel,
  QuestionOption,
  QuestionCategory,
} from "@/types/question";
import { Course } from "@/types/academic";
import {
  FileQuestion,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Save,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function CreateQuestionPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [courseId, setCourseId] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("SINGLE_CHOICE");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("MEDIUM");
  const [defaultMarks, setDefaultMarks] = useState<number>(1.0);
  const [explanation, setExplanation] = useState("");

  // Options State
  const [options, setOptions] = useState<QuestionOption[]>([
    { optionText: "", optionOrder: 1, isCorrect: true },
    { optionText: "", optionOrder: 2, isCorrect: false },
    { optionText: "", optionOrder: 3, isCorrect: false },
    { optionText: "", optionOrder: 4, isCorrect: false },
  ]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const [courseRes, catRes] = await Promise.all([
          academicApi.getCourses(),
          questionApi.getCategories(),
        ]);
        setCourses(courseRes.data);
        setCategories(catRes.data);
        if (courseRes.data.length > 0) {
          setCourseId(courseRes.data[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load course metadata");
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  // Handle Type Change & Reset Options Template
  const handleTypeChange = (type: QuestionType) => {
    setQuestionType(type);
    if (type === "SINGLE_CHOICE") {
      setOptions([
        { optionText: "", optionOrder: 1, isCorrect: true },
        { optionText: "", optionOrder: 2, isCorrect: false },
        { optionText: "", optionOrder: 3, isCorrect: false },
        { optionText: "", optionOrder: 4, isCorrect: false },
      ]);
    } else if (type === "MULTIPLE_CHOICE") {
      setOptions([
        { optionText: "", optionOrder: 1, isCorrect: true },
        { optionText: "", optionOrder: 2, isCorrect: true },
        { optionText: "", optionOrder: 3, isCorrect: false },
        { optionText: "", optionOrder: 4, isCorrect: false },
      ]);
    } else if (type === "TRUE_FALSE") {
      setOptions([
        { optionText: "True", optionOrder: 1, isCorrect: true },
        { optionText: "False", optionOrder: 2, isCorrect: false },
      ]);
    } else if (type === "SHORT_ANSWER") {
      setOptions([
        { optionText: "", optionOrder: 1, isCorrect: true },
      ]);
    } else if (type === "ESSAY") {
      setOptions([]);
    }
  };

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

    if (!courseId) {
      toast.error("Please select a target course");
      return;
    }

    if (!questionText.trim()) {
      toast.error("Question prompt is required");
      return;
    }

    // Validation checks per question type
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
    } else if (questionType === "SHORT_ANSWER") {
      if (options.some((o) => !o.optionText.trim())) {
        toast.error("Please enter the accepted answer text");
        return;
      }
    }

    try {
      setSubmitting(true);
      await questionApi.createQuestion({
        courseId,
        categoryId: categoryId || undefined,
        questionText: questionText.trim(),
        questionType,
        difficultyLevel,
        defaultMarks,
        explanation: explanation.trim() || undefined,
        options,
      });

      toast.success("Question created and added to question bank successfully");
      router.push("/instructor/questions");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create question");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link href="/instructor/questions">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Questions
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white font-mono text-xs">Version 1.0</Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Question Config Card */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-800">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-blue-400" />
                Create New Examination Question
              </CardTitle>
              <CardDescription className="text-slate-400">
                Configure question metadata, taxonomy category, marks, and difficulty level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {/* Course & Category Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Target Course *</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white mt-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Question Category (Tag)</label>
                  <select
                    value={categoryId || ""}
                    onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white mt-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">-- No Specific Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Question Type Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">Question Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {[
                    { id: "SINGLE_CHOICE", label: "MCQ Single", desc: "1 correct answer" },
                    { id: "MULTIPLE_CHOICE", label: "MCQ Multi", desc: "1+ correct answers" },
                    { id: "TRUE_FALSE", label: "True / False", desc: "Binary choice" },
                    { id: "SHORT_ANSWER", label: "Short Answer", desc: "Exact keyword match" },
                    { id: "ESSAY", label: "Essay", desc: "Subjective grading" },
                  ].map((t) => {
                    const isSelected = questionType === t.id;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => handleTypeChange(t.id as QuestionType)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600/20 border-blue-500 text-white shadow-xs"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <div className="font-semibold text-xs leading-tight">{t.label}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty & Default Marks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Difficulty Level *</label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white mt-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="EASY">Easy (Foundational)</option>
                    <option value="MEDIUM">Medium (Intermediate)</option>
                    <option value="HARD">Hard (Advanced Problem Solving)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Default Examination Marks *</label>
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

              {/* Question Textarea */}
              <div>
                <label className="text-xs font-semibold text-slate-300">Question Prompt / Problem Statement *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter the complete question prompt, code snippet, or scenario..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white mt-1.5 focus:outline-hidden focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Option Builder Card */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-white">
                  Answer Options & Correct Key Configuration
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {questionType === "SINGLE_CHOICE" && "Provide options and select the single correct radio button"}
                  {questionType === "MULTIPLE_CHOICE" && "Provide options and check all correct answers"}
                  {questionType === "TRUE_FALSE" && "Select whether True or False is the correct response"}
                  {questionType === "SHORT_ANSWER" && "Define accepted answer strings for automatic evaluation"}
                  {questionType === "ESSAY" && "Open-ended response format with manual instructor rubric"}
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
                <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400 bg-slate-950/60">
                  <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-200 text-sm">Subjective Essay Evaluation</p>
                  <p className="mt-1">
                    Essay questions do not use pre-defined options. During an examination, students will write long-form responses which you can grade manually using the rubric provided below.
                  </p>
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
                      {/* Correct Answer Indicator Check/Radio */}
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

                      {/* Option Label Tag */}
                      <span className="w-6 h-6 rounded-md bg-slate-900 text-slate-400 border border-slate-800 flex items-center justify-center text-[10px] font-mono shrink-0 font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>

                      {/* Option Text Input */}
                      <Input
                        required
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                        value={opt.optionText}
                        onChange={(e) => updateOptionText(idx, e.target.value)}
                        className="bg-slate-900 border-slate-800 text-xs text-white flex-1"
                      />

                      {/* Remove Option Button */}
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

          {/* Explanation & Instructor Rubric Card */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-400" />
                Explanation & Internal Evaluation Rubric (Optional)
              </CardTitle>
              <CardDescription className="text-slate-400">
                This rationale is stored securely and never shown to students before authorized result publication
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <textarea
                rows={3}
                placeholder="Explain why the correct answer is valid, cite textbook references, or define essay evaluation criteria..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-hidden focus:border-blue-500 leading-relaxed font-sans"
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/instructor/questions">
              <Button type="button" variant="ghost" className="text-slate-400 hover:text-white">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Saving to Bank..." : "Save Question"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
