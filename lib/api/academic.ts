import { apiClient } from "./client";
import { ApiResponse } from "@/types/auth";
import {
  Department,
  Program,
  AcademicYear,
  Semester,
  Course,
  CourseOffering,
  Enrollment,
  Student,
  Instructor,
  BulkImportResult,
} from "@/types/academic";

export const academicApi = {
  // Departments
  async getDepartments(): Promise<ApiResponse<Department[]>> {
    const response = await apiClient.get<ApiResponse<Department[]>>("/departments");
    return response.data;
  },

  async createDepartment(data: Partial<Department>): Promise<ApiResponse<Department>> {
    const response = await apiClient.post<ApiResponse<Department>>("/departments", data);
    return response.data;
  },

  async deleteDepartment(id: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/departments/${id}`);
    return response.data;
  },

  // Programs
  async getPrograms(): Promise<ApiResponse<Program[]>> {
    const response = await apiClient.get<ApiResponse<Program[]>>("/programs");
    return response.data;
  },

  async createProgram(data: Partial<Program>): Promise<ApiResponse<Program>> {
    const response = await apiClient.post<ApiResponse<Program>>("/programs", data);
    return response.data;
  },

  async deleteProgram(id: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/programs/${id}`);
    return response.data;
  },

  // Academic Years & Semesters
  async getAcademicYears(): Promise<ApiResponse<AcademicYear[]>> {
    const response = await apiClient.get<ApiResponse<AcademicYear[]>>("/academic-years");
    return response.data;
  },

  async createAcademicYear(data: Partial<AcademicYear>): Promise<ApiResponse<AcademicYear>> {
    const response = await apiClient.post<ApiResponse<AcademicYear>>("/academic-years", data);
    return response.data;
  },

  async getAllSemesters(): Promise<ApiResponse<Semester[]>> {
    const response = await apiClient.get<ApiResponse<Semester[]>>("/academic-years/semesters");
    return response.data;
  },

  async getSemestersByAcademicYear(yearId: number): Promise<ApiResponse<Semester[]>> {
    const response = await apiClient.get<ApiResponse<Semester[]>>(`/academic-years/${yearId}/semesters`);
    return response.data;
  },

  async createSemester(yearId: number, data: Partial<Semester>): Promise<ApiResponse<Semester>> {
    const response = await apiClient.post<ApiResponse<Semester>>(`/academic-years/${yearId}/semesters`, data);
    return response.data;
  },

  // Courses
  async getCourses(): Promise<ApiResponse<Course[]>> {
    const response = await apiClient.get<ApiResponse<Course[]>>("/courses");
    return response.data;
  },

  async createCourse(data: Partial<Course>): Promise<ApiResponse<Course>> {
    const response = await apiClient.post<ApiResponse<Course>>("/courses", data);
    return response.data;
  },

  async deleteCourse(id: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/courses/${id}`);
    return response.data;
  },

  // Course Offerings
  async getCourseOfferings(semesterId?: number): Promise<ApiResponse<CourseOffering[]>> {
    const response = await apiClient.get<ApiResponse<CourseOffering[]>>("/course-offerings", {
      params: semesterId ? { semesterId } : {},
    });
    return response.data;
  },

  async getOfferingById(id: number): Promise<ApiResponse<CourseOffering>> {
    const response = await apiClient.get<ApiResponse<CourseOffering>>(`/course-offerings/${id}`);
    return response.data;
  },

  async getOfferingEnrolledStudents(offeringId: number): Promise<ApiResponse<Enrollment[]>> {
    const response = await apiClient.get<ApiResponse<Enrollment[]>>(`/course-offerings/${offeringId}/students`);
    return response.data;
  },

  async getMyAssignedOfferings(): Promise<ApiResponse<CourseOffering[]>> {
    const response = await apiClient.get<ApiResponse<CourseOffering[]>>("/course-offerings/my-assigned");
    return response.data;
  },

  async createOffering(data: Partial<CourseOffering>): Promise<ApiResponse<CourseOffering>> {
    const response = await apiClient.post<ApiResponse<CourseOffering>>("/course-offerings", data);
    return response.data;
  },

  async deactivateOffering(id: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/course-offerings/${id}`);
    return response.data;
  },

  // Enrollments
  async getEnrollments(courseOfferingId?: number): Promise<ApiResponse<Enrollment[]>> {
    const response = await apiClient.get<ApiResponse<Enrollment[]>>("/enrollments", {
      params: courseOfferingId ? { courseOfferingId } : {},
    });
    return response.data;
  },

  async getMyEnrolledCourses(): Promise<ApiResponse<Enrollment[]>> {
    const response = await apiClient.get<ApiResponse<Enrollment[]>>("/enrollments/my-courses");
    return response.data;
  },

  async getMyStudents(): Promise<ApiResponse<Enrollment[]>> {
    const response = await apiClient.get<ApiResponse<Enrollment[]>>("/enrollments/my-students");
    return response.data;
  },

  async enrollStudent(studentId: number, courseOfferingId: number): Promise<ApiResponse<Enrollment>> {
    const response = await apiClient.post<ApiResponse<Enrollment>>("/enrollments", {
      studentId,
      courseOfferingId,
    });
    return response.data;
  },

  async dropEnrollment(enrollmentId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/enrollments/${enrollmentId}`);
    return response.data;
  },

  // Students & Bulk Import
  async getAllStudents(): Promise<ApiResponse<Student[]>> {
    const response = await apiClient.get<ApiResponse<Student[]>>("/students");
    return response.data;
  },

  async getMyStudentProfile(): Promise<ApiResponse<Student>> {
    const response = await apiClient.get<ApiResponse<Student>>("/students/my-profile");
    return response.data;
  },

  async createStudent(data: Partial<Student>): Promise<ApiResponse<Student>> {
    const response = await apiClient.post<ApiResponse<Student>>("/students", data);
    return response.data;
  },

  async importStudentsCsv(file: File): Promise<ApiResponse<BulkImportResult>> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<ApiResponse<BulkImportResult>>("/students/import-csv", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Instructors
  async getAllInstructors(): Promise<ApiResponse<Instructor[]>> {
    const response = await apiClient.get<ApiResponse<Instructor[]>>("/instructors");
    return response.data;
  },

  async createInstructor(data: Partial<Instructor>): Promise<ApiResponse<Instructor>> {
    const response = await apiClient.post<ApiResponse<Instructor>>("/instructors", data);
    return response.data;
  },
};
