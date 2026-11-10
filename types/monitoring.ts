import { isSchedulePassedOrClosed, ScheduleStatus } from "./schedule";

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
  | "RATE_LIMIT_EXCEEDED"
  | "SUBMITTED"
  | "AUTO_SUBMITTED"
  | "AUTO_SUBMITTED_EXPIRED";

export interface CandidateMonitoring {
  studentId: number;
  attemptId?: number | null;
  studentName: string;
  registrationNumber: string;
  email?: string;
  status:
    | "NOT_STARTED"
    | "ACTIVE"
    | "IN_PROGRESS"
    | "CONNECTION_PAUSED"
    | "RESUME_REQUIRED"
    | "SUBMITTED"
    | "AUTO_SUBMITTED"
    | "EXPIRED"
    | "ABANDONED";
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

export function isMonitoringSessionPassedOrClosed(
  session: {
    scheduleStatus: string;
    scheduledCloseAt: string;
  },
  nowMs?: number | null
): boolean {
  return isSchedulePassedOrClosed(
    {
      status: session.scheduleStatus as ScheduleStatus,
      scheduledCloseAt: session.scheduledCloseAt,
    },
    nowMs
  );
}

export function isMonitoringSessionReadOnly(
  session: {
    scheduleStatus: string;
    scheduledCloseAt: string;
  },
  nowMs?: number | null
): boolean {
  return (
    session.scheduleStatus === "CANCELLED" ||
    isMonitoringSessionPassedOrClosed(session, nowMs)
  );
}

const ACTIVE_CANDIDATE_STATUSES = new Set([
  "ACTIVE",
  "IN_PROGRESS",
  "CONNECTION_PAUSED",
  "RESUME_REQUIRED",
]);

const SUBMITTED_CANDIDATE_STATUSES = new Set([
  "SUBMITTED",
  "AUTO_SUBMITTED",
]);

export function isCandidateActiveStatus(status?: string | null): boolean {
  return Boolean(status && ACTIVE_CANDIDATE_STATUSES.has(status));
}

export function isCandidateSubmittedStatus(status?: string | null): boolean {
  return Boolean(status && SUBMITTED_CANDIDATE_STATUSES.has(status));
}
