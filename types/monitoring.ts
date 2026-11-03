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

export interface CandidateMonitoring {
  studentId: number;
  attemptId?: number | null;
  studentName: string;
  registrationNumber: string;
  email?: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "ABANDONED";
  startedAt?: string | null;
  deadlineAt?: string | null;
  lastActivityAt?: string | null;
  isOnline: boolean;
  answeredQuestions: number;
  totalQuestions: number;
  lastEventType?: string;
}

export interface MonitoringEvent {
  id?: number;
  attemptId: number;
  studentId?: number;
  studentName: string;
  registrationNumber: string;
  eventType: ExamEventType;
  eventPayload?: string;
  occurredAt: string;
}

export interface ExamMonitoringSnapshot {
  scheduleId: number;
  examinationId: number;
  examinationTitle: string;
  courseCode: string;
  courseName: string;
  scheduleStatus: string;
  scheduledStartAt: string;
  scheduledCloseAt: string;
  durationMinutes: number;
  roomName: string;

  totalEligibleStudents: number;
  startedCount: number;
  notStartedCount: number;
  activeAttemptsCount: number;
  submittedCount: number;
  disconnectedCount: number;

  candidates: CandidateMonitoring[];
  recentEvents: MonitoringEvent[];
}

export interface ScheduleMonitoringSummary {
  scheduleId: number;
  examinationId: number;
  examinationTitle: string;
  courseCode: string;
  courseName: string;
  scheduleStatus: string;
  scheduledStartAt: string;
  scheduledCloseAt: string;
  durationMinutes: number;
  totalEligible: number;
  activeAttempts: number;
  submittedCount: number;
}

export interface MonitoringWebSocketMessage {
  messageType: "EVENT" | "METRIC_UPDATE" | "ANNOUNCEMENT";
  scheduleId: number;
  event?: MonitoringEvent;
  candidate?: CandidateMonitoring;
  metrics?: Record<string, unknown>;
  timestamp: string;
}
