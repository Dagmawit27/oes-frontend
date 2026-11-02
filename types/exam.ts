import { QuestionOption, QuestionType, DifficultyLevel } from "./question";

export type ExamStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED";

export type ApprovalDecision = "APPROVED" | "REJECTED";

export interface SelectedQuestionRequest {
  questionId: number;
  questionOrder?: number;
  marks: number;
}

export interface CreateExaminationRequest {
  title: string;
  description?: string;
  instructions?: string;
  courseOfferingId: number;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  attemptLimit?: number;
  negativeMarkingEnabled?: boolean;
  negativeMarkValue?: number;
  questions: SelectedQuestionRequest[];
}

export interface UpdateExaminationRequest {
  title: string;
  description?: string;
  instructions?: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  attemptLimit?: number;
  negativeMarkingEnabled?: boolean;
  negativeMarkValue?: number;
  questions: SelectedQuestionRequest[];
}

export interface ReviewExaminationRequest {
  decision: ApprovalDecision;
  comments?: string;
}

export interface ExamQuestion {
  id: number;
  examinationId: number;
  questionId: number;
  questionOrder: number;
  marks: number;
  questionVersion: number;
  questionSnapshot?: string;

  // Rich metadata
  questionText?: string;
  questionType?: QuestionType;
  difficultyLevel?: DifficultyLevel;
  explanation?: string;
  options?: QuestionOption[];
  createdAt: string;
}

export interface ExamApproval {
  id: number;
  examinationId: number;
  reviewerId: number;
  reviewerName: string;
  reviewerEmail: string;
  decision: ApprovalDecision;
  comments?: string;
  reviewedAt: string;
}

export interface Examination {
  id: number;
  title: string;
  description?: string;
  instructions?: string;

  courseOfferingId: number;
  courseCode?: string;
  courseName?: string;
  semesterName?: string;
  academicYearName?: string;
  section?: string;

  createdById: number;
  createdByName?: string;
  createdByEmail?: string;

  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  attemptLimit: number;
  negativeMarkingEnabled: boolean;
  negativeMarkValue: number;

  status: ExamStatus;
  version: number;

  questionCount: number;
  questions?: ExamQuestion[];
  approvals?: ExamApproval[];

  createdAt: string;
  updatedAt?: string;
}
