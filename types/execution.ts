import { QuestionType } from "./question";

export type AttemptStatus =
  | "NOT_STARTED"
  | "WAITING_FOR_START"
  | "ACTIVE"
  | "IN_PROGRESS"
  | "CONNECTION_PAUSED"
  | "RESUME_REQUIRED"
  | "SUBMITTED"
  | "AUTO_SUBMITTED"
  | "EXPIRED"
  | "CANCELLED"
  | "ABANDONED";

export type ExamEventType =
  | "STARTED"
  | "PASSCODE_VERIFIED"
  | "PASSCODE_FAILED"
  | "ANSWER_SAVED"
  | "QUESTION_FLAGGED"
  | "TAB_BLUR"
  | "WINDOW_RESIZED"
  | "DISCONNECTED"
  | "RECONNECTED"
  | "CONNECTION_PAUSED"
  | "CONNECTION_RESUMED"
  | "HEARTBEAT_TIMEOUT"
  | "SUBMITTED"
  | "AUTO_SUBMITTED"
  | "AUTO_SUBMITTED_EXPIRED"
  | "RATE_LIMIT_EXCEEDED";

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
  durationSeconds?: number;
  remainingActiveSeconds?: number;
  resumeStage?: number;
  totalMarks: number;
  passingMarks: number;
  attemptNumber: number;
  attemptLimit: number;
  status: AttemptStatus;
  startedAt: string;
  activeSince?: string;
  pausedAt?: string;
  deadlineAt?: string;
  serverCurrentTime: string;
  timezone?: string;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  questions: ExamQuestionDelivery[];
  savedAnswers: StudentAnswer[];
}

export interface StartExamRequest {
  scheduleId: number;
  passcode?: string;
}

export interface ResumeExamRequest {
  attemptId: number;
  passcode: string;
}

export interface HeartbeatRequest {
  clientRemainingSeconds?: number;
  isTabActive?: boolean;
}

export interface HeartbeatResponse {
  attemptId: number;
  status: AttemptStatus;
  remainingActiveSeconds: number;
  accumulatedActiveSeconds: number;
  resumeStage: number;
  isPaused?: boolean;
  isTerminated: boolean;
  serverCurrentTime: string;
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
