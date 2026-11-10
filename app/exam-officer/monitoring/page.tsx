"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { monitoringApi } from "@/lib/api/monitoring";
import {
  ScheduleMonitoringSummary,
  isMonitoringSessionPassedOrClosed,
  isMonitoringSessionReadOnly,
} from "@/types/monitoring";
import { useNotifications } from "@/lib/context/NotificationContext";
import {
  Clock,
  Radio,
  Users,
  PlayCircle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  History,
} from "lucide-react";

export default function ExamMonitoringListPage() {
  const { connectionStatus } = useNotifications();
  const [schedules, setSchedules] = useState<ScheduleMonitoringSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await monitoringApi.getActiveSchedules();
      setSchedules(res.data);
      setNowMs(Date.now());
    } catch (err) {
      console.error("Failed to load monitoring schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setNowMs(Date.now());
    fetchSchedules();
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const totalEligibleAll = schedules.reduce((acc, s) => acc + s.totalEligible, 0);
  const totalActiveAll = schedules.reduce((acc, s) => acc + s.activeAttempts, 0);
  const totalSubmittedAll = schedules.reduce((acc, s) => acc + s.submittedCount, 0);

  // Sort upcoming/early/live sittings first, and already passed/closed history afterwards
  const sortedSchedules = useMemo(() => {
    const getTier = (s: ScheduleMonitoringSummary) => {
      if (isMonitoringSessionReadOnly(s, nowMs)) return 2;
      const startMs = new Date(s.scheduledStartAt).getTime();
      if (
        s.scheduleStatus === "ONGOING" ||
        (nowMs !== null && !Number.isNaN(startMs) && startMs <= nowMs)
      ) {
        return 0;
      }
      return 1;
    };

    return [...schedules].sort((a, b) => {
      const tierA = getTier(a);
      const tierB = getTier(b);
      if (tierA !== tierB) return tierA - tierB;
      const startA = new Date(a.scheduledStartAt).getTime();
      const startB = new Date(b.scheduledStartAt).getTime();
      if (Number.isNaN(startA)) return 1;
      if (Number.isNaN(startB)) return -1;
      // Live & upcoming ordered earliest-first; past history ordered most-recent-first
      return tierA < 2 ? startA - startB : startB - startA;
    });
  }, [schedules, nowMs]);

  const getStatusBadge = (s: ScheduleMonitoringSummary) => {
    const passed = isMonitoringSessionPassedOrClosed(s, nowMs);
    if (s.scheduleStatus !== "COMPLETED" && passed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          PASSED / CLOSED
        </span>
      );
    }

    switch (s.scheduleStatus) {
      case "ONGOING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ONGOING LIVE
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            SCHEDULED
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            COMPLETED
          </span>
        );
      default:
        return <Badge variant="secondary">{s.scheduleStatus}</Badge>;
    }
  };

  const formatWindow = (startStr: string, closeStr: string) => {
    try {
      const start = new Date(startStr);
      const close = new Date(closeStr);
      return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })} – ${close.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return `${startStr} – ${closeStr}`;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Live Examination Monitoring
                </h1>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    connectionStatus === "CONNECTED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      connectionStatus === "CONNECTED"
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-amber-500"
                    }`}
                  />
                  <span>
                    {connectionStatus === "CONNECTED"
                      ? "STOMP WebSocket Live"
                      : "Reconnecting..."}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Real-time invigilation telemetry, active attempt tracking, and live announcements
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchSchedules}
              disabled={loading}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh Overview
            </Button>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-white border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total Eligible Candidates
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {totalEligibleAll}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border-emerald-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">
                    Active Sitting Attempts
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">
                    {totalActiveAll}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Submitted Submissions
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {totalSubmittedAll}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Schedules Table */}
          <Card className="overflow-hidden border-slate-200 shadow-xs bg-white">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Active & Scheduled Sittings
              </h2>
              <span className="text-xs text-slate-500">
                {schedules.length} examination session{schedules.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-slate-400" />
                Loading examination schedules...
              </div>
            ) : schedules.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Examination Sittings Found</p>
                <p className="text-xs text-slate-500 mt-1">Create or approve schedules in Exam Scheduling.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Examination</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Scheduled Window</th>
                      <th className="py-3 px-3 text-center">Eligible</th>
                      <th className="py-3 px-3 text-center">Active</th>
                      <th className="py-3 px-3 text-center">Submitted</th>
                      <th className="py-3 px-3 text-right">Invigilation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedSchedules.map((s) => {
                      const readOnly = isMonitoringSessionReadOnly(s, nowMs);

                      return (
                        <tr key={s.scheduleId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 max-w-[260px]">
                            <p className="font-semibold text-slate-900 line-clamp-1">
                              {s.examinationTitle}
                            </p>
                            <p className="text-xs text-blue-600 font-medium line-clamp-1">
                              {s.courseCode} — {s.courseName}
                            </p>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">{getStatusBadge(s)}</td>
                          <td className="py-3 px-3 text-xs text-slate-600">
                            <p className="font-medium text-slate-700">
                              {formatWindow(s.scheduledStartAt, s.scheduledCloseAt)}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {s.durationMinutes} mins duration
                            </p>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-700 whitespace-nowrap">
                            {s.totalEligible}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-600 whitespace-nowrap">
                            {s.activeAttempts > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                {!readOnly && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                                {s.activeAttempts}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {s.submittedCount > 0 ? (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                                {s.submittedCount}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">0</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            {readOnly ? (
                              <Link href={`/exam-officer/monitoring/${s.scheduleId}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs"
                                >
                                  <History className="w-3.5 h-3.5 mr-1" />
                                  See History
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/exam-officer/monitoring/${s.scheduleId}`}>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs">
                                  Live Room
                                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
