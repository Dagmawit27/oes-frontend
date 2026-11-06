"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resultApi } from "@/lib/api/result";
import { StudentCourseResults, StudentExamResult } from "@/types/result";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  User,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

export default function StudentResultsPage() {
  const [courseResults, setCourseResults] = useState<StudentCourseResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const response = await resultApi.getStudentResults();
      if (response.success && response.data) {
        setCourseResults(response.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load examination results.");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (courseId: number, examId: number) => {
    const key = `${courseId}-${examId}`;
    setExpandedExams((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filter courses and examinations
  const filteredCourses = courseResults
    .map((cr) => {
      const matchesCourse =
        cr.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cr.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cr.departmentName && cr.departmentName.toLowerCase().includes(searchQuery.toLowerCase()));

      const filteredExams = (cr.examinations || []).filter(
        (exam) =>
          matchesCourse ||
          exam.examinationTitle.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return {
        ...cr,
        examinations: filteredExams,
      };
    })
    .filter((cr) => cr.examinations.length > 0);

  // Aggregated summary stats (Strictly marks-based, zero pass/fail logic)
  const totalCourses = courseResults.length;
  let totalExams = 0;
  let publishedCount = 0;
  let pendingCount = 0;
  let notAttemptedCount = 0;
  let totalEarned = 0;
  let totalPossible = 0;

  courseResults.forEach((cr) => {
    (cr.examinations || []).forEach((ex) => {
      totalExams++;
      const statusLower = (ex.displayStatus || "").toLowerCase();
      if (statusLower === "published") {
        publishedCount++;
        if (ex.earnedMarks !== null) {
          totalEarned += Number(ex.earnedMarks);
          totalPossible += Number(ex.totalMarks);
        }
      } else if (statusLower === "pending") {
        pendingCount++;
      } else if (statusLower === "not attempted") {
        notAttemptedCount++;
      }
    });
  });

  return (
    <ProtectedRoute allowedRoles={["ROLE_STUDENT"]}>
      <DashboardShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                <Award className="h-8 w-8 text-primary" />
                Academic Examination Results
              </h1>
              <p className="text-slate-500 mt-1">
                Course-based examination performance records and detailed question-by-question scoring breakdown.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={loadResults}
              disabled={loading}
              className="self-start md:self-auto"
            >
              Refresh Results
            </Button>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Enrolled Courses
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{totalCourses}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <BookOpen className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Published Results
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {publishedCount}{" "}
                      <span className="text-xs font-normal text-slate-400">/ {totalExams} exams</span>
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Published Total Marks
                    </p>
                    <p className="text-2xl font-bold text-primary mt-1">
                      {totalPossible > 0 ? (
                        <>
                          {totalEarned.toFixed(2)}{" "}
                          <span className="text-xs font-normal text-slate-400">
                            / {totalPossible.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Award className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Pending Evaluation
                    </p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by course code, title, instructor, or examination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 max-w-md shadow-xs"
            />
          </div>

          {/* Results grouped by Course */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-slate-500">Loading your examination results...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 py-12 text-center">
              <CardContent className="space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No results found</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? "No courses or examinations matched your search criteria."
                    : "No examination records are currently available for your enrolled courses."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredCourses.map((course) => (
                <Card key={course.courseId} className="border-slate-200 shadow-xs overflow-hidden">
                  {/* Course Header Banner */}
                  <CardHeader className="bg-slate-50/80 border-b border-slate-200/80 py-4 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold">
                            {course.courseCode}
                          </span>
                          <CardTitle className="text-lg font-bold text-slate-900">
                            {course.courseName}
                          </CardTitle>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3.5 w-3.5" />
                            {course.semesterName}
                          </span>
                          {course.departmentName && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5" />
                              {course.departmentName}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white self-start sm:self-auto">
                        {course.examinations.length} {course.examinations.length === 1 ? "Examination" : "Examinations"}
                      </Badge>
                    </div>
                  </CardHeader>

                  {/* Examinations List in Course */}
                  <CardContent className="p-0 divide-y divide-slate-100">
                    {course.examinations.map((exam) => {
                      const isExpanded = !!expandedExams[`${course.courseId}-${exam.examinationId}`];
                      const statusLower = (exam.displayStatus || "").toLowerCase();
                      const isPublished = statusLower === "published";
                      const isNotAttempted = statusLower === "not attempted";
                      const isPending = statusLower === "pending";

                      return (
                        <div key={exam.examinationId} className="p-6 transition hover:bg-slate-50/50">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <h4 className="font-semibold text-slate-900 text-base">
                                  {exam.examinationTitle}
                                </h4>
                                {isPublished && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Published
                                  </Badge>
                                )}
                                {isPending && (
                                  <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                                    Grading Pending
                                  </Badge>
                                )}
                                {isNotAttempted && (
                                  <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                                    Not Attempted
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                {isNotAttempted
                                  ? "Candidate did not sit for this examination window."
                                  : isPending
                                  ? "Attempt submitted / Under evaluation by instructor."
                                  : exam.publishedAt
                                  ? `Published: ${new Date(exam.publishedAt).toLocaleString()}`
                                  : "Results finalized and recorded."}
                              </p>
                            </div>

                            {/* Marks & Expand Button */}
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                                  Total Marks
                                </p>
                                <p className="text-xl font-bold font-mono text-slate-900">
                                  {isPublished ? (
                                    <span className="text-emerald-700">
                                      {exam.earnedMarks !== null ? Number(exam.earnedMarks).toFixed(2) : "0.00"}
                                      <span className="text-slate-400 text-sm font-normal">
                                        {" "}
                                        / {Number(exam.totalMarks).toFixed(2)}
                                      </span>
                                    </span>
                                  ) : isNotAttempted ? (
                                    <span className="text-slate-400 text-sm font-normal">Not Attempted</span>
                                  ) : (
                                    <span className="text-amber-600 text-sm font-medium">Under Evaluation</span>
                                  )}
                                </p>
                              </div>

                              {isPublished && exam.details && exam.details.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpand(course.courseId, exam.examinationId)}
                                  className="text-slate-600 hover:text-slate-900"
                                >
                                  {isExpanded ? (
                                    <>
                                      Hide Breakdown <ChevronUp className="ml-1.5 h-4 w-4" />
                                    </>
                                  ) : (
                                    <>
                                      View Breakdown <ChevronDown className="ml-1.5 h-4 w-4" />
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Expandable Question-by-Question Breakdown */}
                          {isExpanded && exam.details && (
                            <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Question-by-Question Performance Breakdown
                              </h5>

                              <div className="space-y-3">
                                {exam.details.map((item, idx) => (
                                  <div
                                    key={item.examQuestionId || idx}
                                    className="p-4 rounded-lg bg-slate-50/80 border border-slate-100 text-sm space-y-2"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-700">
                                            Q{idx + 1}.
                                          </span>
                                          {item.questionType && (
                                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                              {item.questionType.replace(/_/g, " ")}
                                            </Badge>
                                          )}
                                          {item.isAutoGraded && (
                                            <span className="text-[10px] text-blue-600 font-medium">
                                              (Auto-Graded)
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-slate-800 font-medium">{item.questionText}</p>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="font-mono font-semibold text-slate-900">
                                          {item.awardedMarks !== null
                                            ? Number(item.awardedMarks).toFixed(2)
                                            : "Ungraded"}
                                        </span>
                                        <span className="text-slate-400 font-mono text-xs">
                                          {" "}
                                          /{" "}
                                          {item.maximumMarks !== null
                                            ? Number(item.maximumMarks).toFixed(2)
                                            : "—"}
                                        </span>
                                      </div>
                                    </div>

                                    {item.feedback && (
                                      <div className="mt-2 text-xs bg-white p-2.5 rounded border border-slate-200/60 text-slate-600">
                                        <span className="font-semibold text-slate-700">Instructor Feedback: </span>
                                        {item.feedback}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
