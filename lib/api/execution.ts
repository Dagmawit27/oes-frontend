import { apiClient } from "./client";
import { ApiResponse } from "@/types/auth";
import {
  ExamExecutionPayload,
  SaveAnswerRequest,
  StudentAnswer,
  ExamSubmissionResult,
  ExamEventLogRequest,
  HeartbeatRequest,
  HeartbeatResponse,
  StartExamRequest,
  ResumeExamRequest,
} from "@/types/execution";

export const executionApi = {
  /**
   * Start an examination attempt with Passcode 1 verification.
   */
  async startExam(data: StartExamRequest): Promise<ApiResponse<ExamExecutionPayload>> {
    const response = await apiClient.post<ApiResponse<ExamExecutionPayload>>(
      "/exam-execution/start",
      data
    );
    return response.data;
  },

  /**
   * Resume an interrupted examination attempt with Passcode 2 or Passcode 3 verification.
   */
  async resumeExam(data: ResumeExamRequest): Promise<ApiResponse<ExamExecutionPayload>> {
    const response = await apiClient.post<ApiResponse<ExamExecutionPayload>>(
      "/exam-execution/resume",
      data
    );
    return response.data;
  },

  /**
   * Backward compatible wrapper for legacy calls.
   */
  async startOrResumeExam(scheduleId: number, passcode?: string): Promise<ApiResponse<ExamExecutionPayload>> {
    return this.startExam({ scheduleId, passcode });
  },

  /**
   * Periodic individual heartbeat to sync active countdown and monitor connection health.
   */
  async sendHeartbeat(
    attemptId: number,
    data?: HeartbeatRequest
  ): Promise<ApiResponse<HeartbeatResponse>> {
    const response = await apiClient.post<ApiResponse<HeartbeatResponse>>(
      `/exam-execution/attempts/${attemptId}/heartbeat`,
      data || {}
    );
    return response.data;
  },

  /**
   * Concurrency-safe, idempotent autosave for a question's response or flagged state.
   */
  async saveAnswer(
    attemptId: number,
    data: SaveAnswerRequest
  ): Promise<ApiResponse<StudentAnswer>> {
    const response = await apiClient.post<ApiResponse<StudentAnswer>>(
      `/exam-execution/attempts/${attemptId}/answers`,
      data
    );
    return response.data;
  },

  /**
   * Submit and finalize an examination attempt early.
   */
  async submitExam(attemptId: number): Promise<ApiResponse<ExamSubmissionResult>> {
    const response = await apiClient.post<ApiResponse<ExamSubmissionResult>>(
      `/exam-execution/attempts/${attemptId}/submit`
    );
    return response.data;
  },

  /**
   * Telemetry and proctoring event logger (tab switch, blur, resize, disconnect).
   */
  async logEvent(
    attemptId: number,
    data: ExamEventLogRequest
  ): Promise<ApiResponse<void>> {
    const response = await apiClient.post<ApiResponse<void>>(
      `/exam-execution/attempts/${attemptId}/events`,
      data
    );
    return response.data;
  },
};
