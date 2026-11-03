import { apiClient } from "./client";
import { ApiResponse } from "@/types/auth";
import {
  ExamSchedule,
  ExamEligibility,
  ExamRoom,
  StudentSchedule,
  ExamNotification,
  ScheduleStatus,
  EligibilityStatus,
  CreateScheduleRequest,
  RescheduleRequest,
  ScheduleConflict,
} from "@/types/schedule";
import { PagedResponse } from "./question";

export interface ScheduleFilterParams {
  courseOfferingId?: number;
  status?: ScheduleStatus;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export const scheduleApi = {
  async getSchedules(params?: ScheduleFilterParams): Promise<ApiResponse<PagedResponse<ExamSchedule>>> {
    const response = await apiClient.get<ApiResponse<PagedResponse<ExamSchedule>>>("/schedules", {
      params,
    });
    return response.data;
  },

  async getCalendarSchedules(start: string, end: string): Promise<ApiResponse<ExamSchedule[]>> {
    const response = await apiClient.get<ApiResponse<ExamSchedule[]>>("/schedules/calendar", {
      params: { start, end },
    });
    return response.data;
  },

  async getScheduleById(id: number): Promise<ApiResponse<ExamSchedule>> {
    const response = await apiClient.get<ApiResponse<ExamSchedule>>(`/schedules/${id}`);
    return response.data;
  },

  async createSchedule(data: CreateScheduleRequest): Promise<ApiResponse<ExamSchedule>> {
    const response = await apiClient.post<ApiResponse<ExamSchedule>>("/schedules", data);
    return response.data;
  },

  async checkConflicts(params: {
    examinationId?: number;
    start: string;
    close: string;
    roomId?: number;
    excludeScheduleId?: number;
  }): Promise<ApiResponse<ScheduleConflict>> {
    const response = await apiClient.get<ApiResponse<ScheduleConflict>>("/schedules/check-conflicts", {
      params,
    });
    return response.data;
  },

  async reschedule(id: number, data: RescheduleRequest): Promise<ApiResponse<ExamSchedule>> {
    const response = await apiClient.post<ApiResponse<ExamSchedule>>(`/schedules/${id}/reschedule`, data);
    return response.data;
  },

  async cancelSchedule(id: number, reason?: string): Promise<ApiResponse<ExamSchedule>> {
    const response = await apiClient.post<ApiResponse<ExamSchedule>>(`/schedules/${id}/cancel`, null, {
      params: reason ? { reason } : {},
    });
    return response.data;
  },

  async addStudentEligibility(
    scheduleId: number,
    data: { studentId: number; eligibilityStatus?: EligibilityStatus; reason?: string }
  ): Promise<ApiResponse<ExamEligibility>> {
    const response = await apiClient.post<ApiResponse<ExamEligibility>>(`/schedules/${scheduleId}/eligibility`, data);
    return response.data;
  },

  async updateEligibility(
    scheduleId: number,
    studentId: number,
    data: { eligibilityStatus: EligibilityStatus; reason?: string }
  ): Promise<ApiResponse<ExamEligibility>> {
    const response = await apiClient.put<ApiResponse<ExamEligibility>>(
      `/schedules/${scheduleId}/eligibility/${studentId}`,
      data
    );
    return response.data;
  },

  async removeEligibility(scheduleId: number, studentId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/schedules/${scheduleId}/eligibility/${studentId}`
    );
    return response.data;
  },

  // Student Portal
  async getStudentSchedules(): Promise<ApiResponse<StudentSchedule[]>> {
    const response = await apiClient.get<ApiResponse<StudentSchedule[]>>("/schedules/my-schedules");
    return response.data;
  },

  async getMyNotifications(): Promise<ApiResponse<ExamNotification[]>> {
    const response = await apiClient.get<ApiResponse<ExamNotification[]>>("/schedules/my-notifications");
    return response.data;
  },

  // Exam Rooms
  async getRooms(): Promise<ApiResponse<ExamRoom[]>> {
    const response = await apiClient.get<ApiResponse<ExamRoom[]>>("/exam-rooms");
    return response.data;
  },
};
