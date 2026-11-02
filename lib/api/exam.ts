import { apiClient } from "./client";
import { ApiResponse } from "@/types/auth";
import {
  Examination,
  ExamApproval,
  ExamStatus,
  CreateExaminationRequest,
  UpdateExaminationRequest,
  ReviewExaminationRequest,
} from "@/types/exam";
import { PagedResponse } from "./question";

export interface ExamFilterParams {
  courseOfferingId?: number;
  status?: ExamStatus;
  search?: string;
  myExamsOnly?: boolean;
  page?: number;
  size?: number;
}

export const examApi = {
  async getExaminations(params?: ExamFilterParams): Promise<ApiResponse<PagedResponse<Examination>>> {
    const response = await apiClient.get<ApiResponse<PagedResponse<Examination>>>("/examinations", {
      params,
    });
    return response.data;
  },

  async getExaminationById(id: number): Promise<ApiResponse<Examination>> {
    const response = await apiClient.get<ApiResponse<Examination>>(`/examinations/${id}`);
    return response.data;
  },

  async createExamination(data: CreateExaminationRequest): Promise<ApiResponse<Examination>> {
    const response = await apiClient.post<ApiResponse<Examination>>("/examinations", data);
    return response.data;
  },

  async updateExamination(id: number, data: UpdateExaminationRequest): Promise<ApiResponse<Examination>> {
    const response = await apiClient.put<ApiResponse<Examination>>(`/examinations/${id}`, data);
    return response.data;
  },

  async submitExamination(id: number): Promise<ApiResponse<Examination>> {
    const response = await apiClient.post<ApiResponse<Examination>>(`/examinations/${id}/submit`);
    return response.data;
  },

  async reviewExamination(id: number, data: ReviewExaminationRequest): Promise<ApiResponse<Examination>> {
    const response = await apiClient.post<ApiResponse<Examination>>(`/examinations/${id}/review`, data);
    return response.data;
  },

  async getApprovals(id: number): Promise<ApiResponse<ExamApproval[]>> {
    const response = await apiClient.get<ApiResponse<ExamApproval[]>>(`/examinations/${id}/approvals`);
    return response.data;
  },

  async deleteExamination(id: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/examinations/${id}`);
    return response.data;
  },
};
