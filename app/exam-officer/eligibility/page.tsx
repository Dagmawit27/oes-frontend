"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scheduleApi } from "@/lib/api/schedule";
import { ExamSchedule, ScheduleStatus } from "@/types/schedule";
import {
  Users,
  Search,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Building,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function ExamOfficerEligibilityOverviewPage() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const res = await scheduleApi.getSchedules({ size: 100 });
      if (res.success && res.data) {
        setSchedules(res.data.content);
      }
    } catch {
      toast.error("Failed to load examination schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const filteredSchedules = schedules.filter((s) => {
    const matchSearch =
      search.trim() === "" ||
      s.examinationTitle.toLowerCase().includes(search.toLowerCase()) ||
      (s.courseCode && s.courseCode.toLowerCase().includes(search.toLowerCase())) ||
      (s.courseName && s.courseName.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === "ALL" || s.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const totalEligibleCandidates = schedules.reduce(
    (acc, s) => acc + (s.eligibleStudentCount || 0),
    0
  );

  return (
    <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                Candidate Management
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Student Examination Eligibility
            </h1>
            <p className="text-sm text-slate-500">
              Audit candidate rosters, verify enrollment prerequisites, and grant administrative exemptions.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={loadSchedules}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Rosters
          </Button>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-slate-200 shadow-xs">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Total Enrolled Candidates</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">
                    {totalEligibleCandidates}
                  </p>
                  <p className="text-xs text-slate-500">Across scheduled examinations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-xs">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Scheduled Exams</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">
                    {schedules.filter((s) => s.status === "SCHEDULED" || s.status === "RESCHEDULED").length}
                  </p>
                  <p className="text-xs text-slate-500">Active sessions pending or in progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-xs">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Eligibility Integrity</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">Automated</p>
                  <p className="text-xs text-slate-500">Synchronized with Course Enrollment</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search examination or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ONGOING">Ongoing</option>
              <option value="RESCHEDULED">Rescheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Schedules / Roster Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Examination</th>
                <th className="py-3 px-4">Course & Section</th>
                <th className="py-3 px-4">Scheduled Window</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Candidate Count</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    Loading examination rosters...
                  </td>
                </tr>
              ) : filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No examination schedules found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((schedule) => {
                  const start = new Date(schedule.scheduledStartAt);
                  const close = new Date(schedule.scheduledCloseAt);

                  return (
                    <tr key={schedule.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{schedule.examinationTitle}</p>
                        <p className="text-xs text-slate-500">
                          Duration: {schedule.durationMinutes} mins • Total: {schedule.totalMarks} pts
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">{schedule.courseCode}</span>
                        <p className="text-xs text-slate-500">
                          {schedule.courseName} • Sec {schedule.section || "A"}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1 font-medium text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {start.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {close.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          className={
                            schedule.status === "SCHEDULED"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : schedule.status === "ONGOING"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : schedule.status === "RESCHEDULED"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : schedule.status === "CANCELLED"
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : "bg-slate-100 text-slate-800 border-slate-200"
                          }
                        >
                          {schedule.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <span>{schedule.eligibleStudentCount} Students</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/exam-officer/scheduling/${schedule.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          >
                            <span>Manage Roster</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
