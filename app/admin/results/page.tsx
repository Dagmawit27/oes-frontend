"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { examApi } from "@/lib/api/exam";
import { resultApi } from "@/lib/api/result";
import { Examination } from "@/types/exam";
import { CourseExamRosterItem } from "@/types/result";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  History,
  Lock,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminResultsPage() {
  const [exams, setExams] = useState<Examination[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [roster, setRoster] = useState<CourseExamRosterItem[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadExaminations();
  }, []);

  const loadExaminations = async () => {
    setLoadingExams(true);
    try {
      const res = await examApi.getExaminations({ size: 100 });
      if (res.success && res.data) {
        setExams(res.data.content);
        if (res.data.content.length > 0 && !selectedExamId) {
          setSelectedExamId(res.data.content[0].id);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load examinations.");
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      loadRoster(selectedExamId);
    }
  }, [selectedExamId]);

  const loadRoster = async (examId: number) => {
    setLoadingRoster(true);
    try {
      const res = await resultApi.getOfficerExamResults(examId);
      if (res.success && res.data) {
        setRoster(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load results roster.");
    } finally {
      setLoadingRoster(false);
    }
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const handleExportCsv = async () => {
    if (!selectedExamId || !selectedExam) return;
    try {
      toast.info("Generating official CSV results export...");
      await resultApi.downloadResultsCsv(selectedExamId, selectedExam.title);
      toast.success("CSV export downloaded successfully.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to export results CSV.");
    }
  };

  const filteredRoster = roster.filter(
    (item) =>
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalEnrolled = roster.length;
  const attemptedCount = roster.filter((r) => r.attemptStatus && r.attemptStatus !== "NOT_ATTEMPTED").length;
  const gradedCompleted = roster.filter((r) => r.gradingStatus === "COMPLETED").length;
  const publishedCount = roster.filter((r) => r.publicationStatus === "PUBLISHED").length;

  return (
    <ProtectedRoute allowedRoles={["ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                <Award className="h-8 w-8 text-primary" />
                Institutional Results & Audit Governance
              </h1>
              <p className="text-slate-500 mt-1">
                College-wide examination performance records, grading completion oversight, and institutional compliance audits.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={!selectedExamId || roster.length === 0}
              className="gap-2 border-slate-200 self-start md:self-auto"
            >
              <Download className="h-4 w-4" />
              Export RFC 4180 CSV
            </Button>
          </div>

          {/* Exam Selector */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 max-w-md">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      Filter Examination
                    </label>
                    <select
                      value={selectedExamId || ""}
                      onChange={(e) => setSelectedExamId(Number(e.target.value))}
                      disabled={loadingExams || exams.length === 0}
                      className="w-full text-sm font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                    >
                      {exams.length === 0 ? (
                        <option value="">No examinations found</option>
                      ) : (
                        exams.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.title} ({ex.courseCode || "Course"}) - {ex.status}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {selectedExam && (
                  <div className="flex items-center gap-6 text-sm text-slate-600 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200/60">
                    <div>
                      <span className="text-slate-400 text-xs block">Course</span>
                      <span className="font-semibold">{selectedExam.courseName || "General"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">Total Marks</span>
                      <span className="font-semibold font-mono">{Number(selectedExam.totalMarks).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Overview Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Enrolled</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalEnrolled}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attempted</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{attemptedCount}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Graded Completed</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{gradedCompleted}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Published Results</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{publishedCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search Box */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search candidate by name or registration number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 shadow-xs"
            />
          </div>

          {/* Institutional Results Table */}
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
              <CardTitle className="text-base font-bold text-slate-900">
                Institutional Candidate Records
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              {loadingRoster ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm text-slate-500">Loading records...</p>
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No candidate records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/40 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-6">Reg Number</th>
                        <th className="py-3 px-6">Candidate Name</th>
                        <th className="py-3 px-6">Attempt Status</th>
                        <th className="py-3 px-6">Grading Status</th>
                        <th className="py-3 px-6">Earned Marks</th>
                        <th className="py-3 px-6">Publication Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRoster.map((item) => (
                        <tr key={item.studentId} className="hover:bg-slate-50/60 transition">
                          <td className="py-4 px-6 font-mono text-xs font-medium text-slate-700">
                            {item.registrationNumber}
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-900">
                            {item.studentName}
                          </td>
                          <td className="py-4 px-6">
                            {item.attemptStatus === "SUBMITTED" ? (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200">Submitted</Badge>
                            ) : item.attemptStatus === "IN_PROGRESS" ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200">In Progress</Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 border-slate-200">Not Attempted</Badge>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {item.gradingStatus === "COMPLETED" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Badge>
                            ) : item.gradingStatus === "IN_PROGRESS" ? (
                              <Badge className="bg-purple-50 text-purple-700 border-purple-200">Draft</Badge>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-mono font-medium">
                            {item.earnedMarks !== null ? (
                              <span className="text-slate-900 font-bold">
                                {Number(item.earnedMarks).toFixed(2)}{" "}
                                <span className="text-slate-400 font-normal text-xs">
                                  / {item.totalMarks ? Number(item.totalMarks).toFixed(2) : "—"}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">
                                {item.attemptStatus === "SUBMITTED" ? "Ungraded" : "Not Attempted"}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {item.publicationStatus === "PUBLISHED" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                Published
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 border-slate-200">Draft</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
