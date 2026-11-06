"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { examApi } from "@/lib/api/exam";
import { resultApi } from "@/lib/api/result";
import { Examination } from "@/types/exam";
import { CourseExamRosterItem, isGradingCompleted, isResultPublished } from "@/types/result";
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowRight,
  PenTool,
  RefreshCw,
  Award,
  Users,
  BookOpen,
  FileSpreadsheet,
  AlertCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

interface SubmissionRow extends CourseExamRosterItem {
  examinationId: number;
  examinationTitle?: string;
  courseTitle?: string;
}

function InstructorSubmissionsContent() {
  const searchParams = useSearchParams();
  const urlExamId = searchParams.get("examId");

  const [exams, setExams] = useState<Examination[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(urlExamId || "ALL");
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Load instructor exams
  const loadExamsAndSubmissions = async () => {
    try {
      setLoading(true);
      const res = await examApi.getExaminations({ myExamsOnly: true, size: 100 });
      if (res.success && res.data) {
        const examList = [...res.data.content].sort((a, b) => b.id - a.id);
        setExams(examList);

        // Fetch rosters across exams
        const targetExams = (selectedExamId !== "ALL" && selectedExamId)
          ? examList.filter((e) => e.id === Number(selectedExamId))
          : examList;

        const allRows: SubmissionRow[] = [];
        await Promise.all(
          targetExams.map(async (exam) => {
            try {
              const rosterRes = await resultApi.getInstructorExamResults(exam.id);
              if (rosterRes.success && rosterRes.data) {
                rosterRes.data.forEach((item) => {
                  allRows.push({
                    ...item,
                    examinationId: exam.id,
                    examinationTitle: exam.title,
                    courseTitle: exam.courseCode ? `${exam.courseCode} - ${exam.courseName || ""}` : (exam.courseName || ""),
                  });
                });
              }
            } catch {
              // ignore per-exam roster error
            }
          })
        );

        setSubmissions(allRows);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load examination submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamsAndSubmissions();
  }, [selectedExamId]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        s.studentName.toLowerCase().includes(q) ||
        s.registrationNumber.toLowerCase().includes(q) ||
        (s.examinationTitle && s.examinationTitle.toLowerCase().includes(q)) ||
        (s.courseTitle && s.courseTitle.toLowerCase().includes(q));

      let matchStatus = true;
      if (statusFilter === "SUBMITTED") {
        matchStatus = s.attemptStatus === "Submitted" || s.attemptStatus === "SUBMITTED";
      } else if (statusFilter === "IN_PROGRESS") {
        matchStatus = s.attemptStatus === "In Progress" || s.attemptStatus === "IN_PROGRESS";
      } else if (statusFilter === "EXPIRED") {
        matchStatus = s.attemptStatus === "Expired" || s.attemptStatus === "EXPIRED";
      } else if (statusFilter === "PENDING_GRADING") {
        matchStatus = !isGradingCompleted(s.gradingStatus) && (s.attemptStatus !== "Not Attempted" && s.attemptStatus !== "NOT_ATTEMPTED");
      } else if (statusFilter === "COMPLETED") {
        matchStatus = isGradingCompleted(s.gradingStatus);
      } else if (statusFilter === "NOT_ATTEMPTED") {
        matchStatus = s.attemptStatus === "Not Attempted" || s.attemptStatus === "NOT_ATTEMPTED" || !s.attemptStatus;
      }

      return matchSearch && matchStatus;
    });
  }, [submissions, search, statusFilter]);

  // Aggregate stats
  const totalEnrolled = submissions.length;
  const attemptedCount = submissions.filter(
    (s) => s.attemptStatus && s.attemptStatus !== "Not Attempted" && s.attemptStatus !== "NOT_ATTEMPTED"
  ).length;
  const gradedCount = submissions.filter(
    (s) => isGradingCompleted(s.gradingStatus)
  ).length;
  const pendingGradingCount = attemptedCount - gradedCount;

  return (
    <ProtectedRoute allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Header Card */}
          <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  <ClipboardCheck className="w-3.5 h-3.5 text-sky-600" />
                  Candidate Assessments
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Student Examination Submissions
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Inspect student attempt activities, verify submitted answers, award manual marks, and track evaluation progress.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={loadExamsAndSubmissions}
                disabled={loading}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 text-xs h-9"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Link href="/instructor/grading">
                <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5 text-xs h-9 shadow-xs">
                  <PenTool className="w-3.5 h-3.5" />
                  Manual Grading Queue
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Submissions</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{attemptedCount}</p>
                  <p className="text-[11px] text-slate-400">Total student attempts</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Graded</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{gradedCount}</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Evaluation finalized</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Grading</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{pendingGradingCount}</p>
                  <p className="text-[11px] text-amber-600 font-medium">Awaiting evaluation</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/60">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Enrolled</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalEnrolled}</p>
                  <p className="text-[11px] text-slate-400">Candidates in course roster</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="bg-white border-slate-200/90 shadow-xs">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search candidate name or reg number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200 text-xs h-9 text-slate-900"
                  />
                </div>

                <div>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
                  >
                    <option value="ALL">All Examinations ({exams.length})</option>
                    {exams.map((ex) => (
                      <option key={ex.id} value={String(ex.id)}>
                        {ex.title} ({ex.courseCode || "Course"}) - {ex.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
                  >
                    <option value="ALL">All Attempt Statuses</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="PENDING_GRADING">Pending Manual Grading</option>
                    <option value="COMPLETED">Grading Completed</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="NOT_ATTEMPTED">Not Attempted</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submissions Table */}
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
              <p>Loading candidate submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="py-16 text-center">
                <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-base font-semibold text-slate-800">No Submissions Found</p>
                <p className="text-xs text-slate-500 mt-1">
                  {search || statusFilter !== "ALL"
                    ? "No candidate submissions match your current filter criteria."
                    : "No students have submitted attempts for this examination sitting yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white border-slate-200/90 shadow-xs overflow-hidden">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Candidate Submissions Roster ({filteredSubmissions.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Review candidate progress and evaluate submitted answers
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Reg Number</th>
                        <th className="py-3 px-4">Candidate Name</th>
                        <th className="py-3 px-4">Examination</th>
                        <th className="py-3 px-4">Attempt Status</th>
                        <th className="py-3 px-4">Grading Status</th>
                        <th className="py-3 px-4">Marks Earned</th>
                        <th className="py-3 px-4">Publication</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSubmissions.map((item, idx) => {
                        const isAttempted = item.attemptStatus && item.attemptStatus !== "Not Attempted" && item.attemptStatus !== "NOT_ATTEMPTED";
                        const isGraded = isGradingCompleted(item.gradingStatus);

                        return (
                          <tr key={item.attemptId || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-semibold text-sky-700">
                              {item.registrationNumber}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-900">
                              {item.studentName}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-slate-800 block">
                                {item.examinationTitle}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {item.courseTitle}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {item.attemptStatus === "Submitted" || item.attemptStatus === "SUBMITTED" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                  Submitted
                                </span>
                              ) : item.attemptStatus === "In Progress" || item.attemptStatus === "IN_PROGRESS" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  In Progress
                                </span>
                              ) : item.attemptStatus === "Expired" || item.attemptStatus === "EXPIRED" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  Expired
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                                  Not Attempted
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {isGraded ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Graded
                                </span>
                              ) : isAttempted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" /> Pending Review
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-medium">
                              {item.earnedMarks !== null ? (
                                <span className="text-slate-900 font-bold">
                                  {Number(item.earnedMarks).toFixed(2)}{" "}
                                  <span className="text-slate-400 font-normal text-xs">
                                    / {item.totalMarks ? Number(item.totalMarks).toFixed(2) : "—"}
                                  </span>
                                </span>
                              ) : isAttempted ? (
                                <span className="text-amber-600 text-xs">Ungraded</span>
                              ) : (
                                <span className="text-slate-400 text-xs">Not Attempted</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {isResultPublished(item.publicationStatus) ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Published
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  Draft (Officer Release)
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {item.attemptId ? (
                                <Link href={`/instructor/grading/${item.attemptId}`}>
                                  <Button
                                    size="sm"
                                    className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8 gap-1.5 shadow-xs"
                                  >
                                    <PenTool className="w-3.5 h-3.5" />
                                    {isGraded ? "Review Grades" : "Grade Attempt"}
                                  </Button>
                                </Link>
                              ) : (
                                <span className="text-slate-400 text-xs">No attempt</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}

export default function InstructorSubmissionsPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="py-24 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
            <p className="text-sm">Loading examination submissions...</p>
          </div>
        </DashboardShell>
      }
    >
      <InstructorSubmissionsContent />
    </Suspense>
  );
}
