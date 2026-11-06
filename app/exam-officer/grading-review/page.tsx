"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  CheckCircle2,
  Clock,
  Award,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  FileCheck2,
  AlertCircle,
  Users,
  ShieldCheck,
  Send,
} from "lucide-react";
import { toast } from "sonner";

interface ExamGradingSummary {
  exam: Examination;
  totalCandidates: number;
  attemptedCount: number;
  gradedCount: number;
  pendingGradingCount: number;
  publishedCount: number;
  readyToPublishCount: number;
}

export default function ExamOfficerGradingReviewPage() {
  const [loading, setLoading] = useState(true);
  const [examSummaries, setExamSummaries] = useState<ExamGradingSummary[]>([]);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "READY" | "PENDING" | "PUBLISHED">("ALL");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await examApi.getExaminations({ size: 100 });
      if (res.success && res.data) {
        const exams = [...res.data.content].sort((a, b) => b.id - a.id);

        // Fetch roster for each exam to compute grading audit stats
        const summaries: ExamGradingSummary[] = await Promise.all(
          exams.map(async (exam) => {
            try {
              const rosterRes = await resultApi.getOfficerExamResults(exam.id);
              const roster: CourseExamRosterItem[] = (rosterRes.success && rosterRes.data) ? rosterRes.data : [];

              const totalCandidates = roster.length;
              const attemptedCount = roster.filter(
                (r) => r.attemptStatus && r.attemptStatus !== "NOT_ATTEMPTED"
              ).length;
              const gradedCount = roster.filter((r) => isGradingCompleted(r.gradingStatus)).length;
              const pendingGradingCount = roster.filter(
                (r) => r.attemptStatus && r.attemptStatus.toUpperCase() === "SUBMITTED" && !isGradingCompleted(r.gradingStatus)
              ).length;
              const publishedCount = roster.filter((r) => isResultPublished(r.publicationStatus)).length;
              const readyToPublishCount = roster.filter(
                (r) => isGradingCompleted(r.gradingStatus) && !isResultPublished(r.publicationStatus)
              ).length;

              return {
                exam,
                totalCandidates,
                attemptedCount,
                gradedCount,
                pendingGradingCount,
                publishedCount,
                readyToPublishCount,
              };
            } catch {
              return {
                exam,
                totalCandidates: 0,
                attemptedCount: 0,
                gradedCount: 0,
                pendingGradingCount: 0,
                publishedCount: 0,
                readyToPublishCount: 0,
              };
            }
          })
        );

        setExamSummaries(summaries);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load examination grading summaries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered summaries
  const filteredSummaries = examSummaries.filter((s) => {
    const matchSearch =
      search.trim() === "" ||
      s.exam.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.exam.courseCode && s.exam.courseCode.toLowerCase().includes(search.toLowerCase())) ||
      (s.exam.courseName && s.exam.courseName.toLowerCase().includes(search.toLowerCase())) ||
      (s.exam.createdByName && s.exam.createdByName.toLowerCase().includes(search.toLowerCase()));

    let matchTab = true;
    if (filterTab === "READY") {
      matchTab = s.readyToPublishCount > 0;
    } else if (filterTab === "PENDING") {
      matchTab = s.pendingGradingCount > 0;
    } else if (filterTab === "PUBLISHED") {
      matchTab = s.publishedCount > 0 && s.readyToPublishCount === 0;
    }

    return matchSearch && matchTab;
  });

  // Aggregate stats
  const totalExams = examSummaries.length;
  const totalReadyToPublish = examSummaries.reduce((acc, s) => acc + s.readyToPublishCount, 0);
  const totalPendingGrading = examSummaries.reduce((acc, s) => acc + s.pendingGradingCount, 0);
  const totalPublishedResults = examSummaries.reduce((acc, s) => acc + s.publishedCount, 0);

  return (
    <ProtectedRoute allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Top Header Card */}
          <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  Academic Quality Assurance
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Grading Review & Quality Audit
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Audit instructor manual grading progress, inspect score distributions, and verify ready examination batches before publication.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Link href="/exam-officer/results">
                <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5 text-xs shadow-xs">
                  <Award className="w-4 h-4" />
                  Results Publication Portal
                </Button>
              </Link>
            </div>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Examinations</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalExams}</p>
                  <p className="text-[11px] text-slate-500">Under evaluation</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ready to Publish</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalReadyToPublish}</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Grading fully completed</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Evaluation</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalPendingGrading}</p>
                  <p className="text-[11px] text-slate-500">Awaiting teacher scoring</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/60">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Published Results</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalPublishedResults}</p>
                  <p className="text-[11px] text-slate-500">Visible to candidates</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search examination or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: "ALL", label: "All Examinations" },
                { key: "READY", label: `Ready for Release (${totalReadyToPublish})` },
                { key: "PENDING", label: `Pending Marking (${totalPendingGrading})` },
                { key: "PUBLISHED", label: "Released" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
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

          {/* Examinations Grading Table */}
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
              <p>Auditing examination grading statuses...</p>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <Card className="bg-white border-slate-200/90 shadow-xs">
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-base font-semibold text-slate-800">No Examinations Found</p>
                <p className="text-xs text-slate-500 mt-1">
                  {search
                    ? "No examinations match your current filter search."
                    : "No examinations are currently awaiting grading review."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white border-slate-200/90 shadow-xs overflow-hidden">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Examination Evaluation Roster ({filteredSummaries.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Review grading completeness, identify pending subjective answers, and proceed to publish results
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 font-semibold text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Examination</th>
                        <th className="py-3 px-4">Course & Section</th>
                        <th className="py-3 px-4">Instructor</th>
                        <th className="py-3 px-4">Attempts / Enrolled</th>
                        <th className="py-3 px-4">Grading Status</th>
                        <th className="py-3 px-4">Publication Ready</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSummaries.map(({ exam, totalCandidates, attemptedCount, gradedCount, pendingGradingCount, publishedCount, readyToPublishCount }) => (
                        <tr key={exam.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 max-w-xs">
                            <Link
                              href={`/exam-officer/results?examId=${exam.id}`}
                              className="font-semibold text-sky-700 hover:text-sky-900 text-sm line-clamp-1"
                            >
                              {exam.title}
                            </Link>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {exam.questionCount} Questions &bull; {exam.totalMarks} Marks
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-800">
                              {exam.courseCode} - {exam.courseName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Section {exam.section} &bull; {exam.semesterName}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{exam.createdByName || "Faculty"}</div>
                            <div className="text-[11px] text-slate-400">{exam.createdByEmail}</div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-900">{attemptedCount}</span>
                            <span className="text-slate-400"> attempted</span>
                            <span className="text-slate-400 block text-[11px]">
                              of {totalCandidates} enrolled
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {attemptedCount === 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                No Submissions
                              </span>
                            ) : pendingGradingCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                {pendingGradingCount} Pending Marking
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                {gradedCount} Graded
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {readyToPublishCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                <Send className="w-3 h-3 text-sky-600" />
                                {readyToPublishCount} Ready for Release
                              </span>
                            ) : publishedCount > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                All {publishedCount} Published
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Draft</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Link href={`/exam-officer/results?examId=${exam.id}`}>
                              <Button
                                size="sm"
                                className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8 gap-1.5 shadow-xs"
                              >
                                Review & Publish
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
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
