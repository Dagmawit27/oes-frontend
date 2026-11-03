export type NotificationType =
  | "EXAM_SCHEDULED"
  | "EXAM_RESCHEDULED"
  | "EXAM_CANCELLED"
  | "EXAM_INSTRUCTIONS_UPDATED"
  | "EXAM_STARTING"
  | "EXAM_DEADLINE_APPROACHING"
  | "EXAM_SUBMITTED"
  | "EXAM_COMPLETED"
  | "RESULTS_PUBLISHED"
  | "ANNOUNCEMENT";

export interface ExamNotification {
  id: number;
  scheduleId?: number | null;
  examinationTitle?: string | null;
  userId: number;
  eventType: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AnnouncementRequest {
  title: string;
  message: string;
  scheduleId?: number | null;
  targetRole?: string | null;
}

export interface UnreadCountResponse {
  unreadCount: number;
}
