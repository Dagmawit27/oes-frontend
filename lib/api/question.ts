import { apiClient } from "./client";
import { ApiResponse } from "@/types/auth";
import {
  Question,
  QuestionCategory,
  QuestionBank,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  StudentQuestion,
  QuestionType,
  DifficultyLevel,
} from "@/types/question";

export interface PagedResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface QuestionFilterParams {
  courseId?: number;
  bankId?: number;
  categoryId?: number;
  type?: QuestionType;
  difficulty?: DifficultyLevel;
  search?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}

export const questionApi = {
  // Questions
  async getQuestions(params?: QuestionFilterParams): Promise<ApiResponse<PagedResponse<Question>>> {
    const response = await apiClient.get<ApiResponse<PagedResponse<Question>>>("/questions", {
      params,
    });
    return response.data;
  },

  async getQuestionById(id: number): Promise<ApiResponse<Question>> {
    const response = await apiClient.get<ApiResponse<Question>>(`/questions/${id}`);
    return response.data;
  },

  async getStudentQuestion(id: number): Promise<ApiResponse<StudentQuestion>> {
    const response = await apiClient.get<ApiResponse<StudentQuestion>>(`/questions/${id}/student-view`);
    return response.data;
  },

  async createQuestion(data: CreateQuestionRequest): Promise<ApiResponse<Question>> {
    const response = await apiClient.post<ApiResponse<Question>>("/questions", data);
    return response.data;
  },

  async updateQuestion(id: number, data: UpdateQuestionRequest): Promise<ApiResponse<Question>> {
    const response = await apiClient.put<ApiResponse<Question>>(`/questions/${id}`, data);
    return response.data;
  },

  async deleteQuestion(id: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/questions/${id}`);
    return response.data;
  },

  async duplicateQuestion(id: number): Promise<ApiResponse<Question>> {
    const response = await apiClient.post<ApiResponse<Question>>(`/questions/${id}/duplicate`);
    return response.data;
  },

  // Categories
  async getCategories(courseId?: number): Promise<ApiResponse<QuestionCategory[]>> {
    const response = await apiClient.get<ApiResponse<QuestionCategory[]>>("/question-categories", {
      params: courseId ? { courseId } : {},
    });
    return response.data;
  },

  async createCategory(data: Partial<QuestionCategory>): Promise<ApiResponse<QuestionCategory>> {
    const response = await apiClient.post<ApiResponse<QuestionCategory>>("/question-categories", data);
    return response.data;
  },

  async deleteCategory(id: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/question-categories/${id}`);
    return response.data;
  },

  // Question Banks
  async getQuestionBanks(courseId?: number): Promise<ApiResponse<QuestionBank[]>> {
    const response = await apiClient.get<ApiResponse<QuestionBank[]>>("/question-banks", {
      params: courseId ? { courseId } : {},
    });
    return response.data;
  },

  async createQuestionBank(data: Partial<QuestionBank>): Promise<ApiResponse<QuestionBank>> {
    const response = await apiClient.post<ApiResponse<QuestionBank>>("/question-banks", data);
    return response.data;
  },
};
