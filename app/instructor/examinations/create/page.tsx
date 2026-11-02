"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { examApi } from "@/lib/api/exam";
import { academicApi } from "@/lib/api/academic";
import { questionApi } from "@/lib/api/question";
import { CreateExaminationRequest, SelectedQuestionRequest } from "@/types/exam";
import { CourseOffering } from "@/types/academic";
import { Question } from "@/types/question";
import {
  FileText,
  ArrowLeft,
  Save,
  Send,
  HelpCircle,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Shuffle,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface QuestionSelectionItem {
  question: Question;
  selected: boolean;
  marks: number;
  order: number;
}

export default function CreateExaminationPage() {
  const router = useRouter();
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>("");
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [questionItems, setQuestionItems] = useState<QuestionSelectionItem[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState(
    "1. Read each question carefully before answering.\n2. Ensure you submit before time expires.\n3. Do not switch tabs or leave full screen."
  );
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalMarks, setTotalMarks] = useState(10);
  const [passingMarks, setPassingMarks] = useState(5);
  const [attemptLimit, setAttemptLimit] = useState(1);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState(0);

  // Load Course Offerings
  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        setLoadingOfferings(true);
        const res = await academicApi.getCourseOfferings();
        if (res.success && res.data) {
          setOfferings(res.data);
          if (res.data.length > 0) {
            setSelectedOfferingId(String(res.data[0].id));
          }
        }
      } catch (err: any) {
        toast.error("Failed to load course offerings");
      } finally {
        setLoadingOfferings(false);
      }
    };
    fetchOfferings();
  }, []);

  // When selected offering changes, load questions for that offering's course
  useEffect(() => {
    if (!selectedOfferingId) return;
    const offering = offerings.find((o) => String(o.id) === selectedOfferingId);
    if (!offering) return;

    const fetchQuestions = async () => {
      try {
        setLoadingQuestions(true);
        const res = await questionApi.getQuestions({
          courseId: offering.courseId,
          isActive: true,
          size: 100,
        });
        if (res.success && res.data) {
          setAvailableQuestions(res.data.content);
          setQuestionItems(
            res.data.content.map((q, idx) => ({
              question: q,
              selected: true, // Default to select initial questions
              marks: q.defaultMarks || 1,
              order: idx + 1,
            }))
          );
        }
      } catch (err: any) {
        toast.error("Failed to load questions for selected course");
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, [selectedOfferingId, offerings]);

  // Selected questions count & marks sum
  const selectedItems = useMemo(() => questionItems.filter((i) => i.selected), [questionItems]);
  const sumOfMarks = useMemo(() => {
    return selectedItems.reduce((acc, curr) => acc + (Number(curr.marks) || 0), 0);
  }, [selectedItems]);

  // Auto-sync total marks with sum of questions if desired
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

  const handleSubmit = async (andSubmitForApproval: boolean) => {
    if (!title.trim()) {
      toast.error("Examination title is required");
      return;
    }
    if (!selectedOfferingId) {
      toast.error("Please select a course offering");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Please select at least one question for the examination");
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

    const payload: CreateExaminationRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      instructions: instructions.trim() || undefined,
      courseOfferingId: Number(selectedOfferingId),
      durationMinutes: Number(durationMinutes),
      totalMarks: Number(totalMarks),
      passingMarks: Number(passingMarks),
      randomizeQuestions,
      randomizeOptions,
      attemptLimit: Number(attemptLimit),
      negativeMarkingEnabled,
      negativeMarkValue: negativeMarkingEnabled ? Number(negativeMarkValue) : 0,
      questions: selectedItems.map((item, idx) => ({
        questionId: item.question.id,
        questionOrder: item.order || idx + 1,
        marks: Number(item.marks),
      })),
    };

    try {
      setSubmitting(true);
      const res = await examApi.createExamination(payload);
      if (res.success && res.data) {
        if (andSubmitForApproval) {
          await examApi.submitExamination(res.data.id);
          toast.success("Examination created and submitted for review!");
        } else {
          toast.success("Examination draft saved successfully!");
        }
        router.push("/instructor/examinations");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create examination");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/instructor/examinations">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Create Examination
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure examination rules, select questions, and calibrate scoring parameters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save Draft
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Save & Submit
            </Button>
          </div>
        </div>

        {/* Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Basic Info & Questions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-semibold text-slate-800">1. Examination Details</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select course offering and specify basic title and instructions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Offering <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedOfferingId}
                    onChange={(e) => setSelectedOfferingId(e.target.value)}
                    disabled={loadingOfferings}
                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {offerings.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.courseCode} - {co.courseName} (Section {co.section} &bull; {co.semesterName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Examination Title <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. CS101 Midterm Examination - Fall 2025"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the examination syllabus or topics covered..."
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
                    placeholder="Instructions displayed to students before starting..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Questions Selection Card */}
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-800">
                    2. Select & Order Questions ({selectedItems.length} selected)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Choose questions from the course question bank and assign individual marks.
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
              <CardContent className="p-4">
                {loadingQuestions ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Loading questions for selected course...
                  </div>
                ) : questionItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No active questions found in question bank for this course. Please create questions first in the Question Bank.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questionItems.map((item, idx) => (
                      <div
                        key={item.question.id}
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
                              {item.question.questionType.replace("_", " ")}
                            </Badge>
                            <Badge
                              className={`text-[10px] py-0 border-0 ${
                                item.question.difficultyLevel === "EASY"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.question.difficultyLevel === "MEDIUM"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {item.question.difficultyLevel}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
                            {item.question.questionText}
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
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Scoring & Exam Rules Configuration */}
          <div className="space-y-6">
            {/* Marks & Validation Status Box */}
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Marks & Scoring Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Marks Match Card */}
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
                    <option value={1}>1 Attempt (Strict Exam)</option>
                    <option value={2}>2 Attempts</option>
                    <option value={3}>3 Attempts</option>
                    <option value={99}>Unlimited Attempts (Practice)</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Randomization & Negative Marking */}
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
                    <span className="text-[11px] text-slate-500">Shuffle question order for each student</span>
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
                    <span className="text-[11px] text-slate-500">Shuffle multiple choice option answers</span>
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
                      <span className="text-[11px] text-slate-500">Deduct marks for incorrect answers</span>
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
                        Deduction Value (e.g. 0.25)
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
