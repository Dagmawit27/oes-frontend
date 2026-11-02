"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { examApi } from "@/lib/api/exam";
import { academicApi } from "@/lib/api/academic";
import { Examination, ExamStatus } from "@/types/exam";
import { CourseOffering } from "@/types/academic";
import {
  ClipboardCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  ArrowRight,
  Eye,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function ExamOfficerApprovalsPage() {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedOffering, setSelectedOffering] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("SUBMITTED"); // Default to pending review queue!

  const loadData = async () => {
    try {
      setLoading(true);
      const [examRes, offeringRes] = await Promise.all([
        examApi.getExaminations({
          courseOfferingId: selectedOffering ? Number(selectedOffering) : undefined,
          status: selectedStatus !== "ALL" ? (selectedStatus as ExamStatus) : undefined,
          search: search || undefined,
        }),
        academicApi.getCourseOfferings(),
      ]);

      if (examRes.success && examRes.data) {
        setExaminations(examRes.data.content);
      }
      if (offeringRes.success && offeringRes.data) {
        setOfferings(offeringRes.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load examination queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedOffering, selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Awaiting Review</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Rejected</Badge>;
      case "SCHEDULED":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="h-7 w-7 text-indigo-600" />
              Examination Approvals Queue
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Audit submitted examinations, inspect question distributions, verify marks, and grant scheduling approvals.
            </p>
          </div>
        </div>

        {/* Status Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {(["SUBMITTED", "APPROVED", "REJECTED", "ALL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedStatus(tab)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                selectedStatus === tab
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{tab === "SUBMITTED" ? "Pending Review" : tab}</span>
              {tab === "SUBMITTED" && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold">
                  Active
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search examinations by title or course..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200 text-sm"
                />
              </div>

              <div>
                <select
                  value={selectedOffering}
                  onChange={(e) => setSelectedOffering(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Course Offerings</option>
                  {offerings.map((co) => (
                    <option key={co.id} value={co.id}>
                      {co.courseCode} - {co.courseName} (Sec {co.section})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="secondary" className="w-full gap-2 text-xs h-9">
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                </Button>
                {(search || selectedOffering || selectedStatus !== "SUBMITTED") && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSearch("");
                      setSelectedOffering("");
                      setSelectedStatus("SUBMITTED");
                    }}
                    className="text-xs h-9 text-slate-500"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Examinations Queue Table */}
        <Card className="border border-slate-200 shadow-xs bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
            <div>
              <CardTitle className="text-base font-semibold text-slate-800">
                Examination Approvals ({examinations.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Review submissions and manage examination status transitions.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                <p className="text-sm">Loading examination queue...</p>
              </div>
            ) : examinations.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <p className="text-base font-medium text-slate-600">No examinations pending</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {selectedStatus === "SUBMITTED"
                    ? "Great job! There are currently no examinations awaiting officer review."
                    : "No examinations match the selected filter criteria."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Examination</th>
                      <th className="py-3 px-4">Course & Section</th>
                      <th className="py-3 px-4">Instructor</th>
                      <th className="py-3 px-4">Questions & Marks</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {examinations.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 max-w-xs">
                          <Link
                            href={`/exam-officer/approvals/${exam.id}`}
                            className="font-semibold text-indigo-700 hover:text-indigo-900 line-clamp-1 text-sm"
                          >
                            {exam.title}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {exam.durationMinutes} mins &bull; {exam.attemptLimit} attempt(s)
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-800">
                            {exam.courseCode} - {exam.courseName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Sec {exam.section} &bull; {exam.semesterName}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                            {exam.createdByName || "Instructor"}
                          </div>
                          <div className="text-[11px] text-slate-400">{exam.createdByEmail}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-amber-500" />
                            {exam.totalMarks} Marks
                            <span className="text-[11px] font-normal text-slate-500">
                              (Pass: {exam.passingMarks})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {exam.questionCount} {exam.questionCount === 1 ? "Question" : "Questions"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(exam.status)}</td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Link href={`/exam-officer/approvals/${exam.id}`}>
                            {exam.status === "SUBMITTED" ? (
                              <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 font-medium"
                              >
                                Review Exam
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="text-xs gap-1.5 text-slate-600">
                                <Eye className="h-3.5 w-3.5" />
                                Inspect Audit
                              </Button>
                            )}
                          </Link>
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
  );
}
