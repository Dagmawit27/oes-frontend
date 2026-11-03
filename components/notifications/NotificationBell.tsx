"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useNotifications } from "@/lib/context/NotificationContext";
import { NotificationType } from "@/types/notification";
import {
  Bell,
  CheckCheck,
  Calendar,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    connectionStatus,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getEventIcon = (type: NotificationType) => {
    switch (type) {
      case "EXAM_SCHEDULED":
      case "EXAM_RESCHEDULED":
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case "EXAM_CANCELLED":
        return <X className="w-4 h-4 text-red-600" />;
      case "EXAM_STARTING":
        return <FileSpreadsheet className="w-4 h-4 text-indigo-600" />;
      case "EXAM_DEADLINE_APPROACHING":
        return <Clock className="w-4 h-4 text-amber-600" />;
      case "EXAM_SUBMITTED":
      case "EXAM_COMPLETED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "RESULTS_PUBLISHED":
        return <Award className="w-4 h-4 text-purple-600" />;
      case "ANNOUNCEMENT":
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={
          connectionStatus === "CONNECTED"
            ? "Real-time Live Connected"
            : `WebSocket: ${connectionStatus}`
        }
      >
        <Bell className="w-5 h-5" />

        {/* Unread Badge Counter */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 text-[10px] font-bold text-white bg-red-600 rounded-full animate-in zoom-in-75">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Live Status indicator dot */}
        <span
          className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white ${
            connectionStatus === "CONNECTED"
              ? "bg-emerald-500"
              : connectionStatus === "CONNECTING"
              ? "bg-amber-500 animate-pulse"
              : "bg-slate-400"
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-1 text-[11px] text-slate-500"
                title={`Status: ${connectionStatus}`}
              >
                {connectionStatus === "CONNECTED" ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span className="capitalize">{connectionStatus.toLowerCase()}</span>
              </span>

              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List of Notifications */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 8).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif.id);
                  }}
                  className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                    !notif.isRead ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-slate-100 shrink-0 self-start">
                    {getEventIcon(notif.eventType)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs truncate ${
                          !notif.isRead
                            ? "font-semibold text-slate-900"
                            : "font-medium text-slate-700"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.examinationTitle && (
                      <span className="inline-block mt-1 text-[10px] text-blue-600 font-medium truncate max-w-full">
                        {notif.examinationTitle}
                      </span>
                    )}
                  </div>

                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              href="/student/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-block w-full py-1"
            >
              View Full Notification History →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
