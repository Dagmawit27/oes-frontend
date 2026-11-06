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
    loadSnapshot();
  }, [loadSnapshot]);

  // STOMP WebSocket Live Subscription & Reconnect Reconciliation
  useEffect(() => {
    if (!scheduleId || isNaN(scheduleId)) return;

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
  }, [scheduleId, loadSnapshot]);

  // Calculate live counters
  const totalEligible = snapshot?.totalEligibleStudents || candidates.length;
  const startedCount = candidates.filter((c) => c.status !== "NOT_STARTED").length;
  const notStartedCount = Math.max(0, totalEligible - startedCount);
  const activeCount = candidates.filter((c) => c.status === "IN_PROGRESS").length;
  const submittedCount = candidates.filter((c) => c.status === "SUBMITTED").length;
  const disconnectedCount = candidates.filter(
    (c) => c.status === "IN_PROGRESS" && !c.isOnline
  ).length;

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "IN_PROGRESS") return c.status === "IN_PROGRESS";
    if (statusFilter === "SUBMITTED") return c.status === "SUBMITTED";
    if (statusFilter === "NOT_STARTED") return c.status === "NOT_STARTED";
    if (statusFilter === "DISCONNECTED") return c.status === "IN_PROGRESS" && !c.isOnline;
    return true;
  });

  // Filter events
  const filteredEvents = events.filter((ev) => {
    if (eventFilter === "ALERTS") {
      return (
        ev.eventType === "TAB_BLUR" ||
        ev.eventType === "WINDOW_RESIZED" ||
        ev.eventType === "DISCONNECTED"
      );
    }
    return true;
  });

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case "STARTED":
      case "RECONNECTED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ANSWER_SAVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "SUBMITTED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "TAB_BLUR":
      case "WINDOW_RESIZED":
        return "bg-amber-50 text-amber-700 border-amber-200 font-bold";
      case "DISCONNECTED":
        return "bg-red-50 text-red-700 border-red-200 font-bold";
      case "AUTO_SUBMITTED_EXPIRED":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
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

            {/* Live Status Pill & Announcement Trigger */}
            <div className="flex items-center gap-2.5">
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

              <Button
                size="sm"
                variant="outline"
                onClick={loadSnapshot}
                title="Sync Authoritative Snapshot"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>

              <Button
                size="sm"
                onClick={() => setIsAnnounceModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
              >
                <Megaphone className="w-3.5 h-3.5 mr-1.5" />
                Live Broadcast
              </Button>
            </div>
          </div>

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
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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

                  <div className="flex items-center gap-1.5">
                    {["ALL", "IN_PROGRESS", "SUBMITTED", "NOT_STARTED", "DISCONNECTED"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setStatusFilter(tab)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                          statusFilter === tab
                            ? "bg-sky-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {tab.replace("_", " ")}
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
                                      c.status === "SUBMITTED"
                                        ? "bg-purple-500"
                                        : c.isOnline
                                        ? "bg-emerald-500 animate-pulse"
                                        : c.status === "IN_PROGRESS"
                                        ? "bg-amber-500"
                                        : "bg-slate-300"
                                    }`}
                                    title={
                                      c.isOnline
                                        ? "Candidate Online"
                                        : c.status === "IN_PROGRESS"
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
                                {c.status === "IN_PROGRESS" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    IN PROGRESS
                                  </span>
                                ) : c.status === "SUBMITTED" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    SUBMITTED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                    NOT STARTED
                                  </span>
                                )}
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
                                <p className="text-slate-400">Due: {formatTime(c.deadlineAt)}</p>
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
                    <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <h3 className="font-semibold text-slate-800 text-xs">
                      Live Proctoring Feed
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
          {isAnnounceModalOpen && (
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
