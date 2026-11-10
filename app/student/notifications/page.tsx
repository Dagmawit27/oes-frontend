"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notificationApi } from "@/lib/api/notification";
import { useAuth } from "@/lib/auth/AuthContext";
import { useNotifications } from "@/lib/context/NotificationContext";
import { ExamNotification, NotificationType } from "@/types/notification";
import {
  Bell,
  CheckCheck,
  Calendar,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  X,
  Filter,
  Check,
} from "lucide-react";

export default function StudentNotificationsPage() {
  const { isAuthenticated, user } = useAuth();
  const { connectionStatus, markAsRead, markAllAsRead } = useNotifications();
  const [notifications, setNotifications] = useState<ExamNotification[]>([]);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const hasAutoMarkedOnOpenRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    try {
      if (!hasAutoMarkedOnOpenRef.current) {
        hasAutoMarkedOnOpenRef.current = true;
        await markAllAsRead({ silent: true });
      }
      const res = await notificationApi.getMyNotifications(
        filter === "UNREAD",
        page,
        20
      );
      setNotifications(res.data.content);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, page, isAuthenticated, user, markAllAsRead]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: number) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getEventBadge = (type: NotificationType) => {
    switch (type) {
      case "EXAM_SCHEDULED":
      case "EXAM_RESCHEDULED":
        return <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">Schedule</Badge>;
      case "EXAM_CANCELLED":
        return <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">Cancelled</Badge>;
      case "EXAM_STARTING":
        return <Badge variant="outline" className="text-indigo-700 bg-indigo-50 border-indigo-200">Exam Sitting</Badge>;
      case "EXAM_DEADLINE_APPROACHING":
        return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">Reminder</Badge>;
      case "EXAM_SUBMITTED":
      case "EXAM_COMPLETED":
        return <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">Submission</Badge>;
      case "RESULTS_PUBLISHED":
        return <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200">Results</Badge>;
      case "ANNOUNCEMENT":
      default:
        return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">Announcement</Badge>;
    }
  };

  const getEventIcon = (type: NotificationType) => {
    switch (type) {
      case "EXAM_SCHEDULED":
      case "EXAM_RESCHEDULED":
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case "EXAM_CANCELLED":
        return <X className="w-5 h-5 text-red-600" />;
      case "EXAM_STARTING":
        return <FileSpreadsheet className="w-5 h-5 text-indigo-600" />;
      case "EXAM_DEADLINE_APPROACHING":
        return <Clock className="w-5 h-5 text-amber-600" />;
      case "EXAM_SUBMITTED":
      case "EXAM_COMPLETED":
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case "RESULTS_PUBLISHED":
        return <Award className="w-5 h-5 text-purple-600" />;
      case "ANNOUNCEMENT":
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const unreadOnPage = notifications.filter((n) => !n.isRead).length;

  return (
    <ProtectedRoute allowedRoles={["ROLE_STUDENT", "ROLE_INSTRUCTOR", "ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <DashboardShell>
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Notification Center
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
                      ? "Live WebSocket Online"
                      : `Connecting... (${connectionStatus})`}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNotifications}
                disabled={loading}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              {unreadOnPage > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-blue-600 hover:text-blue-700 hover:border-blue-300"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 mr-1" />
              <button
                onClick={() => {
                  setFilter("ALL");
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === "ALL"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All Notifications ({totalElements})
              </button>
              <button
                onClick={() => {
                  setFilter("UNREAD");
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  filter === "UNREAD"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>Unread Only</span>
                {unreadOnPage > 0 && (
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                )}
              </button>
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-slate-400" />
              Loading your notifications...
            </div>
          ) : notifications.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-800">
                {filter === "UNREAD"
                  ? "No Unread Notifications"
                  : "No Notifications Found"}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                {filter === "UNREAD"
                  ? "You have acknowledged all system notifications."
                  : "You do not have any notifications recorded at this time."}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <Card
                  key={notif.id}
                  className={`p-4 transition-all duration-200 border ${
                    !notif.isRead
                      ? "bg-white border-blue-200 shadow-xs"
                      : "bg-slate-50/70 border-slate-200 text-slate-600"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Event Icon */}
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                      {getEventIcon(notif.eventType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-sm ${
                              !notif.isRead
                                ? "font-bold text-slate-900"
                                : "font-semibold text-slate-700"
                            }`}
                          >
                            {notif.title}
                          </h3>
                          {getEventBadge(notif.eventType)}
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                          )}
                        </div>

                        <span className="text-xs text-slate-400 font-medium">
                          {formatTimestamp(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.examinationTitle && (
                        <div className="mt-2 text-xs font-medium text-blue-700 flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Examination: {notif.examinationTitle}</span>
                        </div>
                      )}
                    </div>

                    {/* Mark Read Action */}
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500 font-medium">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
