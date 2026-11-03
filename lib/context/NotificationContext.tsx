"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { stompManager, WebSocketConnectionStatus } from "@/lib/websocket/stompClient";
import { notificationApi } from "@/lib/api/notification";
import { ExamNotification } from "@/types/notification";
import { toast } from "sonner";

interface NotificationContextType {
  notifications: ExamNotification[];
  unreadCount: number;
  connectionStatus: WebSocketConnectionStatus;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<ExamNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] =
    useState<WebSocketConnectionStatus>("DISCONNECTED");

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [countRes, recentRes] = await Promise.all([
        notificationApi.getUnreadCount(),
        notificationApi.getRecentNotifications(),
      ]);
      setUnreadCount(countRes.data.unreadCount);
      setNotifications(recentRes.data);
    } catch (err) {
      console.warn("Failed to fetch initial notifications:", err);
    }
  }, [user]);

  // Handle STOMP WebSocket connection & real-time subscriptions
  useEffect(() => {
    if (!isAuthenticated || !user) {
      stompManager.disconnect();
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("oes_access_token") ||
          localStorage.getItem("access_token")
        : null;

    if (!token) return;

    refreshNotifications();

    const unsubscribeStatus = stompManager.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    const client = stompManager.connect(token);

    const onConnectCallback = () => {
      // 1. User-specific notifications
      client.subscribe("/user/queue/notifications", (message) => {
        try {
          const newNotif: ExamNotification = JSON.parse(message.body);
          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
          setUnreadCount((prev) => prev + 1);

          toast.info(newNotif.title, {
            description: newNotif.message,
            duration: 6000,
          });
        } catch (e) {
          console.error("Error parsing user notification message:", e);
        }
      });

      // 2. Announcements topic
      client.subscribe("/topic/notifications/announcements", (message) => {
        try {
          const announcement: ExamNotification = JSON.parse(message.body);
          setNotifications((prev) => [announcement, ...prev]);
          setUnreadCount((prev) => prev + 1);

          toast.warning("Announcement: " + announcement.title, {
            description: announcement.message,
            duration: 8000,
          });
        } catch (e) {
          console.error("Error parsing announcement message:", e);
        }
      });
    };

    if (client.connected) {
      onConnectCallback();
    } else {
      client.onConnect = () => {
        setConnectionStatus("CONNECTED");
        onConnectCallback();
      };
    }

    return () => {
      unsubscribeStatus();
    };
  }, [user, isAuthenticated, refreshNotifications]);

  const markAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        connectionStatus,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
