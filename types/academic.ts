export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface Program {
  id: number;
  departmentId: number;
  departmentName?: string;
  name: string;
  code: string;
  degreeType: string;
  durationYears: number;
  isActive: boolean;
}

export interface AcademicYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Semester {
  id: number;
  academicYearId: number;
  academicYearName?: string;
  name: string;
  semesterNumber: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Course {
  id: number;
  departmentId: number;
  departmentName?: string;
  name: string;
  code: string;
  description?: string;
  credits: number;
  isActive: boolean;
}

export interface CourseOffering {
  id: number;
  courseId: number;
  courseName: string;
  courseCode: string;
  semesterId: number;
  semesterName: string;
  academicYearId?: number;
  academicYearName?: string;
  programId?: number | null;
  programName?: string | null;
  programCode?: string | null;
  studentYearLevel?: number | null;
  instructorId: number;
  instructorName: string;
  instructorEmployeeId: string;
  section: string;
  maxStudents: number;
  enrolledStudentsCount: number;
  isActive: boolean;
}

export interface Student {
  id: number;
  userId: number;
  userEmail: string;
  userFullName: string;
  programId: number;
  programName?: string;
  programCode?: string;
  registrationNumber: string;
  yearOfStudy: number;
}

export interface Instructor {
  id: number;
  userId: number;
  userEmail: string;
  userFullName: string;
  departmentId: number;
  departmentName?: string;
  employeeId: string;
  specialization?: string;
}

export interface Enrollment {
  id: number;
  studentId: number;
  studentName: string;
  studentRegistrationNumber: string;
  studentEmail: string;
  courseOfferingId: number;
  courseName: string;
  courseCode: string;
  semesterName: string;
  instructorName: string;
  section: string;
  enrolledDate: string;
  status: 'ACTIVE' | 'DROPPED' | 'COMPLETED';
}

export interface ImportErrorDetail {
  rowNumber: number;
  identifier: string;
  message: string;
}

export interface BulkImportResult {
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: ImportErrorDetail[];
}
