"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { monitoringApi } from "@/lib/api/monitoring";
import { stompManager, WebSocketConnectionStatus } from "@/lib/websocket/stompClient";
import {
  ExamMonitoringSnapshot,
  CandidateMonitoring,
  MonitoringEvent,
  MonitoringWebSocketMessage,
  isMonitoringSessionReadOnly,
  isCandidateActiveStatus,
  isCandidateSubmittedStatus,
} from "@/types/monitoring";
import { toast } from "sonner";
import {
  Radio,
  Users,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Megaphone,
  RefreshCw,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  HelpCircle,
  ShieldAlert,
  Search,
  History,
  Lock,
} from "lucide-react";

function LiveMonitoringContent() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = Number(params?.scheduleId);

  const [snapshot, setSnapshot] = useState<ExamMonitoringSnapshot | null>(null);
  const [candidates, setCandidates] = useState<CandidateMonitoring[]>([]);
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<WebSocketConnectionStatus>("DISCONNECTED");
  const [nowMs, setNowMs] = useState<number | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [eventFilter, setEventFilter] = useState<"ALL" | "ALERTS">("ALL");

  // Announcement Modal
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceMessage, setAnnounceMessage] = useState("");
  const [sendingAnnounce, setSendingAnnounce] = useState(false);

  // Fetch authoritative snapshot via REST
  const loadSnapshot = useCallback(async () => {
    if (!scheduleId || isNaN(scheduleId)) return;
    try {
      const res = await monitoringApi.getScheduleSnapshot(scheduleId);
      setSnapshot(res.data);
      setCandidates(res.data.candidates);
      setEvents(res.data.recentEvents);
    } catch (err) {
      console.error("Failed to load live snapshot:", err);
      toast.error("Failed to fetch authoritative examination snapshot");
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    setNowMs(Date.now());
    loadSnapshot();
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [loadSnapshot]);

  const isReadOnly = snapshot ? isMonitoringSessionReadOnly(snapshot, nowMs) : false;

  // STOMP WebSocket Live Subscription & Reconnect Reconciliation (disabled for passed/closed history sessions)
  useEffect(() => {
    if (!scheduleId || isNaN(scheduleId) || !snapshot || isReadOnly) return;

    const unsubscribeStatus = stompManager.onStatusChange((status) => {
      setConnectionStatus(status);
      if (status === "CONNECTED") {
        // Authoritative reconciliation upon connection or reconnection
        loadSnapshot();
      }
    });

    const client = stompManager.connect();

    const subscribeToSchedule = () => {
      const topic = `/topic/monitoring/schedules/${scheduleId}`;
      const sub = client.subscribe(topic, (msg) => {
        try {
          const wsMsg: MonitoringWebSocketMessage = JSON.parse(msg.body);

          // Handle incoming live event
          if (wsMsg.event) {
            setEvents((prev) => [wsMsg.event!, ...prev.slice(0, 99)]);
            if (
              wsMsg.event.eventType === "TAB_BLUR" ||
              wsMsg.event.eventType === "DISCONNECTED"
            ) {
              toast.warning(`Security Alert: ${wsMsg.event.studentName}`, {
                description: `${wsMsg.event.eventType} — ${wsMsg.event.eventPayload || ""}`,
              });
            }
          }

          // Handle candidate state update
          if (wsMsg.candidate) {
            const updated = wsMsg.candidate;
            setCandidates((prev) => {
              const existingIdx = prev.findIndex((c) => c.studentId === updated.studentId);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = updated;
                return next;
              }
              return [updated, ...prev];
            });
          }
        } catch (e) {
          console.error("Failed to parse monitoring websocket message:", e);
        }
      });

      return () => {
        sub.unsubscribe();
      };
    };

    let cleanupSub: (() => void) | undefined;

    if (client.connected) {
      cleanupSub = subscribeToSchedule();
    } else {
      client.onConnect = () => {
        setConnectionStatus("CONNECTED");
        cleanupSub = subscribeToSchedule();
      };
    }

    return () => {
      unsubscribeStatus();
      if (cleanupSub) cleanupSub();
    };
  }, [scheduleId, loadSnapshot, snapshot, isReadOnly]);

  // Calculate live counters
  const totalEligible = snapshot?.totalEligibleStudents || candidates.length;
  const startedCount = candidates.filter((c) => c.status !== "NOT_STARTED").length;
  const notStartedCount = Math.max(0, totalEligible - startedCount);
  const activeCount =
    candidates.length > 0
      ? candidates.filter((c) => isCandidateActiveStatus(c.status)).length
      : snapshot?.activeAttemptsCount ?? 0;
  const submittedCount =
    candidates.length > 0
      ? candidates.filter((c) => isCandidateSubmittedStatus(c.status)).length
      : snapshot?.submittedCount ?? 0;
  const disconnectedCount = candidates.filter(
    (c) =>
      (isCandidateActiveStatus(c.status) && !c.isOnline) ||
      c.status === "CONNECTION_PAUSED" ||
      c.status === "RESUME_REQUIRED"
  ).length;

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "ACTIVE") return isCandidateActiveStatus(c.status);
    if (statusFilter === "SUBMITTED") return isCandidateSubmittedStatus(c.status);
    if (statusFilter === "NOT_STARTED") return c.status === "NOT_STARTED";
    if (statusFilter === "DISCONNECTED") {
      return (
        (isCandidateActiveStatus(c.status) && !c.isOnline) ||
        c.status === "CONNECTION_PAUSED" ||
        c.status === "RESUME_REQUIRED"
      );
    }
    return true;
  });

  // Filter events
  const ALERT_EVENT_TYPES = new Set([
    "TAB_BLUR",
    "WINDOW_RESIZED",
    "DISCONNECTED",
    "CONNECTION_PAUSED",
    "PASSCODE_FAILED",
    "HEARTBEAT_TIMEOUT",
    "RATE_LIMIT_EXCEEDED",
  ]);
  const filteredEvents = events.filter((ev) =>
    eventFilter === "ALERTS" ? ALERT_EVENT_TYPES.has(ev.eventType) : true
  );

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (snapshot && isMonitoringSessionReadOnly(snapshot, Date.now())) {
      toast.error("Cannot send announcements for a closed examination session");
      return;
    }
    if (!announceTitle.trim() || !announceMessage.trim()) return;

    setSendingAnnounce(true);
    try {
      await monitoringApi.sendLiveAnnouncement(scheduleId, {
        title: announceTitle,
        message: announceMessage,
      });
      toast.success("Live exam announcement broadcasted successfully!");
      setIsAnnounceModalOpen(false);
      setAnnounceTitle("");
      setAnnounceMessage("");
    } catch (err) {
      console.error("Failed to send live announcement:", err);
      toast.error("Failed to broadcast live announcement");
    } finally {
      setSendingAnnounce(false);
    }
  };

  const EVENT_BADGE_MAP: Record<string, string> = {
    STARTED: "bg-blue-50 text-blue-700 border-blue-200",
    RECONNECTED: "bg-blue-50 text-blue-700 border-blue-200",
    CONNECTION_RESUMED: "bg-blue-50 text-blue-700 border-blue-200",
    PASSCODE_VERIFIED: "bg-blue-50 text-blue-700 border-blue-200",
    ANSWER_SAVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    QUESTION_FLAGGED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SUBMITTED: "bg-purple-50 text-purple-700 border-purple-200",
    AUTO_SUBMITTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
    AUTO_SUBMITTED_EXPIRED: "bg-indigo-50 text-indigo-700 border-indigo-200",
    TAB_BLUR: "bg-amber-50 text-amber-700 border-amber-200 font-bold",
    WINDOW_RESIZED: "bg-amber-50 text-amber-700 border-amber-200 font-bold",
    CONNECTION_PAUSED: "bg-amber-50 text-amber-700 border-amber-200 font-bold",
    DISCONNECTED: "bg-red-50 text-red-700 border-red-200 font-bold",
    PASSCODE_FAILED: "bg-red-50 text-red-700 border-red-200 font-bold",
    HEARTBEAT_TIMEOUT: "bg-red-50 text-red-700 border-red-200 font-bold",
    RATE_LIMIT_EXCEEDED: "bg-red-50 text-red-700 border-red-200 font-bold",
  };

  const getEventBadgeClass = (type: string) =>
    EVENT_BADGE_MAP[type] || "bg-slate-50 text-slate-600 border-slate-200";

  const CANDIDATE_STATUS_STYLES: Record<string, { label: string; className: string }> = {
    ACTIVE: {
      label: "ACTIVE",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold",
    },
    IN_PROGRESS: {
      label: "IN PROGRESS",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold",
    },
    CONNECTION_PAUSED: {
      label: "PAUSED",
      className: "bg-amber-50 text-amber-700 border border-amber-200 font-bold",
    },
    RESUME_REQUIRED: {
      label: "RESUME REQ",
      className: "bg-amber-50 text-amber-700 border border-amber-200 font-bold",
    },
    SUBMITTED: {
      label: "SUBMITTED",
      className: "bg-purple-50 text-purple-700 border border-purple-200 font-bold",
    },
    AUTO_SUBMITTED: {
      label: "AUTO SUBMITTED",
      className: "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold",
    },
    EXPIRED: {
      label: "EXPIRED",
      className: "bg-rose-50 text-rose-700 border border-rose-200 font-semibold",
    },
    ABANDONED: {
      label: "ABANDONED",
      className: "bg-red-50 text-red-700 border border-red-200 font-semibold",
    },
    NOT_STARTED: {
      label: "NOT STARTED",
      className: "bg-slate-100 text-slate-600 font-medium",
    },
  };

  const renderCandidateStatusBadge = (status: string) => {
    const config = CANDIDATE_STATUS_STYLES[status] || {
      label: status.replace(/_/g, " "),
      className: "bg-slate-100 text-slate-600 font-medium",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "—";
    try {
      return new Date(timeStr).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timeStr;
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700">Connecting to Live Monitoring Room...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6">
          {/* Top Back & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/exam-officer/monitoring">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  All Sittings
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    {snapshot?.examinationTitle || "Examination Sitting"}
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                    {snapshot?.courseCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Venue: {snapshot?.roomName} • Scheduled Window: {formatTime(snapshot?.scheduledStartAt)} – {formatTime(snapshot?.scheduledCloseAt)} ({snapshot?.durationMinutes}m)
                </p>
              </div>
            </div>

            {/* Live Status Pill / Read-Only History Pill & Announcement Trigger */}
            <div className="flex items-center gap-2.5">
              {isReadOnly ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>History Mode (Read-Only)</span>
                </div>
              ) : (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    connectionStatus === "CONNECTED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connectionStatus === "CONNECTED"
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-amber-500"
                    }`}
                  />
                  <span>
                    {connectionStatus === "CONNECTED"
                      ? "Live Telemetry Connected"
                      : `Reconnecting (${connectionStatus})...`}
                  </span>
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={loadSnapshot}
                title="Sync Authoritative Snapshot"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>

              {!isReadOnly && (
                <Button
                  size="sm"
                  onClick={() => setIsAnnounceModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                >
                  <Megaphone className="w-3.5 h-3.5 mr-1.5" />
                  Live Broadcast
                </Button>
              )}
            </div>
          </div>

          {isReadOnly && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
              <History className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Sitting Ended — Viewing Proctoring History (Read-Only)
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  This examination window has closed. Candidate progress, attendance, and proctoring events are preserved for audit review; live broadcasts and modifications are disabled.
                </p>
              </div>
            </div>
          )}

          {/* 6 Real-Time Telemetry Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Eligible
              </p>
              <p className="text-xl font-bold text-slate-900 mt-1">{totalEligible}</p>
            </Card>

            <Card className="p-3.5 bg-white border-blue-200 shadow-xs">
              <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                Started
              </p>
              <p className="text-xl font-bold text-blue-700 mt-1">{startedCount}</p>
            </Card>

            <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Not Started
              </p>
              <p className="text-xl font-bold text-slate-700 mt-1">{notStartedCount}</p>
            </Card>

            <Card className="p-3.5 bg-white border-emerald-300 shadow-xs bg-emerald-50/20">
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                {!isReadOnly && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                Active Sitting
              </p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{activeCount}</p>
            </Card>

            <Card className="p-3.5 bg-white border-purple-200 shadow-xs">
              <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
                Submitted
              </p>
              <p className="text-xl font-bold text-purple-700 mt-1">{submittedCount}</p>
            </Card>

            <Card className="p-3.5 bg-white border-amber-200 shadow-xs bg-amber-50/20">
              <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Disconnected
              </p>
              <p className="text-xl font-bold text-amber-700 mt-1">{disconnectedCount}</p>
            </Card>
          </div>

          {/* Main Content: Split Grid (Left Roster, Right Live Event Feed) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Candidate Roster Table */}
            <div className="lg:col-span-8 space-y-4">
              <Card className="overflow-hidden border-slate-200 shadow-xs bg-white">
                {/* Search & Filters */}
                <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-48 max-w-xs">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search student or registration #..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-8 text-xs bg-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { key: "ALL", label: "ALL" },
                      { key: "ACTIVE", label: "ACTIVE" },
                      { key: "SUBMITTED", label: "SUBMITTED" },
                      { key: "NOT_STARTED", label: "NOT STARTED" },
                      { key: "DISCONNECTED", label: "DISCONNECTED" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                          statusFilter === tab.key
                            ? "bg-sky-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Candidate</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Progress</th>
                        <th className="py-2.5 px-3">Sitting Times</th>
                        <th className="py-2.5 px-3">Last Telemetry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No candidates match your current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredCandidates.map((c) => {
                          const percent =
                            c.totalQuestions > 0
                              ? Math.round((c.answeredQuestions / c.totalQuestions) * 100)
                              : 0;

                          return (
                            <tr key={c.studentId} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      isCandidateSubmittedStatus(c.status)
                                        ? "bg-purple-500"
                                        : c.isOnline && isCandidateActiveStatus(c.status)
                                        ? "bg-emerald-500 animate-pulse"
                                        : isCandidateActiveStatus(c.status)
                                        ? "bg-amber-500"
                                        : "bg-slate-300"
                                    }`}
                                    title={
                                      isCandidateSubmittedStatus(c.status)
                                        ? "Submitted"
                                        : c.isOnline && isCandidateActiveStatus(c.status)
                                        ? "Candidate Online"
                                        : isCandidateActiveStatus(c.status)
                                        ? "Inactive / Disconnected"
                                        : "Offline"
                                    }
                                  />
                                  <div>
                                    <p className="font-semibold text-slate-900 leading-none">
                                      {c.studentName}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {c.registrationNumber}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                {renderCandidateStatusBadge(c.status)}
                              </td>

                              <td className="py-3 px-3 min-w-32">
                                <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 mb-1">
                                  <span>{c.answeredQuestions}/{c.totalQuestions}</span>
                                  <span className="text-slate-400">{percent}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </td>

                              <td className="py-3 px-3 text-[11px] text-slate-600">
                                <p>Start: {formatTime(c.startedAt)}</p>
                                {c.deadlineAt ? (
                                  <p className="text-slate-400">Due: {formatTime(c.deadlineAt)}</p>
                                ) : c.lastActivityAt ? (
                                  <p className="text-slate-400">Event: {formatTime(c.lastActivityAt)}</p>
                                ) : (
                                  <p className="text-slate-400">Due: —</p>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${getEventBadgeClass(
                                    c.lastEventType || ""
                                  )}`}
                                >
                                  {c.lastEventType || "NONE"}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {formatTime(c.lastActivityAt)}
                                </p>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Right 4 Cols: Live Telemetry Event Stream */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
                <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isReadOnly ? (
                      <History className="w-4 h-4 text-slate-600" />
                    ) : (
                      <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                    )}
                    <h3 className="font-semibold text-slate-800 text-xs">
                      {isReadOnly ? "Proctoring Event History" : "Live Proctoring Feed"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEventFilter("ALL")}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        eventFilter === "ALL"
                          ? "bg-sky-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      All ({events.length})
                    </button>
                    <button
                      onClick={() => setEventFilter("ALERTS")}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        eventFilter === "ALERTS"
                          ? "bg-amber-600 text-white"
                          : "text-amber-700 hover:bg-amber-50"
                      }`}
                    >
                      Alerts Only
                    </button>
                  </div>
                </div>

                {/* Event Items */}
                <div className="max-h-125 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
                  {filteredEvents.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No events recorded yet.
                    </div>
                  ) : (
                    filteredEvents.map((ev, idx) => (
                      <div
                        key={ev.id || idx}
                        className="p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-xs space-y-1 animate-in fade-in-50"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${getEventBadgeClass(
                              ev.eventType
                            )}`}
                          >
                            {ev.eventType}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatTime(ev.occurredAt)}
                          </span>
                        </div>

                        <p className="font-semibold text-slate-800 truncate">
                          {ev.studentName}{" "}
                          <span className="font-normal text-slate-400">
                            ({ev.registrationNumber})
                          </span>
                        </p>

                        {ev.eventPayload && (
                          <p className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 font-mono break-words">
                            {ev.eventPayload}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Live Announcement Modal */}
          {!isReadOnly && isAnnounceModalOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-50">
              <Card className="w-full max-w-md bg-white p-6 shadow-2xl border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Broadcast Live Examination Announcement
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dispatched instantly via STOMP to all students sitting for {snapshot?.examinationTitle}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSendAnnouncement} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Announcement Title
                    </label>
                    <Input
                      placeholder="e.g. 15 Minutes Remaining Warning"
                      value={announceTitle}
                      onChange={(e) => setAnnounceTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Message Content
                    </label>
                    <textarea
                      placeholder="Enter exact instructions or notice to be delivered to candidates' screens..."
                      value={announceMessage}
                      onChange={(e) => setAnnounceMessage(e.target.value)}
                      rows={4}
                      className="w-full text-xs rounded-md border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAnnounceModalOpen(false)}
                      disabled={sendingAnnounce}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={sendingAnnounce}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                    >
                      {sendingAnnounce ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Broadcasting...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Send Announcement
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}

export default function LiveMonitoringPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-2" />
            <p className="text-sm font-semibold text-slate-600">
              Initializing live examination room...
            </p>
          </div>
        </div>
      }
    >
      <LiveMonitoringContent />
    </Suspense>
  );
}
