"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { academicApi } from "@/lib/api/academic";
import { apiClient } from "@/lib/api/client";
import { ApiResponse, User } from "@/types/auth";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  GraduationCap,
  Layers,
  Calendar,
  CalendarClock,
  BookOpen,
  Users,
  UploadCloud,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  AlertCircle,
  Download,
  Search,
  Filter,
  Eye,
  Edit2,
  Power,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminAcademicHubPage() {
  const [activeTab, setActiveTab] = useState<
    "programs" | "academic-years" | "offerings" | "students" | "instructors" | "bulk-import"
  >("programs");

  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [instructorUsers, setInstructorUsers] = useState<any[]>([]);

  // Modals & Forms State
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [showOfferingModal, setShowOfferingModal] = useState(false);
  const [editingOffering, setEditingOffering] = useState<CourseOffering | null>(null);
  const [viewingOffering, setViewingOffering] = useState<CourseOffering | null>(null);
  const [rosterOffering, setRosterOffering] = useState<CourseOffering | null>(null);
  const [rosterStudents, setRosterStudents] = useState<Enrollment[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [showInstructorModal, setShowInstructorModal] = useState(false);

  // Course Assignment Search & Filters
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [filterProgramId, setFilterProgramId] = useState<string>("");
  const [filterYearId, setFilterYearId] = useState<string>("");
  const [filterSemesterId, setFilterSemesterId] = useState<string>("");
  const [filterInstructorId, setFilterInstructorId] = useState<string>("");

  // Forms
  const [programForm, setProgramForm] = useState({
    name: "",
    code: "",
    departmentId: 0,
    degreeType: "Bachelor of Science",
    durationYears: 4,
  });

  const [instructorForm, setInstructorForm] = useState({
    userId: 0,
    departmentId: 0,
    employeeId: "",
    specialization: "General Faculty",
  });

  const [yearForm, setYearForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const [semesterForm, setSemesterForm] = useState({
    academicYearId: 0,
    name: "",
    semesterNumber: 1,
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const [offeringForm, setOfferingForm] = useState<{
    courseId: number;
    programId: string;
    academicYearId: string;
    semesterId: number;
    studentYearLevel: string;
    instructorId: number;
    section: string;
    maxStudents: number;
    isActive: boolean;
  }>({
    courseId: 0,
    programId: "",
    academicYearId: "",
    semesterId: 0,
    studentYearLevel: "1",
    instructorId: 0,
    section: "A",
    maxStudents: 50,
    isActive: true,
  });

  // Bulk CSV Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        deptRes,
        progRes,
        yearRes,
        semRes,
        courseRes,
        offeringRes,
        studentRes,
        instructorRes,
        usersRes,
      ] = await Promise.all([
        academicApi.getDepartments(),
        academicApi.getPrograms(),
        academicApi.getAcademicYears(),
        academicApi.getAllSemesters(),
        academicApi.getCourses(),
        academicApi.getCourseOfferings(),
        academicApi.getAllStudents(),
        academicApi.getAllInstructors(),
        apiClient.get<ApiResponse<{ content: User[] }>>("/users", { params: { size: 100 } }).catch(() => null),
      ]);

      setDepartments(deptRes.data);
      setPrograms(progRes.data);
      setAcademicYears(yearRes.data);
      setSemesters(semRes.data);
      setCourses(courseRes.data);
      setOfferings(offeringRes.data);
      setStudents(studentRes.data);
      setInstructors(instructorRes.data);

      if (usersRes && usersRes.data?.success && usersRes.data.data) {
        const insUsers = usersRes.data.data.content.filter((u) => u.roles.includes("ROLE_INSTRUCTOR"));
        setInstructorUsers(insUsers);
        if (insUsers.length > 0 && deptRes.data.length > 0) {
          setInstructorForm((prev) => ({
            ...prev,
            userId: prev.userId || insUsers[0].id,
            departmentId: prev.departmentId || deptRes.data[0].id,
            employeeId: prev.employeeId || `INS-${String(insUsers[0].id).padStart(3, "0")}`,
          }));
        }
      }

      if (deptRes.data.length > 0) {
        setProgramForm((prev) => ({ ...prev, departmentId: deptRes.data[0].id }));
      }
      if (yearRes.data.length > 0) {
        setSemesterForm((prev) => ({ ...prev, academicYearId: yearRes.data[0].id }));
      }
      if (courseRes.data.length > 0 && semRes.data.length > 0 && instructorRes.data.length > 0) {
        const defaultSem = semRes.data[0];
        setOfferingForm((prev) => ({
          ...prev,
          courseId: prev.courseId || courseRes.data[0].id,
          academicYearId:
            prev.academicYearId ||
            (defaultSem.academicYearId ? String(defaultSem.academicYearId) : ""),
          semesterId: prev.semesterId || defaultSem.id,
          programId:
            prev.programId !== ""
              ? prev.programId
              : progRes.data.length > 0
                ? String(progRes.data[0].id)
                : "",
          instructorId: prev.instructorId || instructorRes.data[0].id,
        }));
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load academic records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await academicApi.createProgram(programForm);
      toast.success("Degree program created successfully");
      setShowProgramModal(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create program");
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await academicApi.createAcademicYear(yearForm);
      toast.success("Academic year created successfully");
      setShowYearModal(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create academic year");
    }
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await academicApi.createSemester(semesterForm.academicYearId, semesterForm);
      toast.success("Semester created successfully");
      setShowSemesterModal(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create semester");
    }
  };

  const openCreateAssignmentModal = () => {
    const defaultYearId = academicYears.length > 0 ? String(academicYears[0].id) : "";
    const matchingSemester =
      semesters.find((s) => !defaultYearId || String(s.academicYearId) === defaultYearId) ||
      semesters[0];

    setEditingOffering(null);
    setOfferingForm({
      courseId: courses.length > 0 ? courses[0].id : 0,
      programId: programs.length > 0 ? String(programs[0].id) : "",
      academicYearId: matchingSemester?.academicYearId
        ? String(matchingSemester.academicYearId)
        : defaultYearId,
      semesterId: matchingSemester ? matchingSemester.id : 0,
      studentYearLevel: "1",
      instructorId: instructors.length > 0 ? instructors[0].id : 0,
      section: "A",
      maxStudents: 50,
      isActive: true,
    });
    setShowOfferingModal(true);
  };

  const openEditAssignmentModal = (assignment: CourseOffering) => {
    const semObj = semesters.find((s) => s.id === assignment.semesterId);
    const yearId =
      assignment.academicYearId ?? semObj?.academicYearId ?? (academicYears[0]?.id || "");

    setEditingOffering(assignment);
    setOfferingForm({
      courseId: assignment.courseId,
      programId: assignment.programId ? String(assignment.programId) : "",
      academicYearId: yearId ? String(yearId) : "",
      semesterId: assignment.semesterId,
      studentYearLevel: assignment.studentYearLevel ? String(assignment.studentYearLevel) : "",
      instructorId: assignment.instructorId,
      section: assignment.section,
      maxStudents: assignment.maxStudents || 50,
      isActive: assignment.isActive,
    });
    setShowOfferingModal(true);
  };

  const handleCreateOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<CourseOffering> = {
      courseId: offeringForm.courseId,
      semesterId: offeringForm.semesterId,
      instructorId: offeringForm.instructorId,
      programId: offeringForm.programId ? Number(offeringForm.programId) : null,
      studentYearLevel: offeringForm.studentYearLevel
        ? Number(offeringForm.studentYearLevel)
        : null,
      section: offeringForm.section.trim().toUpperCase(),
      maxStudents: offeringForm.maxStudents,
      isActive: offeringForm.isActive,
    };

    try {
      if (editingOffering) {
        await academicApi.updateOffering(editingOffering.id, payload);
        toast.success("Course assignment updated successfully");
      } else {
        await academicApi.createOffering(payload);
        toast.success("Course assignment created successfully");
      }
      setShowOfferingModal(false);
      setEditingOffering(null);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message ||
          (editingOffering
            ? "Failed to update course assignment"
            : "Failed to create course assignment")
      );
    }
  };

  const handleToggleOfferingStatus = async (assignment: CourseOffering) => {
    try {
      const nextStatus = !assignment.isActive;
      await academicApi.toggleOfferingStatus(assignment.id, nextStatus);
      toast.success(
        nextStatus
          ? "Course assignment activated"
          : "Course assignment deactivated"
      );
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message || "Failed to update course assignment status"
      );
    }
  };

  const handleOpenAssignmentRoster = async (assignment: CourseOffering) => {
    setRosterOffering(assignment);
    setLoadingRoster(true);
    try {
      const res = await academicApi.getOfferingEnrolledStudents(assignment.id);
      if (res.success && res.data) {
        setRosterStudents(res.data);
      } else {
        setRosterStudents([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load enrolled students");
      setRosterStudents([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    const q = assignmentSearch.trim().toLowerCase();
    return offerings.filter((o) => {
      const sem = semesters.find((s) => s.id === o.semesterId);
      const effectiveYearId = o.academicYearId ?? sem?.academicYearId;
      const effectiveYearName = o.academicYearName || sem?.academicYearName || "";

      const matchSearch =
        !q ||
        o.courseCode.toLowerCase().includes(q) ||
        o.courseName.toLowerCase().includes(q) ||
        (o.programName && o.programName.toLowerCase().includes(q)) ||
        (o.programCode && o.programCode.toLowerCase().includes(q)) ||
        o.semesterName.toLowerCase().includes(q) ||
        effectiveYearName.toLowerCase().includes(q) ||
        o.section.toLowerCase().includes(q) ||
        o.instructorName.toLowerCase().includes(q);

      const matchProgram =
        !filterProgramId || String(o.programId ?? "") === filterProgramId;
      const matchYear =
        !filterYearId || String(effectiveYearId ?? "") === filterYearId;
      const matchSemester =
        !filterSemesterId || String(o.semesterId) === filterSemesterId;
      const matchInstructor =
        !filterInstructorId || String(o.instructorId) === filterInstructorId;

      return matchSearch && matchProgram && matchYear && matchSemester && matchInstructor;
    });
  }, [
    offerings,
    semesters,
    assignmentSearch,
    filterProgramId,
    filterYearId,
    filterSemesterId,
    filterInstructorId,
  ]);

  const modalSemesters = useMemo(() => {
    if (!offeringForm.academicYearId) return semesters;
    const filtered = semesters.filter(
      (s) => String(s.academicYearId) === offeringForm.academicYearId
    );
    return filtered.length > 0 ? filtered : semesters;
  }, [semesters, offeringForm.academicYearId]);

  const handleCreateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await academicApi.createInstructor(instructorForm);
      toast.success("Faculty instructor profile created successfully");
      setShowInstructorModal(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create instructor profile");
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a valid CSV file");
      return;
    }

    try {
      setImporting(true);
      const res = await academicApi.importStudentsCsv(selectedFile);
      setImportResult(res.data);
      if (res.data.successfulRecords > 0) {
        toast.success(`Successfully imported ${res.data.successfulRecords} students`);
        loadData();
      } else {
        toast.error("CSV import completed with failures. Inspect error details.");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to process CSV file");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      "registrationNumber,firstName,lastName,email,programCode,yearOfStudy\n" +
      "STU-2026-001,Alexander,Wright,alexander.wright@college.edu,BSCS,1\n" +
      "STU-2026-002,Sophia,Miller,sophia.miller@college.edu,BSSE,1\n" +
      "STU-2026-003,Liam,Johnson,liam.johnson@college.edu,BSCS,2\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_bulk_import_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardShell allowedRoles={["ROLE_ADMIN"]}>
      <div className="space-y-6">
        {/* Pure White & Light Blue Banner */}
        <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50/60 border border-blue-200/90 p-6 rounded-2xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-6 h-6" />
                </div>
                Academic Management Hub
              </h2>
              <p className="text-sm text-slate-600 mt-1.5">
                Comprehensive configuration of Degree Programs, Academic Years, Semesters, Course Assignments, Students, and Bulk Import
              </p>
            </div>
          </div>
        </div>

        {/* Quick Metrics: Pure White & Light Blue Accent Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Programs</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{programs.length}</div>
          </div>
          <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Years</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{academicYears.length}</div>
          </div>
          <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Semesters</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{semesters.length}</div>
          </div>
          <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignments</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{offerings.length}</div>
          </div>
          <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{students.length}</div>
          </div>
          <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faculty</div>
            <div className="text-2xl font-bold text-cyan-600 mt-1">{instructors.length}</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-blue-100 pb-2">
          {[
            { id: "programs", label: "Degree Programs", icon: Layers },
            { id: "academic-years", label: "Years & Semesters", icon: Calendar },
            { id: "offerings", label: "Course Assignments", icon: BookOpen },
            { id: "students", label: "Student Records", icon: Users },
            { id: "instructors", label: "Faculty Records", icon: GraduationCap },
            { id: "bulk-import", label: "Bulk CSV Import", icon: UploadCloud },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 border border-slate-200/80 shadow-2xs"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-blue-600"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: PROGRAMS */}
        {activeTab === "programs" && (
          <div className="bg-white rounded-xl border border-blue-100/90 shadow-xs overflow-hidden">
            <div className="flex flex-row items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Degree Programs</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Degree programs offered across academic faculties and departments
                </p>
              </div>
              <Button
                onClick={() => setShowProgramModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Program
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead className="bg-blue-50/70 border-b border-blue-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Program Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Degree Type</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {programs.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          {p.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium text-xs">
                        {p.departmentName || `Dept #${p.departmentId}`}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-xs">{p.degreeType}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium text-xs">
                        {p.durationYears} Years
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={p.isActive ? "success" : "secondary"}
                          className="font-semibold text-[11px]"
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {programs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                        No degree programs found. Click "Add Program" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ACADEMIC YEARS & SEMESTERS */}
        {activeTab === "academic-years" && (
          <div className="space-y-6">
            {/* Academic Years Table */}
            <div className="bg-white rounded-xl border border-blue-100/90 shadow-xs overflow-hidden">
              <div className="flex flex-row items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Academic Years</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Annual academic calendars and official college validity periods
                  </p>
                </div>
                <Button
                  onClick={() => setShowYearModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Academic Year
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse bg-white">
                  <thead className="bg-blue-50/70 border-b border-blue-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Year Name</th>
                      <th className="py-3 px-4">Start Date</th>
                      <th className="py-3 px-4">End Date</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {academicYears.map((ay) => (
                      <tr key={ay.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{ay.name}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700">{ay.startDate}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700">{ay.endDate}</td>
                        <td className="py-3 px-4">
                          {ay.isCurrent ? (
                            <Badge variant="success" className="font-semibold text-[11px]">
                              Current Academic Year
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="font-semibold text-[11px]">
                              Standard
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Semesters Table */}
            <div className="bg-white rounded-xl border border-blue-100/90 shadow-xs overflow-hidden">
              <div className="flex flex-row items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Academic Semesters</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Term cycles associated with registered academic sessions
                  </p>
                </div>
                <Button
                  onClick={() => setShowSemesterModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Semester
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse bg-white">
                  <thead className="bg-blue-50/70 border-b border-blue-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Semester Name</th>
                      <th className="py-3 px-4">Academic Year</th>
                      <th className="py-3 px-4">Term</th>
                      <th className="py-3 px-4">Date Range</th>
                      <th className="py-3 px-4">Current</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {semesters.map((s) => (
                      <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium text-xs">
                          {s.academicYearName || `Year #${s.academicYearId}`}
                        </td>
                        <td className="py-3 px-4 text-slate-700 text-xs">
                          Semester {s.semesterNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700">
                          {s.startDate} &rarr; {s.endDate}
                        </td>
                        <td className="py-3 px-4">
                          {s.isCurrent ? (
                            <Badge variant="success" className="font-semibold text-[11px]">
                              Active Term
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="font-semibold text-[11px]">
                              Archived
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COURSE ASSIGNMENTS */}
        {activeTab === "offerings" && (
          <div className="bg-white rounded-xl border border-blue-100/90 shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Course Assignments</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign catalog courses to academic programs, years, semesters, student year levels, sections, and instructors
                </p>
              </div>
              <Button
                onClick={openCreateAssignmentModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Course Assignment
              </Button>
            </div>

            {/* Search & Filters Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                <div className="relative lg:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={assignmentSearch}
                    onChange={(e) => setAssignmentSearch(e.target.value)}
                    placeholder="Search course assignments..."
                    className="pl-9 h-9 bg-white border-slate-200 text-xs"
                  />
                </div>

                <select
                  aria-label="Filter by Academic Program"
                  value={filterProgramId}
                  onChange={(e) => setFilterProgramId(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Programs</option>
                  {programs.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Academic Year"
                  value={filterYearId}
                  onChange={(e) => setFilterYearId(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Academic Years</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={String(ay.id)}>
                      {ay.name}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Semester"
                  value={filterSemesterId}
                  onChange={(e) => setFilterSemesterId(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Semesters</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Instructor"
                  value={filterInstructorId}
                  onChange={(e) => setFilterInstructorId(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Instructors</option>
                  {instructors.map((ins) => (
                    <option key={ins.id} value={String(ins.id)}>
                      {ins.userFullName}
                    </option>
                  ))}
                </select>
              </div>

              {(assignmentSearch || filterProgramId || filterYearId || filterSemesterId || filterInstructorId) && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Showing <strong>{filteredAssignments.length}</strong> of {offerings.length} course assignments
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentSearch("");
                      setFilterProgramId("");
                      setFilterYearId("");
                      setFilterSemesterId("");
                      setFilterInstructorId("");
                    }}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead className="bg-blue-50/70 border-b border-blue-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Program & Level</th>
                    <th className="py-3 px-4">Academic Year & Semester</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Assigned Instructor</th>
                    <th className="py-3 px-4">Enrolled</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-sm text-slate-500">
                        {offerings.length === 0
                          ? 'No course assignments found. Click "Add Course Assignment" to create one.'
                          : "No course assignments match your search or selected filters."}
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((o) => {
                      const matchingSem = semesters.find((s) => s.id === o.semesterId);
                      const yearLabel = o.academicYearName || matchingSem?.academicYearName || "Current Year";
                      const programLabel = o.programCode
                        ? `${o.programCode}${o.programName ? ` — ${o.programName}` : ""}`
                        : "General / Unspecified";
                      const levelLabel = o.studentYearLevel ? `Year ${o.studentYearLevel}` : "All Levels";

                      return (
                        <tr key={o.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono font-semibold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md mr-1.5">
                              {o.courseCode}
                            </span>
                            <span className="text-slate-900 font-semibold text-xs">{o.courseName}</span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <div className="font-medium text-slate-800 max-w-[190px] truncate" title={programLabel}>
                              {programLabel}
                            </div>
                            <span className="text-[11px] text-slate-500">{levelLabel}</span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <div className="font-semibold text-slate-800">{o.semesterName}</div>
                            <span className="text-[11px] text-slate-500">{yearLabel}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 text-xs">Section {o.section}</td>
                          <td className="py-3 px-4 text-slate-800 text-xs font-medium">
                            {o.instructorName}
                            <span className="text-[11px] text-slate-500 block">
                              ({o.instructorEmployeeId})
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium">
                            <span className="font-bold text-slate-900">{o.enrolledStudentsCount || 0}</span>
                            <span className="text-slate-500"> / {o.maxStudents}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={o.isActive ? "success" : "secondary"}
                              className="font-semibold text-[11px]"
                            >
                              {o.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="View Course Assignment"
                                onClick={() => setViewingOffering(o)}
                                className="h-8 px-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 text-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Edit Course Assignment"
                                onClick={() => openEditAssignmentModal(o)}
                                className="h-8 px-2 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title={o.isActive ? "Deactivate Course Assignment" : "Activate Course Assignment"}
                                onClick={() => handleToggleOfferingStatus(o)}
                                className={`h-8 px-2 text-xs ${
                                  o.isActive
                                    ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                    : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAssignmentRoster(o)}
                                className="h-8 px-2.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1"
                              >
                                <Users className="w-3.5 h-3.5 text-blue-600" />
                                Students
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: STUDENTS */}
        {activeTab === "students" && (
          <div className="bg-white rounded-xl border border-blue-100/90 shadow-xs overflow-hidden">
            <div className="flex flex-row items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Student Records</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enrolled students registered in college degree programs
                </p>
              </div>
              <Button
                onClick={() => setActiveTab("bulk-import")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs"
              >
                <UploadCloud className="w-4 h-4 mr-1.5" />
                Bulk Import Students
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead className="bg-blue-50/70 border-b border-blue-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Registration No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Program</th>
                    <th className="py-3 px-4">Year of Study</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md">
                        {st.registrationNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{st.userFullName}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{st.userEmail}</td>
                      <td className="py-3 px-4 text-slate-800 text-xs font-medium">
                        {st.programCode} - {st.programName}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-xs font-semibold">
                        Year {st.yearOfStudy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: INSTRUCTORS */}
        {activeTab === "instructors" && (
          <div className="bg-white rounded-xl border border-blue-100/90 shadow-xs overflow-hidden">
            <div className="flex flex-row items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Faculty Instructors ({instructors.length})</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Teaching instructors assigned to courses and examination authorship
                </p>
              </div>
              <Button
                onClick={() => setShowInstructorModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Faculty Profile
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead className="bg-blue-50/70 border-b border-blue-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Faculty Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Specialization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {instructors.map((ins) => (
                    <tr key={ins.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                        {ins.employeeId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{ins.userFullName}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{ins.userEmail}</td>
                      <td className="py-3 px-4 text-slate-800 text-xs font-medium">
                        {ins.departmentName || "Academic Dept"}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-xs">
                        {ins.specialization || "General"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: BULK CSV IMPORT */}
        {activeTab === "bulk-import" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Import Form Card */}
            <div className="bg-white rounded-xl border border-blue-100 p-6 shadow-xs lg:col-span-1 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-blue-600" />
                  CSV Student Uploader
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload batches of students with automated account creation & validation
                </p>
              </div>

              <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                <FileSpreadsheet className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">Select Student CSV File</p>
                <p className="text-xs text-slate-500 mt-1">UTF-8 encoded .csv format</p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-4 block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
              </div>

              {selectedFile && (
                <div className="text-xs text-blue-900 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <span className="font-semibold text-blue-700">File Selected:</span> {selectedFile.name} (
                  {(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}

              <Button
                onClick={handleCsvImport}
                disabled={!selectedFile || importing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {importing ? "Processing CSV Batch..." : "Execute Bulk Import"}
              </Button>

              <Button
                variant="outline"
                onClick={handleDownloadSampleCsv}
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 bg-white font-semibold text-xs"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Sample CSV Template
              </Button>
            </div>

            {/* Instructions & Summary Report Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-blue-100 p-6 shadow-xs space-y-3">
                <h4 className="text-base font-bold text-slate-900">
                  CSV Specification & Validation Rules
                </h4>
                <p className="text-xs text-slate-500">
                  Standard student file format, requirements, and auto-provisioning
                </p>
                <p className="text-xs text-slate-700 pt-1">
                  The CSV must include the following column headers in the first row:
                </p>
                <code className="block bg-blue-50/80 p-3 rounded-lg border border-blue-200 text-blue-900 font-mono text-xs font-semibold">
                  registrationNumber,firstName,lastName,email,programCode,yearOfStudy
                </code>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 pt-1">
                  <li>
                    <strong className="text-slate-900">registrationNumber:</strong> Unique student identifier (e.g., STU-2026-101).
                  </li>
                  <li>
                    <strong className="text-slate-900">programCode:</strong> Must match an existing Degree Program code (e.g., BSCS, BSSE).
                  </li>
                  <li>
                    <strong className="text-slate-900">email:</strong> Standard valid email. If account doesn't exist, a User is automatically provisioned with default password <code className="text-blue-700 font-mono">Student@123</code>.
                  </li>
                  <li>
                    <strong className="text-slate-900">Duplicate Check:</strong> Existing registration numbers or students linked to the email will be safely rejected and reported in the summary below.
                  </li>
                </ul>
              </div>

              {/* Import Summary Results */}
              {importResult && (
                <div className="bg-white rounded-xl border border-blue-100 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-bold text-slate-900 text-base">Import Execution Summary</span>
                    <div className="flex gap-2">
                      <Badge variant="secondary">Total: {importResult.totalRecords}</Badge>
                      <Badge variant="success">Success: {importResult.successfulRecords}</Badge>
                      <Badge variant="destructive">Failed: {importResult.failedRecords}</Badge>
                    </div>
                  </div>

                  {importResult.errors.length === 0 ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>All {importResult.successfulRecords} student records were validated and imported with 0 errors!</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                        Row Validation & Conflict Details
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-red-200 max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-xs bg-white">
                          <thead className="bg-red-50 text-red-900 uppercase">
                            <tr>
                              <th className="p-2.5">Row</th>
                              <th className="p-2.5">Identifier</th>
                              <th className="p-2.5">Error Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-red-100">
                            {importResult.errors.map((err, idx) => (
                              <tr key={idx} className="hover:bg-red-50/50">
                                <td className="p-2.5 font-bold text-red-700">Line {err.rowNumber}</td>
                                <td className="p-2.5 font-mono text-slate-800">{err.identifier}</td>
                                <td className="p-2.5 text-red-600 font-medium">{err.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CREATE PROGRAM MODAL */}
        {showProgramModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 text-slate-900 max-w-md w-full rounded-2xl shadow-2xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Degree Program</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define degree code, name, and parent academic department
                </p>
              </div>
              <form onSubmit={handleCreateProgram} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Program Code
                  </label>
                  <Input
                    required
                    placeholder="e.g. BSCS, BSSE"
                    value={programForm.code}
                    onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
                    className="bg-white border-slate-300 uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Program Name
                  </label>
                  <Input
                    required
                    placeholder="Bachelor of Science in Computer Science"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                    className="bg-white border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Department
                  </label>
                  <select
                    value={programForm.departmentId}
                    onChange={(e) => setProgramForm({ ...programForm, departmentId: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      Degree Type
                    </label>
                    <Input
                      value={programForm.degreeType}
                      onChange={(e) => setProgramForm({ ...programForm, degreeType: e.target.value })}
                      className="bg-white border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      Duration (Years)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="6"
                      value={programForm.durationYears}
                      onChange={(e) => setProgramForm({ ...programForm, durationYears: Number(e.target.value) })}
                      className="bg-white border-slate-300"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProgramModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Save Program
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE ACADEMIC YEAR MODAL */}
        {showYearModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 text-slate-900 max-w-md w-full rounded-2xl shadow-2xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Academic Year</h3>
                <p className="text-xs text-slate-500 mt-0.5">Define academic session dates</p>
              </div>
              <form onSubmit={handleCreateYear} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Academic Year Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. 2026-2027"
                    value={yearForm.name}
                    onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                    className="bg-white border-slate-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      required
                      value={yearForm.startDate}
                      onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                      className="bg-white border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      End Date
                    </label>
                    <Input
                      type="date"
                      required
                      value={yearForm.endDate}
                      onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                      className="bg-white border-slate-300"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isCurrentYear"
                    checked={yearForm.isCurrent}
                    onChange={(e) => setYearForm({ ...yearForm, isCurrent: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="isCurrentYear" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Set as Current Active Academic Year
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowYearModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Save Year
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE SEMESTER MODAL */}
        {showSemesterModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 text-slate-900 max-w-md w-full rounded-2xl shadow-2xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Semester</h3>
                <p className="text-xs text-slate-500 mt-0.5">Define academic term cycle</p>
              </div>
              <form onSubmit={handleCreateSemester} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Parent Academic Year
                  </label>
                  <select
                    value={semesterForm.academicYearId}
                    onChange={(e) => setSemesterForm({ ...semesterForm, academicYearId: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Semester Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. Fall 2026"
                    value={semesterForm.name}
                    onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })}
                    className="bg-white border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Semester Number
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    required
                    value={semesterForm.semesterNumber}
                    onChange={(e) =>
                      setSemesterForm({ ...semesterForm, semesterNumber: Number(e.target.value) })
                    }
                    className="bg-white border-slate-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      required
                      value={semesterForm.startDate}
                      onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })}
                      className="bg-white border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      End Date
                    </label>
                    <Input
                      type="date"
                      required
                      value={semesterForm.endDate}
                      onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })}
                      className="bg-white border-slate-300"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isCurrentSemester"
                    checked={semesterForm.isCurrent}
                    onChange={(e) => setSemesterForm({ ...semesterForm, isCurrent: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="isCurrentSemester" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Set as Current Active Term
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSemesterModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Save Semester
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE / EDIT COURSE ASSIGNMENT MODAL */}
        {showOfferingModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 text-slate-900 max-w-lg w-full rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingOffering ? "Edit Course Assignment" : "Add Course Assignment"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign a catalog course to an academic program, year, semester, year level, section, and instructor
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowOfferingModal(false);
                    setEditingOffering(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOffering} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Course
                  </label>
                  <select
                    value={offeringForm.courseId}
                    onChange={(e) => setOfferingForm({ ...offeringForm, courseId: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Academic Program
                  </label>
                  <select
                    value={offeringForm.programId}
                    onChange={(e) => setOfferingForm({ ...offeringForm, programId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All / General Program</option>
                    {programs.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      Academic Year
                    </label>
                    <select
                      value={offeringForm.academicYearId}
                      onChange={(e) => {
                        const newYearId = e.target.value;
                        const matchingSem = semesters.find(
                          (s) => !newYearId || String(s.academicYearId) === newYearId
                        );
                        setOfferingForm({
                          ...offeringForm,
                          academicYearId: newYearId,
                          semesterId: matchingSem ? matchingSem.id : offeringForm.semesterId,
                        });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Academic Years</option>
                      {academicYears.map((ay) => (
                        <option key={ay.id} value={String(ay.id)}>
                          {ay.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      Semester
                    </label>
                    <select
                      value={offeringForm.semesterId}
                      onChange={(e) =>
                        setOfferingForm({ ...offeringForm, semesterId: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {modalSemesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.academicYearName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      Student Year Level
                    </label>
                    <select
                      value={offeringForm.studentYearLevel}
                      onChange={(e) =>
                        setOfferingForm({ ...offeringForm, studentYearLevel: e.target.value })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Year Levels</option>
                      <option value="1">Year 1</option>
                      <option value="2">Year 2</option>
                      <option value="3">Year 3</option>
                      <option value="4">Year 4</option>
                      <option value="5">Year 5</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      Section
                    </label>
                    <Input
                      required
                      value={offeringForm.section}
                      onChange={(e) => setOfferingForm({ ...offeringForm, section: e.target.value })}
                      className="bg-white border-slate-300 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Assigned Instructor
                  </label>
                  <select
                    value={offeringForm.instructorId}
                    onChange={(e) => setOfferingForm({ ...offeringForm, instructorId: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {instructors.length === 0 ? (
                      <option value="">No faculty instructors registered</option>
                    ) : (
                      instructors.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.userFullName} ({ins.employeeId}) — {ins.departmentName}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      Status
                    </label>
                    <select
                      value={offeringForm.isActive ? "ACTIVE" : "INACTIVE"}
                      onChange={(e) =>
                        setOfferingForm({ ...offeringForm, isActive: e.target.value === "ACTIVE" })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                      Max Students Capacity
                    </label>
                    <Input
                      type="number"
                      min="5"
                      max="300"
                      required
                      value={offeringForm.maxStudents}
                      onChange={(e) => setOfferingForm({ ...offeringForm, maxStudents: Number(e.target.value) })}
                      className="bg-white border-slate-300"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowOfferingModal(false);
                      setEditingOffering(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    {editingOffering ? "Save Course Assignment" : "Add Course Assignment"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW COURSE ASSIGNMENT DETAILS MODAL */}
        {viewingOffering && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 text-slate-900 max-w-lg w-full rounded-2xl shadow-2xl p-6 space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Course Assignment Details</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewingOffering.courseCode} — {viewingOffering.courseName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingOffering(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold block">Course</span>
                  <span className="text-slate-900 font-semibold mt-0.5 block">
                    {viewingOffering.courseCode} — {viewingOffering.courseName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold block">Academic Program</span>
                  <span className="text-slate-900 font-semibold mt-0.5 block">
                    {viewingOffering.programCode
                      ? `${viewingOffering.programCode} — ${viewingOffering.programName}`
                      : "General / Unspecified"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold block">Academic Year</span>
                  <span className="text-slate-900 font-semibold mt-0.5 block">
                    {viewingOffering.academicYearName ||
                      semesters.find((s) => s.id === viewingOffering.semesterId)?.academicYearName ||
                      "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold block">Semester</span>
                  <span className="text-slate-900 font-semibold mt-0.5 block">
                    {viewingOffering.semesterName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold block">Student Year Level</span>
                  <span className="text-slate-900 font-semibold mt-0.5 block">
                    {viewingOffering.studentYearLevel ? `Year ${viewingOffering.studentYearLevel}` : "All Year Levels"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold block">Section</span>
                  <span className="text-slate-900 font-semibold mt-0.5 block">
                    Section {viewingOffering.section}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold block">Assigned Instructor</span>
                  <span className="text-slate-900 font-semibold mt-0.5 block">
                    {viewingOffering.instructorName} ({viewingOffering.instructorEmployeeId})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold block">Status & Enrollment</span>
                  <span className="text-slate-900 font-semibold mt-0.5 block">
                    {viewingOffering.isActive ? "Active" : "Inactive"} ({viewingOffering.enrolledStudentsCount || 0} /{" "}
                    {viewingOffering.maxStudents})
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const target = viewingOffering;
                    setViewingOffering(null);
                    handleOpenAssignmentRoster(target);
                  }}
                  className="text-xs gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  View Enrolled Students
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const target = viewingOffering;
                    setViewingOffering(null);
                    openEditAssignmentModal(target);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Course Assignment
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW ENROLLED STUDENTS MODAL */}
        {rosterOffering && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 text-slate-900 max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {rosterOffering.courseCode} — {rosterOffering.courseName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enrolled Students in Course Assignment &bull; Section {rosterOffering.section} &bull;{" "}
                    {rosterOffering.semesterName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRosterOffering(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {loadingRoster ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    Loading enrolled students...
                  </div>
                ) : rosterStudents.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    No students are currently enrolled in this course assignment.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-3">Reg Number</th>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Enrolled Date</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rosterStudents.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-semibold text-blue-700">
                              {st.studentRegistrationNumber}
                            </td>
                            <td className="p-3 font-medium text-slate-900">{st.studentName}</td>
                            <td className="p-3 text-slate-500">{st.studentEmail}</td>
                            <td className="p-3 text-slate-500">{st.enrolledDate}</td>
                            <td className="p-3">
                              <Badge variant={st.status === "ACTIVE" ? "success" : "secondary"}>
                                {st.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Total Enrolled: <strong>{rosterStudents.length}</strong>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRosterOffering(null)}
                    className="text-xs h-8"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CREATE INSTRUCTOR MODAL */}
        {showInstructorModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 text-slate-900 max-w-md w-full rounded-2xl shadow-2xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Faculty Instructor Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Link an instructor user account to an academic department
                </p>
              </div>
              <form onSubmit={handleCreateInstructor} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    User Account (ROLE_INSTRUCTOR)
                  </label>
                  <select
                    value={instructorForm.userId}
                    onChange={(e) => {
                      const uid = Number(e.target.value);
                      setInstructorForm({
                        ...instructorForm,
                        userId: uid,
                        employeeId: `INS-${String(uid).padStart(3, "0")}`,
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {instructorUsers.length === 0 ? (
                      <option value="">No users with ROLE_INSTRUCTOR found</option>
                    ) : (
                      instructorUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Academic Department
                  </label>
                  <select
                    value={instructorForm.departmentId}
                    onChange={(e) => setInstructorForm({ ...instructorForm, departmentId: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Employee ID
                  </label>
                  <Input
                    required
                    placeholder="e.g. INS-002"
                    value={instructorForm.employeeId}
                    onChange={(e) => setInstructorForm({ ...instructorForm, employeeId: e.target.value })}
                    className="bg-white border-slate-300 uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">
                    Specialization
                  </label>
                  <Input
                    required
                    placeholder="e.g. Algorithms, Machine Learning"
                    value={instructorForm.specialization}
                    onChange={(e) => setInstructorForm({ ...instructorForm, specialization: e.target.value })}
                    className="bg-white border-slate-300"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInstructorModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Save Profile
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
