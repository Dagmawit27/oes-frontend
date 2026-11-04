"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Send,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export default function ExaminationsListPage() {
  const router = useRouter();
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedOffering, setSelectedOffering] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Submission Dialog
  const [submittingExam, setSubmittingExam] = useState<Examination | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [examRes, offeringRes] = await Promise.all([
        examApi.getExaminations({
          courseOfferingId: selectedOffering ? Number(selectedOffering) : undefined,
          status: selectedStatus !== "ALL" ? (selectedStatus as ExamStatus) : undefined,
          search: search || undefined,
          myExamsOnly: true,
          size: 100,
        }),
        academicApi.getMyAssignedOfferings(),
      ]);

      if (examRes.success && examRes.data) {
        setExaminations(examRes.data.content);
      }
      if (offeringRes.success && offeringRes.data) {
        setOfferings(offeringRes.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load examinations");
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

  const handleSubmitForApproval = async (exam: Examination) => {
    try {
      setIsSubmitting(true);
      const res = await examApi.submitExamination(exam.id);
      if (res.success) {
        toast.success(`Examination "${exam.title}" submitted for review!`);
        setSubmittingExam(null);
        loadData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit examination");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (exam: Examination) => {
    if (!confirm(`Are you sure you want to delete examination "${exam.title}"?`)) {
      return;
    }
    try {
      const res = await examApi.deleteExamination(exam.id);
      if (res.success) {
        toast.success("Examination deleted successfully");
        loadData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete examination");
    }
  };

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending Review</Badge>;
      case "DRAFT":
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Draft</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Rejected</Badge>;
      case "SCHEDULED":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const statusCounts = {
    ALL: examinations.length,
    DRAFT: examinations.filter((e) => e.status === "DRAFT").length,
    SUBMITTED: examinations.filter((e) => e.status === "SUBMITTED").length,
    APPROVED: examinations.filter((e) => e.status === "APPROVED").length,
    REJECTED: examinations.filter((e) => e.status === "REJECTED").length,
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <FileText className="h-7 w-7 text-indigo-600" />
              Examination Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create, configure, review marks distribution, and submit examinations for approval.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/instructor/examinations/create">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="h-4 w-4" />
                Create Examination
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {(["ALL", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedStatus(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                selectedStatus === tab
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{tab === "SUBMITTED" ? "Pending Review" : tab}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  selectedStatus === tab ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {selectedStatus === tab ? examinations.length : statusCounts[tab]}
              </span>
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
                  Apply Filter
                </Button>
                {(search || selectedOffering || selectedStatus !== "ALL") && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSearch("");
                      setSelectedOffering("");
                      setSelectedStatus("ALL");
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

        {/* Examinations List / Table */}
        <Card className="border border-slate-200 shadow-xs bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
            <div>
              <CardTitle className="text-base font-semibold text-slate-800">
                Examinations ({examinations.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Overview of examinations created for your assigned courses.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                <p className="text-sm">Loading examinations...</p>
              </div>
            ) : examinations.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <p className="text-base font-medium text-slate-600">No examinations found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {search || selectedOffering || selectedStatus !== "ALL"
                    ? "Try adjusting your search criteria or filter tags."
                    : "Get started by creating your first course examination."}
                </p>
                <Link href="/instructor/examinations/create">
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Create New Examination
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Title & Details</th>
                      <th className="py-3 px-4">Course & Section</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Questions & Marks</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {examinations.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 max-w-xs">
                          <Link
                            href={`/instructor/examinations/${exam.id}`}
                            className="font-semibold text-indigo-700 hover:text-indigo-900 line-clamp-1 text-sm"
                          >
                            {exam.title}
                          </Link>
                          {exam.description && (
                            <p className="text-slate-500 line-clamp-1 text-[11px] mt-0.5">{exam.description}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Created: {new Date(exam.createdAt).toLocaleDateString()}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-800">
                            {exam.courseCode} - {exam.courseName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Sec {exam.section} &bull; {exam.semesterName || "Semester"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {exam.durationMinutes} mins
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Limit: {exam.attemptLimit} {exam.attemptLimit === 1 ? "attempt" : "attempts"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
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
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/instructor/examinations/${exam.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>

                            {(exam.status === "DRAFT" || exam.status === "REJECTED") && (
                              <>
                                <Link href={`/instructor/examinations/${exam.id}/edit`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                                    title="Edit Examination"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </Link>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSubmittingExam(exam)}
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                                  title="Submit for Review"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(exam)}
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                                  title="Delete Draft"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Confirmation Modal */}
        {submittingExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-3 text-indigo-600 mb-3">
                <Send className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-900">Submit Examination</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you ready to submit <strong className="text-slate-800">"{submittingExam.title}"</strong> for review
                by the Exam Officer?
              </p>
              <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1 border border-slate-200">
                <div>&bull; Total Questions: <strong>{submittingExam.questionCount}</strong></div>
                <div>&bull; Total Marks: <strong>{submittingExam.totalMarks}</strong></div>
                <div>&bull; Duration: <strong>{submittingExam.durationMinutes} minutes</strong></div>
                <div>&bull; Once submitted, it cannot be modified until reviewed by the Exam Officer.</div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSubmittingExam(null)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSubmitForApproval(submittingExam)}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  {isSubmitting ? "Submitting..." : "Confirm & Submit"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
