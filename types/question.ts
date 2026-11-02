export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "ESSAY";

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

export interface QuestionOption {
  id?: number;
  optionText: string;
  optionOrder?: number;
  isCorrect?: boolean;
  explanation?: string;
}

export interface Question {
  id: number;
  bankId?: number;
  bankName?: string;
  courseId: number;
  courseCode: string;
  courseName: string;
  categoryId?: number;
  categoryName?: string;
  categoryCode?: string;
  createdById: number;
  createdByName: string;
  questionText: string;
  questionType: QuestionType;
  difficultyLevel: DifficultyLevel;
  defaultMarks: number;
  explanation?: string;
  version: number;
  isActive: boolean;
  options: QuestionOption[];
  createdAt: string;
  updatedAt?: string;
}

export interface QuestionCategory {
  id: number;
  courseId?: number;
  courseCode?: string;
  courseName?: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface QuestionBank {
  id: number;
  courseId: number;
  courseCode?: string;
  courseName?: string;
  createdById?: number;
  createdByName?: string;
  name: string;
  description?: string;
  isActive: boolean;
  questionCount?: number;
}

export interface CreateQuestionRequest {
  courseId: number;
  bankId?: number;
  categoryId?: number;
  questionText: string;
  questionType: QuestionType;
  difficultyLevel: DifficultyLevel;
  defaultMarks: number;
  explanation?: string;
  options: QuestionOption[];
}

export interface UpdateQuestionRequest {
  bankId?: number;
  categoryId?: number;
  questionText: string;
  questionType: QuestionType;
  difficultyLevel: DifficultyLevel;
  defaultMarks: number;
  explanation?: string;
  isActive?: boolean;
  options: QuestionOption[];
}

export interface StudentQuestionOption {
  id: number;
  optionText: string;
  optionOrder: number;
}

export interface StudentQuestion {
  id: number;
  questionText: string;
  questionType: QuestionType;
  defaultMarks: number;
  options: StudentQuestionOption[];
}
