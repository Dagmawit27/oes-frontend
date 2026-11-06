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
import { CourseExamRosterItem, isGradingCompleted } from "@/types/result";
import {
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
  FileCheck2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

interface GradingQueueItem extends CourseExamRosterItem {
  examinationId: number;
  examinationTitle?: string;
  courseTitle?: string;
}

function InstructorGradingQueueContent() {
  const searchParams = useSearchParams();
  const urlExamId = searchParams.get("examId");

  const [exams, setExams] = useState<Examination[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(urlExamId || "ALL");
  const [queueItems, setQueueItems] = useState<GradingQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"PENDING" | "COMPLETED" | "ALL">("PENDING");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await examApi.getExaminations({ myExamsOnly: true, size: 100 });
      if (res.success && res.data) {
        const examList = [...res.data.content].sort((a, b) => b.id - a.id);
        setExams(examList);

        const targetExams = (selectedExamId !== "ALL" && selectedExamId)
          ? examList.filter((e) => e.id === Number(selectedExamId))
          : examList;

        const allAttempts: GradingQueueItem[] = [];
        await Promise.all(
          targetExams.map(async (exam) => {
            try {
              const rosterRes = await resultApi.getInstructorExamResults(exam.id);
              if (rosterRes.success && rosterRes.data) {
                rosterRes.data.forEach((item) => {
                  // Only include students who actually attempted or submitted
                  if (item.attemptId && item.attemptStatus && item.attemptStatus !== "Not Attempted" && item.attemptStatus !== "NOT_ATTEMPTED") {
                    allAttempts.push({
                      ...item,
                      examinationId: exam.id,
                      examinationTitle: exam.title,
                      courseTitle: exam.courseCode ? `${exam.courseCode} - ${exam.courseName || ""}` : (exam.courseName || ""),
                    });
                  }
                });
              }
            } catch {
              // ignore per-exam error
            }
          })
        );

        setQueueItems(allAttempts);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load grading queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedExamId]);

  // Filter queue
  const filteredQueue = useMemo(() => {
    return queueItems.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        item.studentName.toLowerCase().includes(q) ||
        item.registrationNumber.toLowerCase().includes(q) ||
        (item.examinationTitle && item.examinationTitle.toLowerCase().includes(q));

      const isGraded = isGradingCompleted(item.gradingStatus);

      let matchTab = true;
      if (filterTab === "PENDING") {
        matchTab = !isGraded;
      } else if (filterTab === "COMPLETED") {
        matchTab = isGraded;
      }

      return matchSearch && matchTab;
    });
  }, [queueItems, search, filterTab]);

  // Stats
  const totalAttempts = queueItems.length;
  const completedGradingCount = queueItems.filter(
    (i) => isGradingCompleted(i.gradingStatus)
  ).length;
  const pendingGradingCount = totalAttempts - completedGradingCount;

  return (
    <ProtectedRoute allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Header Card */}
          <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  <PenTool className="w-3.5 h-3.5 text-sky-600" />
                  Manual Evaluation
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Manual Grading & Scoring Queue
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Review subjective student responses, verify auto-graded questions, award marks, and finalize course submissions.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 text-xs h-9"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Link href="/instructor/results">
                <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5 text-xs h-9 shadow-xs">
                  <Award className="w-4 h-4" />
                  Course Results
                </Button>
              </Link>
            </div>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Awaiting Evaluation</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{pendingGradingCount}</p>
                  <p className="text-[11px] text-amber-600 font-medium">Submissions needing scoring</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Grading Completed</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{completedGradingCount}</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Ready for officer release</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Submissions</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalAttempts}</p>
                  <p className="text-[11px] text-slate-400">Across assigned examinations</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="Search candidate name or reg number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200 text-xs h-9 text-slate-900"
                />
              </div>

              <div className="w-full sm:w-64">
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
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { key: "PENDING", label: `Awaiting (${pendingGradingCount})` },
                { key: "COMPLETED", label: `Completed (${completedGradingCount})` },
                { key: "ALL", label: `All (${totalAttempts})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filterTab === tab.key
                      ? "bg-sky-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grading Queue Table */}
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
              <p>Loading grading queue...</p>
            </div>
          ) : filteredQueue.length === 0 ? (
            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-base font-semibold text-slate-800">
                  {filterTab === "PENDING" ? "Queue is All Clear!" : "No Submissions Found"}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {filterTab === "PENDING"
                    ? "Great job! All student examination attempts have been fully evaluated."
                    : "No student attempts match your selected criteria."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white border-slate-200/90 shadow-xs overflow-hidden">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Candidate Evaluation Queue ({filteredQueue.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Click "Grade Attempt" to evaluate individual questions and assign final marks
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
                        <th className="py-3 px-4">Current Marks</th>
                        <th className="py-3 px-4">Grading Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredQueue.map((item) => {
                        const isGraded = isGradingCompleted(item.gradingStatus);

                        return (
                          <tr key={item.attemptId} className="hover:bg-slate-50/70 transition-colors">
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
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  item.attemptStatus === "Submitted" || item.attemptStatus === "SUBMITTED"
                                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {item.attemptStatus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-medium">
                              {item.earnedMarks !== null ? (
                                <span className="text-slate-900 font-bold">
                                  {Number(item.earnedMarks).toFixed(2)}{" "}
                                  <span className="text-slate-400 font-normal text-xs">
                                    / {item.totalMarks ? Number(item.totalMarks).toFixed(2) : "—"}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-amber-600 text-xs">Pending Score</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {isGraded ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Graded
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" /> Awaiting Evaluation
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <Link href={`/instructor/grading/${item.attemptId}`}>
                                <Button
                                  size="sm"
                                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8 gap-1.5 shadow-xs"
                                >
                                  <PenTool className="w-3.5 h-3.5" />
                                  {isGraded ? "Edit Grades" : "Grade Attempt"}
                                </Button>
                              </Link>
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

export default function InstructorGradingPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="py-24 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
            <p className="text-sm">Loading grading queue...</p>
          </div>
        </DashboardShell>
      }
    >
      <InstructorGradingQueueContent />
    </Suspense>
  );
}
