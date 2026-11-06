export type GradingStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "Pending"
  | "In Progress"
  | "Grading Completed"
  | string;

export type PublicationStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "Draft"
  | "Published"
  | string;

export function isGradingCompleted(status?: string | null): boolean {
  if (!status) return false;
  const s = status.toUpperCase().replace(/\s+/g, "_");
  return s === "COMPLETED" || s === "GRADING_COMPLETED";
}

export function isResultPublished(status?: string | null): boolean {
  if (!status) return false;
  return status.toUpperCase() === "PUBLISHED";
}

export function isResultDraft(status?: string | null): boolean {
  if (!status) return false;
  return status.toUpperCase() === "DRAFT";
}
export type DisplayStatus = "NOT_ATTEMPTED" | "PENDING" | "PUBLISHED";

export interface StudentGradeDetail {
  questionOrder?: number;
  examQuestionId?: number;
  questionText: string;
  questionType?: string;
  awardedMarks: number | null;
  maximumMarks: number | null;
  feedback: string | null;
  isAutoGraded?: boolean;
}

export interface StudentExamResult {
  resultId: number | null;
  examinationId: number;
  examinationTitle: string;
  attemptStatus: string;
  displayStatus: string;
  earnedMarks: number | null;
  totalMarks: number;
  marksDisplay: string;
  publishedAt: string | null;
  details?: StudentGradeDetail[];
}

export interface StudentCourseResults {
  courseId: number;
  courseCode: string;
  courseName: string;
  departmentName?: string;
  semesterName: string;
  examinations: StudentExamResult[];
}

export interface CourseExamRosterItem {
  studentId: number;
  registrationNumber: string;
  studentName: string;
  attemptId: number | null;
  attemptStatus: string | null;
  resultId: number | null;
  earnedMarks: number | null;
  totalMarks: number | null;
  formattedMarks: string;
  gradingStatus: GradingStatus | null;
  publicationStatus: PublicationStatus | null;
  submittedAt: string | null;
}

export interface QuestionGradingOption {
  id: number;
  optionText: string;
  optionOrder: number;
  isCorrect: boolean;
  explanation?: string | null;
  isSelectedByStudent: boolean;
}

export interface QuestionGradingItem {
  examQuestionId: number;
  questionId: number;
  questionText: string;
  questionType: string;
  questionOrder: number;
  maximumMarks: number | null;
  studentAnswerText: string | null;
  options: QuestionGradingOption[];
  awardedMarks: number | null;
  feedback: string | null;
  isAutoGraded: boolean;
}

export interface AttemptGrading {
  attemptId: number;
  examinationId: number;
  examTitle: string;
  studentId: number;
  studentName: string;
  registrationNumber: string;
  attemptStatus: string;
  resultId: number | null;
  gradingStatus: GradingStatus;
  publicationStatus: PublicationStatus;
  earnedMarks: number | null;
  totalMarks: number;
  submittedAt: string | null;
  questions: QuestionGradingItem[];
}

export interface SaveGradeItemRequest {
  examQuestionId: number;
  awardedMarks: number | null;
  feedback?: string;
}

export interface SaveGradesRequest {
  grades: SaveGradeItemRequest[];
}

export interface ResultCorrectionRequest {
  newEarnedMarks: number;
  reason: string;
}
