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
import { academicApi } from "@/lib/api/academic";
import { Examination, UpdateExaminationRequest } from "@/types/exam";
import { Question, QuestionType, QuestionOption } from "@/types/question";
import { CourseOffering } from "@/types/academic";
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
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  Layers,
  Search,
  Sparkles,
  HelpCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface QuestionSelectionItem {
  questionId: number;
  questionText: string;
  questionType: string;
  selected: boolean;
  marks: number;
  order: number;
  options?: QuestionOption[];
}

function EditExaminationContent() {
  const params = useParams();
  const router = useRouter();
  const examId = Number(params.id);

  const [exam, setExam] = useState<Examination | null>(null);
  const [courseOffering, setCourseOffering] = useState<CourseOffering | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
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

  // In-Page Question Creation Modal State
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [modalTab, setModalTab] = useState<"create" | "import">("create");
  const [creatingQuestion, setCreatingQuestion] = useState(false);

  // Modal form fields
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>("SINGLE_CHOICE");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionMarks, setNewQuestionMarks] = useState<number>(2);
  const [newQuestionExplanation, setNewQuestionExplanation] = useState("");
  const [newQuestionOptions, setNewQuestionOptions] = useState<QuestionOption[]>([
    { optionText: "", optionOrder: 1, isCorrect: true },
    { optionText: "", optionOrder: 2, isCorrect: false },
    { optionText: "", optionOrder: 3, isCorrect: false },
    { optionText: "", optionOrder: 4, isCorrect: false },
  ]);
  const [shortAnswerExpected, setShortAnswerExpected] = useState("");
  const [trueFalseCorrect, setTrueFalseCorrect] = useState<"True" | "False">("True");

  // Import Tab State
  const [importSearch, setImportSearch] = useState("");
  const [selectedImportIds, setSelectedImportIds] = useState<number[]>([]);

  useEffect(() => {
    if (!examId) return;

    const loadExamAndQuestions = async () => {
      try {
        setLoading(true);
        const [res, offeringsRes] = await Promise.all([
          examApi.getExaminationById(examId),
          academicApi.getMyAssignedOfferings(),
        ]);

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

          let foundOffering: CourseOffering | null = null;
          if (offeringsRes.success && offeringsRes.data) {
            foundOffering = offeringsRes.data.find((o) => o.id === e.courseOfferingId) || null;
            setCourseOffering(foundOffering);
          }

          // Build attached exam questions
          const attachedQuestions: QuestionSelectionItem[] = [];
          if (e.questions && e.questions.length > 0) {
            e.questions.forEach((q) => {
              attachedQuestions.push({
                questionId: q.questionId,
                questionText: q.questionText || `Question #${q.questionId}`,
                questionType: q.questionType || "SINGLE_CHOICE",
                selected: true,
                marks: q.marks,
                order: q.questionOrder,
                options: q.options,
              });
            });
            attachedQuestions.sort((a, b) => a.order - b.order);
            setQuestionItems(attachedQuestions);
          }

          // Load other available questions for this course if offering found
          if (foundOffering) {
            const qRes = await questionApi.getQuestions({
              courseId: foundOffering.courseId,
              isActive: true,
              size: 100,
            });
            if (qRes.success && qRes.data) {
              setAvailableQuestions(qRes.data.content);
            }
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
    toast.success(`Total marks synchronized to ${sumOfMarks}`);
  };

  const handleMarkChange = (index: number, newMarks: number) => {
    setQuestionItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], marks: newMarks };
      return copy;
    });
  };

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questionItems.length) return;

    setQuestionItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((item, idx) => ({ ...item, order: idx + 1 }));
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestionItems((prev) => {
      const copy = prev.filter((_, idx) => idx !== index);
      return copy.map((item, idx) => ({ ...item, order: idx + 1 }));
    });
    toast.success("Question removed from examination");
  };

  // Switch Question Type in Creation Modal
  const handleTypeChange = (type: QuestionType) => {
    setNewQuestionType(type);
    if (type === "SINGLE_CHOICE") {
      setNewQuestionOptions([
        { optionText: "", optionOrder: 1, isCorrect: true },
        { optionText: "", optionOrder: 2, isCorrect: false },
        { optionText: "", optionOrder: 3, isCorrect: false },
        { optionText: "", optionOrder: 4, isCorrect: false },
      ]);
    } else if (type === "MULTIPLE_CHOICE") {
      setNewQuestionOptions([
        { optionText: "", optionOrder: 1, isCorrect: true },
        { optionText: "", optionOrder: 2, isCorrect: true },
        { optionText: "", optionOrder: 3, isCorrect: false },
        { optionText: "", optionOrder: 4, isCorrect: false },
      ]);
    } else if (type === "TRUE_FALSE") {
      setNewQuestionOptions([
        { optionText: "True", optionOrder: 1, isCorrect: true },
        { optionText: "False", optionOrder: 2, isCorrect: false },
      ]);
      setTrueFalseCorrect("True");
    } else if (type === "SHORT_ANSWER") {
      setNewQuestionOptions([]);
      setShortAnswerExpected("");
    } else if (type === "ESSAY") {
      setNewQuestionOptions([]);
    }
  };

  const handleAddOption = () => {
    setNewQuestionOptions((prev) => [
      ...prev,
      {
        optionText: "",
        optionOrder: prev.length + 1,
        isCorrect: false,
      },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (newQuestionOptions.length <= 2 && (newQuestionType === "SINGLE_CHOICE" || newQuestionType === "MULTIPLE_CHOICE")) {
      toast.error("At least 2 options are required for this question type");
      return;
    }
    setNewQuestionOptions((prev) =>
      prev.filter((_, i) => i !== index).map((opt, i) => ({ ...opt, optionOrder: i + 1 }))
    );
  };

  const handleUpdateOptionText = (index: number, text: string) => {
    setNewQuestionOptions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], optionText: text };
      return copy;
    });
  };

  const handleSetSingleCorrect = (index: number) => {
    setNewQuestionOptions((prev) =>
      prev.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }))
    );
  };

  const handleToggleMultiCorrect = (index: number) => {
    setNewQuestionOptions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isCorrect: !copy[index].isCorrect };
      return copy;
    });
  };

  // Create Question in Edit Mode
  const handleCreateAndAddQuestion = async () => {
    if (!courseOffering) {
      toast.error("Course metadata not available");
      return;
    }
    if (!newQuestionText.trim()) {
      toast.error("Question text is required");
      return;
    }

    let preparedOptions: QuestionOption[] = [];

    if (newQuestionType === "SINGLE_CHOICE") {
      if (newQuestionOptions.length < 2) {
        toast.error("Single choice question requires at least 2 options");
        return;
      }
      for (let i = 0; i < newQuestionOptions.length; i++) {
        if (!newQuestionOptions[i].optionText.trim()) {
          toast.error(`Option ${String.fromCharCode(65 + i)} text cannot be empty`);
          return;
        }
      }
      const correctCount = newQuestionOptions.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        toast.error("Please mark exactly one correct option");
        return;
      }
      preparedOptions = newQuestionOptions.map((o, idx) => ({
        optionText: o.optionText.trim(),
        optionOrder: idx + 1,
        isCorrect: o.isCorrect,
      }));
    } else if (newQuestionType === "MULTIPLE_CHOICE") {
      if (newQuestionOptions.length < 2) {
        toast.error("Multiple choice question requires at least 2 options");
        return;
      }
      for (let i = 0; i < newQuestionOptions.length; i++) {
        if (!newQuestionOptions[i].optionText.trim()) {
          toast.error(`Option ${String.fromCharCode(65 + i)} text cannot be empty`);
          return;
        }
      }
      const correctCount = newQuestionOptions.filter((o) => o.isCorrect).length;
      if (correctCount < 1) {
        toast.error("Please mark at least one correct option");
        return;
      }
      preparedOptions = newQuestionOptions.map((o, idx) => ({
        optionText: o.optionText.trim(),
        optionOrder: idx + 1,
        isCorrect: o.isCorrect,
      }));
    } else if (newQuestionType === "TRUE_FALSE") {
      preparedOptions = [
        { optionText: "True", optionOrder: 1, isCorrect: trueFalseCorrect === "True" },
        { optionText: "False", optionOrder: 2, isCorrect: trueFalseCorrect === "False" },
      ];
    } else if (newQuestionType === "SHORT_ANSWER") {
      if (shortAnswerExpected.trim()) {
        preparedOptions = [{ optionText: shortAnswerExpected.trim(), optionOrder: 1, isCorrect: true }];
      }
    } else if (newQuestionType === "ESSAY") {
      preparedOptions = [];
    }

    try {
      setCreatingQuestion(true);
      const res = await questionApi.createQuestion({
        courseId: courseOffering.courseId,
        questionText: newQuestionText.trim(),
        questionType: newQuestionType,
        defaultMarks: Number(newQuestionMarks),
        explanation: newQuestionExplanation.trim() || undefined,
        options: preparedOptions,
      });

      if (res.success && res.data) {
        const created = res.data;
        const assignedMarks = Number(newQuestionMarks);
        const nextOrder = questionItems.length + 1;

        setQuestionItems((prev) => [
          ...prev,
          {
            questionId: created.id,
            questionText: created.questionText,
            questionType: created.questionType,
            selected: true,
            marks: assignedMarks,
            order: nextOrder,
            options: created.options,
          },
        ]);

        setTotalMarks((prev) => prev + assignedMarks);
        setPassingMarks((prev) => Math.round(((prev + assignedMarks) / 2) * 100) / 100);

        toast.success(`Question #${nextOrder} created and added to examination!`);
        setShowQuestionModal(false);

        // Reset form
        setNewQuestionText("");
        setNewQuestionExplanation("");
        setShortAnswerExpected("");
        handleTypeChange("SINGLE_CHOICE");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create question");
    } finally {
      setCreatingQuestion(false);
    }
  };

  // Import existing questions from course
  const handleImportQuestions = () => {
    if (selectedImportIds.length === 0) {
      toast.error("Please select at least one question to import");
      return;
    }

    const toImport = availableQuestions.filter((q) => selectedImportIds.includes(q.id));
    let nextOrder = questionItems.length + 1;
    let addedMarks = 0;

    const newItems: QuestionSelectionItem[] = toImport.map((q) => {
      const marks = q.defaultMarks || 1;
      addedMarks += marks;
      return {
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        selected: true,
        marks,
        order: nextOrder++,
        options: q.options,
      };
    });

    setQuestionItems((prev) => [...prev, ...newItems]);
    setTotalMarks((prev) => prev + addedMarks);
    setPassingMarks((prev) => Math.round(((prev + addedMarks) / 2) * 100) / 100);
    setSelectedImportIds([]);
    setShowQuestionModal(false);
    toast.success(`Imported ${newItems.length} question(s) into this examination!`);
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
      toast.error(`Total marks (${totalMarks}) does not match sum of questions (${sumOfMarks}). Click 'Sync Total' to resolve.`);
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

  const importableQuestions = useMemo(() => {
    const existingIds = new Set(questionItems.map((i) => i.questionId));
    return availableQuestions.filter(
      (q) =>
        !existingIds.has(q.id) &&
        (importSearch
          ? q.questionText.toLowerCase().includes(importSearch.toLowerCase()) ||
            q.questionType.toLowerCase().includes(importSearch.toLowerCase())
          : true)
    );
  }, [availableQuestions, questionItems, importSearch]);

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
                Revise questions, add questions directly to this exam, and calibrate scoring parameters.
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
                <CardTitle className="text-sm font-semibold text-slate-800">1. Examination Details</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Course: <strong>{exam?.courseCode} - {exam?.courseName}</strong> ({exam?.semesterName})
                </CardDescription>
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

            {/* Questions Section Card (In-Page Creation & Management) */}
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <span>2. Examination Questions</span>
                    <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-200">
                      {questionItems.length} {questionItems.length === 1 ? "Question" : "Questions"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Add, reorder, or edit questions and calibrate individual marks.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setModalTab("create");
                      setShowQuestionModal(true);
                    }}
                    className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Question
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSyncTotal}
                    className="text-[11px] h-8 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    <Award className="h-3 w-3" />
                    Sync Total ({sumOfMarks} M)
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {questionItems.length === 0 ? (
                  <div className="py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/60">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                      <HelpCircle className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">No Questions Added to this Exam</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                      Create questions directly right here to populate this examination.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setModalTab("create");
                        setShowQuestionModal(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-xs px-4"
                    >
                      <Plus className="h-4 w-4" />
                      Add Question to Examination
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questionItems.map((item, idx) => (
                      <div
                        key={item.questionId}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold font-mono">
                              {item.order}
                            </span>
                            <Badge className="text-[10px] bg-slate-100 text-slate-700 py-0.5 border-0 font-medium">
                              {item.questionType.replace("_", " ")}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-slate-50">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveQuestion(idx, "up")}
                                title="Move question up"
                                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === questionItems.length - 1}
                                onClick={() => handleMoveQuestion(idx, "down")}
                                title="Move question down"
                                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1 bg-indigo-50/60 border border-indigo-200 rounded-md px-2 py-1">
                              <span className="text-[11px] font-semibold text-indigo-700">Marks:</span>
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                value={item.marks}
                                onChange={(e) => handleMarkChange(idx, Number(e.target.value))}
                                className="w-14 h-6 text-xs border border-indigo-300 rounded px-1 text-center font-bold text-indigo-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              title="Remove question from examination"
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs font-medium text-slate-800 leading-relaxed">
                          {item.questionText}
                        </div>

                        {item.options && item.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {item.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                                  opt.isCorrect
                                    ? "bg-emerald-50/70 border-emerald-300 text-emerald-900 font-medium"
                                    : "bg-slate-50/50 border-slate-200 text-slate-600"
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    opt.isCorrect
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="truncate flex-1">{opt.optionText}</span>
                                {opt.isCorrect && (
                                  <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1.5 shrink-0">
                                    Correct
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setModalTab("create");
                        setShowQuestionModal(true);
                      }}
                      className="w-full py-2.5 text-xs text-indigo-600 border-dashed border-indigo-200 hover:bg-indigo-50/60 hover:border-indigo-300 gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Question to Examination
                    </Button>
                  </div>
                )}
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

      {/* IN-PAGE QUESTION CREATION / IMPORT MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  Add Question to Examination
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Course: <span className="font-semibold text-slate-700">{exam?.courseCode} - {exam?.courseName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/50 px-4 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setModalTab("create")}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  modalTab === "create"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Question
              </button>
              {availableQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModalTab("import")}
                  className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    modalTab === "import"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Import from Course Repository ({importableQuestions.length})
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {modalTab === "create" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Question Type <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {(
                        [
                          { type: "SINGLE_CHOICE", label: "Single Choice" },
                          { type: "MULTIPLE_CHOICE", label: "Multiple Choice" },
                          { type: "TRUE_FALSE", label: "True / False" },
                          { type: "SHORT_ANSWER", label: "Short Answer" },
                          { type: "ESSAY", label: "Essay" },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => handleTypeChange(item.type)}
                          className={`py-2 px-2 rounded-lg border text-center text-[11px] font-medium transition-all ${
                            newQuestionType === item.type
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Question Prompt <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Type your question prompt here..."
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Question Marks */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Question Marks <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.25"
                      value={newQuestionMarks}
                      onChange={(e) => setNewQuestionMarks(Number(e.target.value))}
                      className="text-xs font-bold"
                    />
                  </div>

                  {newQuestionType === "SINGLE_CHOICE" && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">
                          Options & Correct Answer <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] text-slate-500">Select radio button for the correct option</span>
                      </div>
                      <div className="space-y-2">
                        {newQuestionOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="editSingleCorrectOption"
                              checked={opt.isCorrect}
                              onChange={() => handleSetSingleCorrect(idx)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="w-5 text-xs font-mono font-bold text-slate-400">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <Input
                              placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                              value={opt.optionText}
                              onChange={(e) => handleUpdateOptionText(idx, e.target.value)}
                              className="text-xs flex-1"
                            />
                            {newQuestionOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddOption}
                        className="text-xs text-indigo-600 hover:bg-indigo-50 gap-1 mt-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Option
                      </Button>
                    </div>
                  )}

                  {newQuestionType === "MULTIPLE_CHOICE" && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">
                          Options & Correct Answers <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] text-slate-500">Check all options that are correct</span>
                      </div>
                      <div className="space-y-2">
                        {newQuestionOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={opt.isCorrect}
                              onChange={() => handleToggleMultiCorrect(idx)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="w-5 text-xs font-mono font-bold text-slate-400">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <Input
                              placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                              value={opt.optionText}
                              onChange={(e) => handleUpdateOptionText(idx, e.target.value)}
                              className="text-xs flex-1"
                            />
                            {newQuestionOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddOption}
                        className="text-xs text-indigo-600 hover:bg-indigo-50 gap-1 mt-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Option
                      </Button>
                    </div>
                  )}

                  {newQuestionType === "TRUE_FALSE" && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <label className="block text-xs font-semibold text-slate-700">
                        Correct Answer <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setTrueFalseCorrect("True")}
                          className={`p-3 rounded-lg border text-center font-semibold text-xs transition-all ${
                            trueFalseCorrect === "True"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          True
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrueFalseCorrect("False")}
                          className={`p-3 rounded-lg border text-center font-semibold text-xs transition-all ${
                            trueFalseCorrect === "False"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          False
                        </button>
                      </div>
                    </div>
                  )}

                  {newQuestionType === "SHORT_ANSWER" && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <label className="block text-xs font-semibold text-slate-700">
                        Accepted Key Answer (Optional Reference)
                      </label>
                      <Input
                        placeholder="e.g. O(log n)"
                        value={shortAnswerExpected}
                        onChange={(e) => setShortAnswerExpected(e.target.value)}
                        className="text-xs"
                      />
                      <p className="text-[11px] text-slate-400">
                        Students provide a concise text response. Instructor verifies accuracy during grading.
                      </p>
                    </div>
                  )}

                  {newQuestionType === "ESSAY" && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <HelpCircle className="h-4 w-4 text-amber-600" />
                        Subjective Essay Question
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Students are provided a rich text editor. The examination system flags essay answers for manual evaluation by the instructor before final marks are released.
                      </p>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Instructor Explanation / Solution Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Add rubric notes or explanation shown to instructor during grading..."
                      value={newQuestionExplanation}
                      onChange={(e) => setNewQuestionExplanation(e.target.value)}
                      className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search existing course questions..."
                      value={importSearch}
                      onChange={(e) => setImportSearch(e.target.value)}
                      className="text-xs pl-8"
                    />
                  </div>

                  {importableQuestions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No other course questions available to import. Use the 'Create New Question' tab.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {importableQuestions.map((q) => {
                        const isSelected = selectedImportIds.includes(q.id);
                        return (
                          <div
                            key={q.id}
                            onClick={() => {
                              setSelectedImportIds((prev) =>
                                isSelected ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                              );
                            }}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                              isSelected
                                ? "bg-indigo-50/70 border-indigo-300"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Badge className="text-[9px] bg-slate-100 text-slate-700 py-0 border-0">
                                  {q.questionType.replace("_", " ")}
                                </Badge>
                                <span className="text-[10px] text-slate-400">({q.defaultMarks || 1} M)</span>
                              </div>
                              <p className="text-slate-800 font-medium line-clamp-2">{q.questionText}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {modalTab === "create"
                  ? `Configuring ${newQuestionMarks} mark(s) question`
                  : `${selectedImportIds.length} question(s) selected`}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuestionModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                {modalTab === "create" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={creatingQuestion}
                    onClick={handleCreateAndAddQuestion}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                  >
                    {creatingQuestion ? (
                      <>Creating...</>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Create & Add to Exam
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={selectedImportIds.length === 0}
                    onClick={handleImportQuestions}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Import ({selectedImportIds.length}) Questions
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
