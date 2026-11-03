import { apiClient } from "./client";
import { ApiResponse } from "@/types/auth";
import {
  StudentCourseResults,
  CourseExamRosterItem,
  AttemptGrading,
  SaveGradesRequest,
  ResultCorrectionRequest,
} from "@/types/result";

export const resultApi = {
  /**
   * Fetch logged-in student's course-based examination results.
   */
  async getStudentResults(): Promise<ApiResponse<StudentCourseResults[]>> {
    const response = await apiClient.get<ApiResponse<StudentCourseResults[]>>("/student/results");
    return response.data;
  },

  /**
   * Fetch exam results roster for instructor.
   */
  async getInstructorExamResults(examId: number): Promise<ApiResponse<CourseExamRosterItem[]>> {
    const response = await apiClient.get<ApiResponse<CourseExamRosterItem[]>>(
      `/instructor/exams/${examId}/results`
    );
    return response.data;
  },

  /**
   * Fetch exam results roster for exam officer / admin.
   */
  async getOfficerExamResults(examId: number): Promise<ApiResponse<CourseExamRosterItem[]>> {
    const response = await apiClient.get<ApiResponse<CourseExamRosterItem[]>>(
      `/exam-officer/exams/${examId}/results`
    );
    return response.data;
  },

  /**
   * Fetch attempt grading canvas for instructor.
   */
  async getAttemptGrading(attemptId: number): Promise<ApiResponse<AttemptGrading>> {
    const response = await apiClient.get<ApiResponse<AttemptGrading>>(
      `/instructor/attempts/${attemptId}/grading`
    );
    return response.data;
  },

  /**
   * Save draft grades and feedback without finalizing.
   */
  async saveDraftGrades(
    attemptId: number,
    data: SaveGradesRequest
  ): Promise<ApiResponse<AttemptGrading>> {
    const response = await apiClient.put<ApiResponse<AttemptGrading>>(
      `/instructor/attempts/${attemptId}/grades`,
      data
    );
    return response.data;
  },

  /**
   * Validate and finalize attempt grading (transitions status to COMPLETED).
   */
  async completeGrading(attemptId: number): Promise<ApiResponse<AttemptGrading>> {
    const response = await apiClient.post<ApiResponse<AttemptGrading>>(
      `/instructor/attempts/${attemptId}/complete-grading`
    );
    return response.data;
  },

  /**
   * Exam officer action to publish a single student result.
   */
  async publishResult(resultId: number): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/exam-officer/results/${resultId}/publish`
    );
    return response.data;
  },

  /**
   * Exam officer action to batch-publish all completed results for an exam.
   */
  async publishAllExamResults(examId: number): Promise<ApiResponse<{ publishedCount: number }>> {
    const response = await apiClient.post<ApiResponse<{ publishedCount: number }>>(
      `/exam-officer/exams/${examId}/publish-all`
    );
    return response.data;
  },

  /**
   * Audited correction of an already published result.
   */
  async correctPublishedResult(
    resultId: number,
    data: ResultCorrectionRequest
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/instructor/results/${resultId}/correct`,
      data
    );
    return response.data;
  },

  /**
   * Download RFC 4180 CSV export of exam results.
   */
  async downloadResultsCsv(examId: number, examTitle: string): Promise<void> {
    const response = await apiClient.get("/results/export", {
      params: { examId },
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Exam_Results_${examId}_${examTitle.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
