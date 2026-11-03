import { apiClient } from "./client";
import { ApiResponse } from "@/types/auth";
import {
  ExamExecutionPayload,
  SaveAnswerRequest,
  StudentAnswer,
  ExamSubmissionResult,
  ExamEventLogRequest,
} from "@/types/execution";

export const executionApi = {
  /**
   * Start or resume an examination attempt for an active schedule.
   * Idempotent: Returns the active attempt with existing saved answers if already started.
   */
  async startOrResumeExam(scheduleId: number): Promise<ApiResponse<ExamExecutionPayload>> {
    const response = await apiClient.post<ApiResponse<ExamExecutionPayload>>(
      "/exam-execution/start",
      null,
      { params: { scheduleId } }
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
   * Submit and finalize an examination attempt.
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
