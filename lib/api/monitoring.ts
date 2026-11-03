import { apiClient } from "./client";
import { ApiResponse } from "@/types/auth";
import {
  ExamMonitoringSnapshot,
  ScheduleMonitoringSummary,
} from "@/types/monitoring";
import { AnnouncementRequest, ExamNotification } from "@/types/notification";

export const monitoringApi = {
  /**
   * Fetch active exam schedules for live monitoring dashboard
   */
  async getActiveSchedules(): Promise<ApiResponse<ScheduleMonitoringSummary[]>> {
    const response = await apiClient.get<ApiResponse<ScheduleMonitoringSummary[]>>(
      "/monitoring/schedules"
    );
    return response.data;
  },

  /**
   * Fetch complete live snapshot of an examination sitting
   */
  async getScheduleSnapshot(
    scheduleId: number
  ): Promise<ApiResponse<ExamMonitoringSnapshot>> {
    const response = await apiClient.get<ApiResponse<ExamMonitoringSnapshot>>(
      `/monitoring/schedules/${scheduleId}/snapshot`
    );
    return response.data;
  },

  /**
   * Send live announcement directly to candidates in an active exam sitting
   */
  async sendLiveAnnouncement(
    scheduleId: number,
    request: AnnouncementRequest
  ): Promise<ApiResponse<ExamNotification>> {
    const response = await apiClient.post<ApiResponse<ExamNotification>>(
      `/monitoring/schedules/${scheduleId}/announcement`,
      request
    );
    return response.data;
  },
};
