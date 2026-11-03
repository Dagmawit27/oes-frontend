import { apiClient } from "./client";
import { ApiResponse } from "@/types/auth";
import {
  ExamNotification,
  AnnouncementRequest,
  UnreadCountResponse,
} from "@/types/notification";

export interface PaginatedNotifications {
  content: ExamNotification[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const notificationApi = {
  /**
   * Get user's paginated notifications
   */
  async getMyNotifications(
    unreadOnly = false,
    page = 0,
    size = 20
  ): Promise<ApiResponse<PaginatedNotifications>> {
    const response = await apiClient.get<ApiResponse<PaginatedNotifications>>(
      "/notifications",
      {
        params: { unreadOnly, page, size },
      }
    );
    return response.data;
  },

  /**
   * Get recent 20 notifications for quick dropdown
   */
  async getRecentNotifications(): Promise<ApiResponse<ExamNotification[]>> {
    const response = await apiClient.get<ApiResponse<ExamNotification[]>>(
      "/notifications/recent"
    );
    return response.data;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<ApiResponse<UnreadCountResponse>> {
    const response = await apiClient.get<ApiResponse<UnreadCountResponse>>(
      "/notifications/unread-count"
    );
    return response.data;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: number): Promise<ApiResponse<ExamNotification>> {
    const response = await apiClient.put<ApiResponse<ExamNotification>>(
      `/notifications/${id}/read`
    );
    return response.data;
  },

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(): Promise<ApiResponse<{ updatedCount: number }>> {
    const response = await apiClient.put<ApiResponse<{ updatedCount: number }>>(
      "/notifications/read-all"
    );
    return response.data;
  },

  /**
   * Broadcast an announcement (Exam Officer or Admin)
   */
  async broadcastAnnouncement(
    request: AnnouncementRequest
  ): Promise<ApiResponse<ExamNotification>> {
    const response = await apiClient.post<ApiResponse<ExamNotification>>(
      "/notifications/announcements",
      request
    );
    return response.data;
  },
};
