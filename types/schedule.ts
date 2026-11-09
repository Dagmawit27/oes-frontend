export type ScheduleStatus =
  | "SCHEDULED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED";

export type EligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "EXEMPTED" | "BLOCKED";

export type NotificationType =
  | "EXAM_SCHEDULED"
  | "EXAM_RESCHEDULED"
  | "EXAM_CANCELLED"
  | "EXAM_INSTRUCTIONS_UPDATED";

export interface ExamRoom {
  id: number;
  name: string;
  building?: string;
  capacity: number;
  isActive: boolean;
  createdAt: string;
}

export interface ExamEligibility {
  id: number;
  scheduleId: number;
  studentId: number;
  studentIdNumber: string;
  studentName: string;
  studentEmail: string;
  programName?: string;
  eligibilityStatus: EligibilityStatus;
  reason?: string;
  createdAt: string;
}

export interface ExamSchedule {
  id: number;
  examinationId: number;
  examinationTitle: string;
  examinationDescription?: string;
  totalMarks: number;
  passingMarks: number;

  courseOfferingId?: number;
  courseId?: number;
  courseCode?: string;
  courseName?: string;
  semesterName?: string;
  academicYearName?: string;
  section?: string;

  instructorName?: string;
  instructorEmail?: string;

  examinationDate?: string;
  scheduledStartTime?: string;
  scheduledStartAt: string;
  scheduledCloseAt: string;
  startAccessEndsAt?: string;
  durationMinutes: number;

  roomId?: number;
  roomName?: string;
  building?: string;

  timezone: string;
  status: ScheduleStatus;
  instructions?: string;

  createdById: number;
  createdByName?: string;

  eligibleStudentCount: number;
  eligibilities?: ExamEligibility[];

  createdAt: string;
  updatedAt?: string;
}

export interface StudentSchedule {
  scheduleId: number;
  examinationId: number;
  examinationTitle: string;
  examinationDescription?: string;

  courseCode: string;
  courseName: string;
  section?: string;
  semesterName?: string;

  examinationDate?: string;
  scheduledStartTime?: string;
  scheduledStartAt: string;
  scheduledCloseAt: string;
  startAccessEndsAt?: string;
  timezone?: string;
  durationMinutes: number;

  totalMarks: number;
  passingMarks: number;

  roomName?: string;
  building?: string;

  status: ScheduleStatus;
  eligibilityStatus: EligibilityStatus;
  eligibilityReason?: string;
  instructions?: string;

  isAvailableNow: boolean;
  availableNow?: boolean;
  isStartableNow?: boolean;
  startableNow?: boolean;
  isResumableNow?: boolean;
  resumableNow?: boolean;
  isStartWindowClosed?: boolean;
  startWindowClosed?: boolean;
  isBeforeScheduledStart?: boolean;
  beforeScheduledStart?: boolean;

  attemptStatus?: string;
  attemptId?: number;
  resumeStage?: number;
  remainingActiveSeconds?: number;
  effectiveDeadline?: string;
}

export interface ExamNotification {
  id: number;
  scheduleId?: number;
  userId: number;
  eventType: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface CreateScheduleRequest {
  examinationId: number;
  examinationDate: string;
  scheduledStartTime: string;
  timezone?: string;
  passcode1: string;
  passcode2: string;
  passcode3: string;
  roomId?: number;
  instructions?: string;
  autoGenerateEligibility?: boolean;

  // Fallback compatibility
  scheduledStartAt?: string;
  scheduledCloseAt?: string;
  durationMinutes?: number;
}

export interface RescheduleRequest {
  examinationDate?: string;
  scheduledStartTime?: string;
  scheduledStartAt?: string;
  scheduledCloseAt?: string;
  durationMinutes?: number;
  roomId?: number;
  instructions?: string;
  reason?: string;
}

export interface StudentConflictItem {
  studentId: number;
  studentIdNumber: string;
  studentName: string;
  conflictingScheduleId: number;
  conflictingExamTitle: string;
  conflictingStart: string;
  conflictingClose: string;
}

export interface ScheduleConflict {
  hasConflict: boolean;
  roomConflictMessage?: string;
  studentConflicts?: StudentConflictItem[];
}
