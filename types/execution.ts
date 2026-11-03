import { QuestionType } from "./question";

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "ABANDONED";

export type ExamEventType =
  | "STARTED"
  | "ANSWER_SAVED"
  | "QUESTION_FLAGGED"
  | "TAB_BLUR"
  | "WINDOW_RESIZED"
  | "DISCONNECTED"
  | "RECONNECTED"
  | "SUBMITTED"
  | "AUTO_SUBMITTED_EXPIRED";

export interface QuestionOptionDelivery {
  id: number;
  optionOrder: number;
  optionText: string;
}

export interface ExamQuestionDelivery {
  examQuestionId: number;
  questionId: number;
  questionOrder: number;
  marks: number;
  questionText: string;
  questionType: QuestionType;
  options: QuestionOptionDelivery[];
}

export interface StudentAnswer {
  id?: number;
  attemptId: number;
  examQuestionId: number;
  answerText?: string | null;
  isFlagged?: boolean;
  selectedOptionIds: number[];
  savedAt?: string;
  version?: number;
}

export interface ExamExecutionPayload {
  attemptId: number;
  examinationId: number;
  scheduleId: number;
  courseCode: string;
  courseName: string;
  examinationTitle: string;
  examinationDescription?: string;
  instructions?: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  attemptNumber: number;
  attemptLimit: number;
  status: AttemptStatus;
  startedAt: string;
  deadlineAt: string;
  serverCurrentTime: string;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  questions: ExamQuestionDelivery[];
  savedAnswers: StudentAnswer[];
}

export interface SaveAnswerRequest {
  examQuestionId: number;
  selectedOptionIds?: number[];
  answerText?: string;
  isFlagged?: boolean;
  clientVersion?: number;
}

export interface ExamSubmissionResult {
  attemptId: number;
  examinationId: number;
  examinationTitle: string;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string;
  totalQuestions: number;
  answeredQuestions: number;
  message: string;
}

export interface ExamEventLogRequest {
  eventType: ExamEventType;
  payload?: string;
}
