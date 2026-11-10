"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { academicApi } from "@/lib/api/academic";
import { Enrollment, CourseOffering, Student } from "@/types/academic";
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ChevronDown,
  Plus,
  X,
  GraduationCap,
  Users,
} from "lucide-react";
import { AdminPageToolbar } from "@/components/admin/AdminPageToolbar";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { exportToCsv } from "@/lib/utils/exportCsv";

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "board" | "list">("table");

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination State - Default 20
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Form State
  const [studentId, setStudentId] = useState<number>(0);
  const [courseOfferingId, setCourseOfferingId] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [enrollRes, offeringsRes, studentsRes] = await Promise.all([
        academicApi.getEnrollments(),
        academicApi.getCourseOfferings(),
        academicApi.getAllStudents(),
      ]);
      if (enrollRes.success) setEnrollments(enrollRes.data);
      if (offeringsRes.success) {
        setOfferings(offeringsRes.data);
        if (offeringsRes.data.length > 0) setCourseOfferingId((prev) => prev || offeringsRes.data[0].id);
      }
      if (studentsRes.success) {
        setStudents(studentsRes.data);
        if (studentsRes.data.length > 0) setStudentId((prev) => prev || studentsRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await academicApi.enrollStudent(studentId, courseOfferingId);
      if (res.success) {
        setSuccess("Student enrolled successfully into course assignment!");
        setShowModal(false);
        fetchData();
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Failed to enroll student");
    }
  };

  // Distinct courses for filter
  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    enrollments.forEach((e) => {
      if (e.courseCode) set.add(e.courseCode);
    });
    return Array.from(set);
  }, [enrollments]);

  // Filtered
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((en) => {
      const matchesSearch =
        search === "" ||
        en.studentName?.toLowerCase().includes(search.toLowerCase()) ||
        en.studentRegistrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
        en.courseCode?.toLowerCase().includes(search.toLowerCase()) ||
        en.courseName?.toLowerCase().includes(search.toLowerCase()) ||
        en.instructorName?.toLowerCase().includes(search.toLowerCase());

      const matchesCourse = courseFilter === "" || en.courseCode === courseFilter;
      const matchesStatus =
        statusFilter === "" ||
        (statusFilter === "ACTIVE" && en.status === "ACTIVE") ||
        (statusFilter === "DROPPED" && en.status !== "ACTIVE");

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [enrollments, search, courseFilter, statusFilter]);

  // Paginated slice
  const paginatedEnrollments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEnrollments.slice(startIndex, startIndex + pageSize);
  }, [filteredEnrollments, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredEnrollments.length / pageSize) || 1;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedEnrollments.map((en) => en.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    exportToCsv(
      "enrollments_export",
      filteredEnrollments.map((en) => ({
        ID: en.id,
        RegNumber: en.studentRegistrationNumber,
        Student: en.studentName,
        CourseCode: en.courseCode,
        CourseName: en.courseName,
        Semester: en.semesterName,
        Section: en.section,
        Instructor: en.instructorName,
        Status: en.status,
      })),
      [
        { key: "ID", label: "ID" },
        { key: "RegNumber", label: "Registration No." },
        { key: "Student", label: "Student Name" },
        { key: "CourseCode", label: "Course Code" },
        { key: "CourseName", label: "Course Title" },
        { key: "Semester", label: "Semester" },
        { key: "Section", label: "Section" },
        { key: "Instructor", label: "Instructor" },
        { key: "Status", label: "Enrollment Status" },
      ]
    );
  };

  return (
    <DashboardShell allowedRoles={["ROLE_ADMIN"]}>
      <div className="space-y-5">
        {/* Header Toolbar */}
        <AdminPageToolbar
          title="Enrollments"
          subtitle="Manage student course enrollments and academic eligibility records."
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search enrollments..."
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          primaryActionLabel="Enroll Student"
          onPrimaryAction={() => {
            if (students.length > 0) {
              setStudentId((prev) => (prev > 0 ? prev : students[0].id));
            }
            if (offerings.length > 0) {
              setCourseOfferingId((prev) => (prev > 0 ? prev : offerings[0].id));
            }
            setError(null);
            setShowModal(true);
          }}
          onExport={handleExport}
          filterChips={
            <>
              {/* Course Code Filter Pill */}
              <div className="relative inline-flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 transition-colors">
                  <BookOpen className="w-3.5 h-3.5 text-slate-600" />
                  <span>Course:</span>
                  <select
                    value={courseFilter}
                    onChange={(e) => {
                      setCourseFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter enrollments by course"
                    className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="">All Courses</option>
                    {courseOptions.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Status Filter Pill */}
              <div className="relative inline-flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 transition-colors">
                  <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                  <span>Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter enrollments by status"
                    className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="DROPPED">Dropped / Withdrawn</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Reset filter */}
              <button
                type="button"
                onClick={() => {
                  if (courseFilter || statusFilter || search) {
                    setCourseFilter("");
                    setStatusFilter("");
                    setSearch("");
                    setCurrentPage(1);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1"
              >
                {courseFilter || statusFilter || search ? (
                  <span className="flex items-center gap-1 text-red-600 font-semibold">
                    <X className="w-3 h-3" /> Reset Filters
                  </span>
                ) : (
                  <>
                    <Plus className="w-3 h-3 text-slate-400" />
                    Add filter
                  </>
                )}
              </button>
            </>
          }
        />

        {success && (
          <Alert variant="success" className="bg-emerald-50 border-emerald-200 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800 font-medium">{success}</AlertDescription>
          </Alert>
        )}

        {viewMode === "table" ? (
          /* White Table Container */
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="py-20 text-center text-sm font-medium text-slate-600">
                Loading enrollments...
              </div>
            ) : filteredEnrollments.length === 0 ? (
              <div className="py-20 text-center">
                <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No enrollments found</h3>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all enrollments on this page"
                          checked={
                            paginatedEnrollments.length > 0 &&
                            paginatedEnrollments.every((en) => selectedIds.includes(en.id))
                          }
                          onChange={handleSelectAll}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Reg Number</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Semester</th>
                      <th className="py-3 px-4">Section</th>
                      <th className="py-3 px-4">Instructor</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedEnrollments.map((en) => {
                      const isSelected = selectedIds.includes(en.id);
                      return (
                        <tr
                          key={en.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? "bg-blue-50/40" : "bg-white"
                          }`}
                        >
                          <td className="py-3 px-4 w-10">
                            <input
                              type="checkbox"
                              aria-label={`Select enrollment for ${en.studentName}`}
                              checked={isSelected}
                              onChange={() => handleToggleSelect(en.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-xs text-slate-900">
                            {en.studentRegistrationNumber}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {en.studentName ? en.studentName.charAt(0) : "S"}
                            </div>
                            <span>{en.studentName}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-semibold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md mr-1.5">
                              {en.courseCode}
                            </span>
                            <span className="text-slate-800 text-xs font-medium">{en.courseName}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 text-xs font-medium">
                            {en.semesterName}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-semibold text-xs">
                            {en.section}
                          </td>
                          <td className="py-3 px-4 text-slate-700 text-xs font-medium">
                            {en.instructorName}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={en.status === "ACTIVE" ? "success" : "secondary"}
                              className="font-semibold text-[11px]"
                            >
                              {en.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <AdminTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredEnrollments.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[20, 50, 100]}
            />
          </div>
        ) : viewMode === "board" ? (
          /* Board View grouped by Section / Course */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {courseOptions.map((courseCode) => {
              const enrolledInCourse = filteredEnrollments.filter((e) => e.courseCode === courseCode);
              return (
                <div key={courseCode} className="bg-slate-50/80 rounded-xl border border-slate-200 p-3 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-semibold text-xs text-slate-800">
                    <span className="font-mono text-blue-700">{courseCode}</span>
                    <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px]">
                      {enrolledInCourse.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {enrolledInCourse.map((en) => (
                      <div key={en.id} className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                        <div className="text-xs font-bold text-slate-900">{en.studentName}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {en.studentRegistrationNumber}
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                          <span>Sec: {en.section}</span>
                          <span className="text-slate-500">{en.instructorName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs">
            {paginatedEnrollments.map((en) => (
              <div key={en.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {en.studentName ? en.studentName.charAt(0) : "S"}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{en.studentName}</h4>
                    <p className="text-xs text-slate-600">
                      <span className="font-mono font-medium">{en.studentRegistrationNumber}</span> •{" "}
                      {en.courseCode} ({en.courseName}) • Section {en.section}
                    </p>
                  </div>
                </div>
                <Badge variant={en.status === "ACTIVE" ? "success" : "secondary"}>{en.status}</Badge>
              </div>
            ))}
            <AdminTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredEnrollments.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[20, 50, 100]}
            />
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                Enroll Student into Course Assignment
              </h3>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleEnroll} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Select Student
                  </label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={studentId}
                    onChange={(e) => setStudentId(Number(e.target.value))}
                    required
                  >
                    {students.length === 0 ? (
                      <option value="">No registered students found</option>
                    ) : (
                      students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.userFullName} ({st.registrationNumber}) — {st.programCode || "General"}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Select the registered student to enroll into this course assignment.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Select Course Assignment
                  </label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={courseOfferingId}
                    onChange={(e) => setCourseOfferingId(Number(e.target.value))}
                  >
                    {offerings.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.courseCode} - {co.courseName} (Sec {co.section}, {co.semesterName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Complete Enrollment
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
