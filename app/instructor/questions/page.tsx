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
  Question,
  QuestionCategory,
  QuestionType,
  DifficultyLevel,
} from "@/types/question";
import { Course } from "@/types/academic";
import {
  FileQuestion,
  Plus,
  Search,
  Filter,
  Eye,
  Copy,
  Edit3,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Layers,
  BookOpen,
  X,
  Lock,
  Unlock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function QuestionBankListPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");

  // Preview Modal
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [qRes, cRes, catRes] = await Promise.all([
        questionApi.getQuestions({
          search: search || undefined,
          courseId: selectedCourse ? Number(selectedCourse) : undefined,
          categoryId: selectedCategory ? Number(selectedCategory) : undefined,
          type: (selectedType as QuestionType) || undefined,
          difficulty: (selectedDifficulty as DifficultyLevel) || undefined,
          myQuestionsOnly: true,
          size: 100,
        }),
        academicApi.getCourses(),
        questionApi.getCategories(),
      ]);

      setQuestions(qRes.data.content);
      setCourses(cRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCourse, selectedCategory, selectedType, selectedDifficulty]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleDuplicate = async (id: number) => {
    try {
      await questionApi.duplicateQuestion(id);
      toast.success("Question duplicated successfully for exam reuse");
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to duplicate question");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to archive this question?")) return;
    try {
      await questionApi.deleteQuestion(id);
      toast.success("Question archived successfully");
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to archive question");
    }
  };

  // Metric Computations
  const totalQuestions = questions.length;
  const singleChoiceCount = questions.filter((q) => q.questionType === "SINGLE_CHOICE").length;
  const multiChoiceCount = questions.filter((q) => q.questionType === "MULTIPLE_CHOICE").length;
  const trueFalseCount = questions.filter((q) => q.questionType === "TRUE_FALSE").length;
  const shortAnswerCount = questions.filter((q) => q.questionType === "SHORT_ANSWER").length;
  const essayCount = questions.filter((q) => q.questionType === "ESSAY").length;

  const getDifficultyBadge = (level: DifficultyLevel) => {
    switch (level) {
      case "EASY":
        return <Badge className="bg-emerald-600 text-white font-medium text-[11px]">EASY</Badge>;
      case "MEDIUM":
        return <Badge className="bg-amber-600 text-white font-medium text-[11px]">MEDIUM</Badge>;
      case "HARD":
        return <Badge className="bg-rose-600 text-white font-medium text-[11px]">HARD</Badge>;
    }
  };

  const getTypeBadge = (type: QuestionType) => {
    switch (type) {
      case "SINGLE_CHOICE":
        return <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-950/40">MCQ Single</Badge>;
      case "MULTIPLE_CHOICE":
        return <Badge variant="outline" className="border-purple-500/40 text-purple-400 bg-purple-950/40">MCQ Multi</Badge>;
      case "TRUE_FALSE":
        return <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 bg-cyan-950/40">True / False</Badge>;
      case "SHORT_ANSWER":
        return <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-950/40">Short Answer</Badge>;
      case "ESSAY":
        return <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-950/40">Essay</Badge>;
    }
  };

  return (
    <DashboardShell allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN", "ROLE_EXAM_OFFICER"]}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileQuestion className="w-6 h-6 text-blue-400" />
              Question Bank Repository
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Curate, version, and preview questions across courses and difficulty levels for examinations
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/instructor/questions/categories">
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                <Layers className="w-4 h-4 mr-1.5" />
                Categories
              </Button>
            </Link>
            <Link href="/instructor/questions/create">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Question
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardContent className="p-3.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Questions</div>
              <div className="text-2xl font-bold text-white mt-0.5">{totalQuestions}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardContent className="p-3.5">
              <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">MCQ Single</div>
              <div className="text-2xl font-bold text-blue-400 mt-0.5">{singleChoiceCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardContent className="p-3.5">
              <div className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">MCQ Multiple</div>
              <div className="text-2xl font-bold text-purple-400 mt-0.5">{multiChoiceCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardContent className="p-3.5">
              <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">True / False</div>
              <div className="text-2xl font-bold text-cyan-400 mt-0.5">{trueFalseCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardContent className="p-3.5">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Short Answer</div>
              <div className="text-2xl font-bold text-emerald-400 mt-0.5">{shortAnswerCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardContent className="p-3.5">
              <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Essay Subjective</div>
              <div className="text-2xl font-bold text-amber-400 mt-0.5">{essayCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search Toolbar */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardContent className="p-4">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <Input
                  placeholder="Search question text..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-950 border-slate-800 pl-9 text-xs text-white"
                />
              </div>

              <div>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200"
                >
                  <option value="">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200"
                >
                  <option value="">All Question Types</option>
                  <option value="SINGLE_CHOICE">Single Choice (MCQ)</option>
                  <option value="MULTIPLE_CHOICE">Multiple Choice (MCQ)</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                  <option value="ESSAY">Essay</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200"
                >
                  <option value="">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Questions Table */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-sm text-slate-400">Loading questions from bank...</div>
            ) : questions.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">
                No questions found matching your criteria. Try adjusting filters or create a new question.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Question Prompt</th>
                      <th className="p-3">Course</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Difficulty</th>
                      <th className="p-3">Marks</th>
                      <th className="p-3">Author & Ver</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {questions.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-800/40">
                        <td className="p-3 max-w-md">
                          <div className="font-medium text-white line-clamp-2">{q.questionText}</div>
                          {q.categoryName && (
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              Category: {q.categoryName}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-semibold text-blue-400 whitespace-nowrap">
                          {q.courseCode}
                        </td>
                        <td className="p-3 whitespace-nowrap">{getTypeBadge(q.questionType)}</td>
                        <td className="p-3 whitespace-nowrap">{getDifficultyBadge(q.difficultyLevel)}</td>
                        <td className="p-3 font-semibold text-white whitespace-nowrap">
                          {q.defaultMarks} pts
                        </td>
                        <td className="p-3 whitespace-nowrap text-slate-400">
                          <div className="text-slate-200">{q.createdByName}</div>
                          <span className="text-[10px] text-slate-500 font-mono">v{q.version}</span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setPreviewQuestion(q);
                              setShowAnswerKey(false);
                            }}
                            title="Preview Question"
                            className="text-slate-300 hover:text-white hover:bg-slate-800 p-1.5 h-8 w-8"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicate(q.id)}
                            title="Duplicate for Exam Reuse"
                            className="text-slate-300 hover:text-blue-400 hover:bg-slate-800 p-1.5 h-8 w-8"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Link href={`/instructor/questions/${q.id}/edit`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Edit Question"
                              className="text-slate-300 hover:text-amber-400 hover:bg-slate-800 p-1.5 h-8 w-8"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(q.id)}
                            title="Archive Question"
                            className="text-slate-300 hover:text-red-400 hover:bg-slate-800 p-1.5 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PREVIEW QUESTION MODAL */}
        {previewQuestion && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl w-full">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {getTypeBadge(previewQuestion.questionType)}
                  {getDifficultyBadge(previewQuestion.difficultyLevel)}
                  <span className="text-xs text-slate-400">({previewQuestion.defaultMarks} Marks)</span>
                </div>
                <button
                  onClick={() => setPreviewQuestion(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Question Prompt */}
                <div className="text-sm font-semibold text-white leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {previewQuestion.questionText}
                </div>

                {/* Question Options Simulation */}
                {previewQuestion.questionType === "ESSAY" ? (
                  <div className="border border-dashed border-slate-700 rounded-xl p-6 text-center text-xs text-slate-400 bg-slate-950/50">
                    <p className="font-semibold text-slate-300 mb-1">Subjective Essay Question</p>
                    <p>Students will be provided an open-ended multi-line rich text editor during examination.</p>
                  </div>
                ) : previewQuestion.options && previewQuestion.options.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Question Options:
                    </div>
                    {previewQuestion.options.map((opt, idx) => {
                      const isCorrect = Boolean(opt.isCorrect);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${
                            showAnswerKey && isCorrect
                              ? "bg-emerald-950/40 border-emerald-600/70 text-emerald-300 font-medium"
                              : "bg-slate-950 border-slate-800 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-mono">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span>{opt.optionText}</span>
                          </div>
                          {showAnswerKey && isCorrect && (
                            <Badge className="bg-emerald-600 text-white text-[10px]">Correct Answer</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Teacher Answer Key Toggle & Explanation */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAnswerKey(!showAnswerKey)}
                    className="border-slate-700 text-xs text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    {showAnswerKey ? <Unlock className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 mr-1.5" />}
                    {showAnswerKey ? "Hide Answer Key" : "Reveal Instructor Answer Key"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewQuestion(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    Close Preview
                  </Button>
                </div>

                {showAnswerKey && previewQuestion.explanation && (
                  <div className="bg-blue-950/40 border border-blue-800/60 p-3 rounded-xl text-xs text-blue-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Pedagogical Explanation / Instructor Rubric:
                    </div>
                    <p className="text-slate-300">{previewQuestion.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
