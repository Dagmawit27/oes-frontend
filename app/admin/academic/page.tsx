"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { academicApi } from "@/lib/api/academic";
import {
  Department,
  Program,
  AcademicYear,
  Semester,
  Course,
  CourseOffering,
  Student,
  Instructor,
  BulkImportResult,
} from "@/types/academic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Modals & Forms State
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [showOfferingModal, setShowOfferingModal] = useState(false);

  // Forms
  const [programForm, setProgramForm] = useState({
    name: "",
    code: "",
    departmentId: 0,
    degreeType: "Bachelor of Science",
    durationYears: 4,
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

  const [offeringForm, setOfferingForm] = useState({
    courseId: 0,
    semesterId: 0,
    instructorId: 0,
    section: "A",
    maxStudents: 50,
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
      ] = await Promise.all([
        academicApi.getDepartments(),
        academicApi.getPrograms(),
        academicApi.getAcademicYears(),
        academicApi.getAllSemesters(),
        academicApi.getCourses(),
        academicApi.getCourseOfferings(),
        academicApi.getAllStudents(),
        academicApi.getAllInstructors(),
      ]);

      setDepartments(deptRes.data);
      setPrograms(progRes.data);
      setAcademicYears(yearRes.data);
      setSemesters(semRes.data);
      setCourses(courseRes.data);
      setOfferings(offeringRes.data);
      setStudents(studentRes.data);
      setInstructors(instructorRes.data);

      if (deptRes.data.length > 0) {
        setProgramForm((prev) => ({ ...prev, departmentId: deptRes.data[0].id }));
      }
      if (yearRes.data.length > 0) {
        setSemesterForm((prev) => ({ ...prev, academicYearId: yearRes.data[0].id }));
      }
      if (courseRes.data.length > 0 && semRes.data.length > 0 && instructorRes.data.length > 0) {
        setOfferingForm((prev) => ({
          ...prev,
          courseId: courseRes.data[0].id,
          semesterId: semRes.data[0].id,
          instructorId: instructorRes.data[0].id,
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

  const handleCreateOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await academicApi.createOffering(offeringForm);
      toast.success("Course offering created successfully");
      setShowOfferingModal(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create course offering");
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
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-slate-100 shadow-sm">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-400" />
            Academic Management Hub
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Comprehensive configuration of Degree Programs, Academic Years, Semesters, Course Offerings, Students, and Bulk Import
          </p>
        </div>
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Programs</div>
                <div className="text-2xl font-bold text-blue-400 mt-1">{programs.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Academic Years</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{academicYears.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Semesters</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{semesters.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Offerings</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">{offerings.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Students</div>
                <div className="text-2xl font-bold text-purple-400 mt-1">{students.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Faculty</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1">{instructors.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
            {[
              { id: "programs", label: "Degree Programs", icon: Layers },
              { id: "academic-years", label: "Years & Semesters", icon: Calendar },
              { id: "offerings", label: "Course Offerings", icon: BookOpen },
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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: PROGRAMS */}
          {activeTab === "programs" && (
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg">Degree Programs</CardTitle>
                  <CardDescription className="text-slate-400">
                    Programs offered across academic departments
                  </CardDescription>
                </div>
                <Button onClick={() => setShowProgramModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Program
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Code</th>
                        <th className="p-3">Program Name</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Degree Type</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {programs.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/50">
                          <td className="p-3 font-semibold text-blue-400">{p.code}</td>
                          <td className="p-3 text-white">{p.name}</td>
                          <td className="p-3 text-slate-300">{p.departmentName || `Dept #${p.departmentId}`}</td>
                          <td className="p-3 text-slate-400">{p.degreeType}</td>
                          <td className="p-3 text-slate-300">{p.durationYears} Years</td>
                          <td className="p-3">
                            <Badge variant={p.isActive ? "default" : "secondary"}>
                              {p.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: ACADEMIC YEARS & SEMESTERS */}
          {activeTab === "academic-years" && (
            <div className="space-y-6">
              <Card className="bg-slate-900 border-slate-800 text-slate-100">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-lg">Academic Years</CardTitle>
                    <CardDescription className="text-slate-400">
                      Annual academic calendars and validity periods
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowYearModal(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Academic Year
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Year Name</th>
                          <th className="p-3">Start Date</th>
                          <th className="p-3">End Date</th>
                          <th className="p-3">Current Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {academicYears.map((ay) => (
                          <tr key={ay.id} className="hover:bg-slate-800/50">
                            <td className="p-3 font-semibold text-white">{ay.name}</td>
                            <td className="p-3 text-slate-400">{ay.startDate}</td>
                            <td className="p-3 text-slate-400">{ay.endDate}</td>
                            <td className="p-3">
                              {ay.isCurrent ? (
                                <Badge className="bg-emerald-600 text-white">Current Academic Year</Badge>
                              ) : (
                                <Badge variant="secondary">Standard</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Semesters Card */}
              <Card className="bg-slate-900 border-slate-800 text-slate-100">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-lg">Academic Semesters</CardTitle>
                    <CardDescription className="text-slate-400">
                      Term cycles associated with academic years
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowSemesterModal(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Semester
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Semester Name</th>
                          <th className="p-3">Academic Year</th>
                          <th className="p-3">Term Number</th>
                          <th className="p-3">Date Range</th>
                          <th className="p-3">Current</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {semesters.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-800/50">
                            <td className="p-3 font-semibold text-white">{s.name}</td>
                            <td className="p-3 text-slate-300">{s.academicYearName || `Year #${s.academicYearId}`}</td>
                            <td className="p-3 text-slate-400">Semester {s.semesterNumber}</td>
                            <td className="p-3 text-slate-400">
                              {s.startDate} &rarr; {s.endDate}
                            </td>
                            <td className="p-3">
                              {s.isCurrent ? (
                                <Badge className="bg-emerald-600 text-white">Active Term</Badge>
                              ) : (
                                <Badge variant="secondary">Archived</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: COURSE OFFERINGS */}
          {activeTab === "offerings" && (
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg">Course Offerings</CardTitle>
                  <CardDescription className="text-slate-400">
                    Active course sections scheduled for specific semesters with assigned faculty
                  </CardDescription>
                </div>
                <Button onClick={() => setShowOfferingModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Offering
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Course</th>
                        <th className="p-3">Semester</th>
                        <th className="p-3">Section</th>
                        <th className="p-3">Assigned Faculty</th>
                        <th className="p-3">Capacity</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {offerings.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-800/50">
                          <td className="p-3">
                            <div className="font-semibold text-blue-400">{o.courseCode}</div>
                            <div className="text-xs text-slate-300">{o.courseName}</div>
                          </td>
                          <td className="p-3 text-slate-300">{o.semesterName}</td>
                          <td className="p-3 font-semibold text-white">Section {o.section}</td>
                          <td className="p-3 text-slate-300">
                            {o.instructorName}
                            <span className="text-xs text-slate-500 block">({o.instructorEmployeeId})</span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-white">{o.enrolledStudentsCount || 0}</span>
                            <span className="text-slate-500"> / {o.maxStudents}</span>
                          </td>
                          <td className="p-3">
                            <Badge variant={o.isActive ? "default" : "secondary"}>
                              {o.isActive ? "Active" : "Archived"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: STUDENTS */}
          {activeTab === "students" && (
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg">Student Records</CardTitle>
                  <CardDescription className="text-slate-400">
                    Enrolled students with degree program registrations
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setActiveTab("bulk-import")}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Bulk Import Students
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Registration No</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Program</th>
                        <th className="p-3">Year of Study</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {students.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-800/50">
                          <td className="p-3 font-semibold text-purple-400">{st.registrationNumber}</td>
                          <td className="p-3 font-medium text-white">{st.userFullName}</td>
                          <td className="p-3 text-slate-400">{st.userEmail}</td>
                          <td className="p-3 text-slate-300">
                            {st.programCode} - {st.programName}
                          </td>
                          <td className="p-3 text-slate-300">Year {st.yearOfStudy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: INSTRUCTORS */}
          {activeTab === "instructors" && (
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Faculty Instructors</CardTitle>
                <CardDescription className="text-slate-400">
                  Teaching instructors assigned to courses and examination authorship
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Employee ID</th>
                        <th className="p-3">Faculty Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Specialization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {instructors.map((ins) => (
                        <tr key={ins.id} className="hover:bg-slate-800/50">
                          <td className="p-3 font-semibold text-cyan-400">{ins.employeeId}</td>
                          <td className="p-3 font-medium text-white">{ins.userFullName}</td>
                          <td className="p-3 text-slate-400">{ins.userEmail}</td>
                          <td className="p-3 text-slate-300">{ins.departmentName || "Academic Dept"}</td>
                          <td className="p-3 text-slate-300">{ins.specialization || "General"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 6: BULK CSV IMPORT */}
          {activeTab === "bulk-import" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Import Form Card */}
              <Card className="bg-slate-900 border-slate-800 text-slate-100 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-purple-400" />
                    CSV Student Uploader
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Upload batches of students with automated account creation & validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-purple-500 transition-colors">
                    <FileSpreadsheet className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">Select Student CSV File</p>
                    <p className="text-xs text-slate-400 mt-1">UTF-8 encoded .csv format</p>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="mt-4 block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                    />
                  </div>

                  {selectedFile && (
                    <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="font-semibold text-purple-400">File Selected:</span> {selectedFile.name} (
                      {(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}

                  <Button
                    onClick={handleCsvImport}
                    disabled={!selectedFile || importing}
                    className="w-full bg-purple-600 hover:bg-purple-700 font-semibold"
                  >
                    {importing ? "Processing CSV Batch..." : "Execute Bulk Import"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleDownloadSampleCsv}
                    className="w-full border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Sample CSV Template
                  </Button>
                </CardContent>
              </Card>

              {/* Instructions & Summary Report Card */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-slate-900 border-slate-800 text-slate-100">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white">CSV Specification & Validation Rules</CardTitle>
                    <CardDescription className="text-slate-400">
                      Standard student file format, requirements, and auto-provisioning
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-300 space-y-2">
                    <p>The CSV must include the following column headers in the first row:</p>
                    <code className="block bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-blue-400 font-mono">
                      registrationNumber,firstName,lastName,email,programCode,yearOfStudy
                    </code>
                    <ul className="list-disc pl-5 space-y-1 text-slate-400 pt-2">
                      <li>
                        <strong className="text-slate-200">registrationNumber:</strong> Unique student identifier (e.g., STU-2026-101).
                      </li>
                      <li>
                        <strong className="text-slate-200">programCode:</strong> Must match an existing Degree Program code (e.g., BSCS, BSSE).
                      </li>
                      <li>
                        <strong className="text-slate-200">email:</strong> Standard valid email. If account doesn't exist, a User is automatically provisioned with default password <code className="text-slate-200 font-mono">Student@123</code>.
                      </li>
                      <li>
                        <strong className="text-slate-200">Duplicate Check:</strong> Existing registration numbers or students linked to the email will be safely rejected and reported in the summary below.
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Import Summary Results */}
                {importResult && (
                  <Card className="bg-slate-900 border-slate-800 text-slate-100">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Import Execution Summary</span>
                        <div className="flex gap-2">
                          <Badge className="bg-slate-800 text-slate-300">Total: {importResult.totalRecords}</Badge>
                          <Badge className="bg-emerald-600 text-white">Success: {importResult.successfulRecords}</Badge>
                          <Badge className="bg-red-600 text-white">Failed: {importResult.failedRecords}</Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {importResult.errors.length === 0 ? (
                        <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-xl text-emerald-300 text-sm">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          <span>All {importResult.successfulRecords} student records were validated and imported with 0 errors!</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                            Row Validation & Conflict Details
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-60 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-950 text-slate-400 uppercase">
                                <tr>
                                  <th className="p-2.5">Row</th>
                                  <th className="p-2.5">Identifier</th>
                                  <th className="p-2.5">Error Reason</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                {importResult.errors.map((err, idx) => (
                                  <tr key={idx} className="bg-red-950/20 text-red-300">
                                    <td className="p-2.5 font-bold">Line {err.rowNumber}</td>
                                    <td className="p-2.5 font-mono text-slate-300">{err.identifier}</td>
                                    <td className="p-2.5 text-red-400">{err.message}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* CREATE PROGRAM MODAL */}
          {showProgramModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="bg-slate-900 border-slate-800 text-slate-100 max-w-md w-full">
                <CardHeader>
                  <CardTitle>Create Degree Program</CardTitle>
                  <CardDescription className="text-slate-400">
                    Define degree code, name, and parent department
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateProgram} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Program Code</label>
                      <Input
                        required
                        placeholder="e.g. BSCS, BSSE"
                        value={programForm.code}
                        onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
                        className="bg-slate-950 border-slate-800 mt-1 uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Program Name</label>
                      <Input
                        required
                        placeholder="Bachelor of Science in Computer Science"
                        value={programForm.name}
                        onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                        className="bg-slate-950 border-slate-800 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Department</label>
                      <select
                        value={programForm.departmentId}
                        onChange={(e) => setProgramForm({ ...programForm, departmentId: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-slate-200 mt-1"
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
                        <label className="text-xs font-medium text-slate-300">Degree Type</label>
                        <Input
                          value={programForm.degreeType}
                          onChange={(e) => setProgramForm({ ...programForm, degreeType: e.target.value })}
                          className="bg-slate-950 border-slate-800 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300">Duration (Years)</label>
                        <Input
                          type="number"
                          min="1"
                          max="6"
                          value={programForm.durationYears}
                          onChange={(e) => setProgramForm({ ...programForm, durationYears: Number(e.target.value) })}
                          className="bg-slate-950 border-slate-800 mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowProgramModal(false)}
                        className="text-slate-400"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Save Program
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* CREATE ACADEMIC YEAR MODAL */}
          {showYearModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="bg-slate-900 border-slate-800 text-slate-100 max-w-md w-full">
                <CardHeader>
                  <CardTitle>Add Academic Year</CardTitle>
                  <CardDescription className="text-slate-400">Define academic session dates</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateYear} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Academic Year Name</label>
                      <Input
                        required
                        placeholder="e.g. 2026-2027"
                        value={yearForm.name}
                        onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                        className="bg-slate-950 border-slate-800 mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-300">Start Date</label>
                        <Input
                          type="date"
                          required
                          value={yearForm.startDate}
                          onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                          className="bg-slate-950 border-slate-800 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300">End Date</label>
                        <Input
                          type="date"
                          required
                          value={yearForm.endDate}
                          onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                          className="bg-slate-950 border-slate-800 mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="isCurrentYear"
                        checked={yearForm.isCurrent}
                        onChange={(e) => setYearForm({ ...yearForm, isCurrent: e.target.checked })}
                        className="rounded border-slate-800 text-blue-600 bg-slate-950"
                      />
                      <label htmlFor="isCurrentYear" className="text-xs text-slate-300">
                        Set as Current Active Academic Year
                      </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowYearModal(false)}
                        className="text-slate-400"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Save Year
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* CREATE SEMESTER MODAL */}
          {showSemesterModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="bg-slate-900 border-slate-800 text-slate-100 max-w-md w-full">
                <CardHeader>
                  <CardTitle>Add Semester</CardTitle>
                  <CardDescription className="text-slate-400">Define academic term cycle</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateSemester} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Parent Academic Year</label>
                      <select
                        value={semesterForm.academicYearId}
                        onChange={(e) => setSemesterForm({ ...semesterForm, academicYearId: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-slate-200 mt-1"
                      >
                        {academicYears.map((ay) => (
                          <option key={ay.id} value={ay.id}>
                            {ay.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Semester Name</label>
                      <Input
                        required
                        placeholder="e.g. Fall 2026"
                        value={semesterForm.name}
                        onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })}
                        className="bg-slate-950 border-slate-800 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Semester Number</label>
                      <Input
                        type="number"
                        min="1"
                        max="8"
                        required
                        value={semesterForm.semesterNumber}
                        onChange={(e) =>
                          setSemesterForm({ ...semesterForm, semesterNumber: Number(e.target.value) })
                        }
                        className="bg-slate-950 border-slate-800 mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-300">Start Date</label>
                        <Input
                          type="date"
                          required
                          value={semesterForm.startDate}
                          onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })}
                          className="bg-slate-950 border-slate-800 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300">End Date</label>
                        <Input
                          type="date"
                          required
                          value={semesterForm.endDate}
                          onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })}
                          className="bg-slate-950 border-slate-800 mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="isCurrentSemester"
                        checked={semesterForm.isCurrent}
                        onChange={(e) => setSemesterForm({ ...semesterForm, isCurrent: e.target.checked })}
                        className="rounded border-slate-800 text-blue-600 bg-slate-950"
                      />
                      <label htmlFor="isCurrentSemester" className="text-xs text-slate-300">
                        Set as Current Active Term
                      </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowSemesterModal(false)}
                        className="text-slate-400"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Save Semester
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* CREATE COURSE OFFERING MODAL */}
          {showOfferingModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="bg-slate-900 border-slate-800 text-slate-100 max-w-md w-full">
                <CardHeader>
                  <CardTitle>Create Course Offering</CardTitle>
                  <CardDescription className="text-slate-400">
                    Assign faculty to a course in an active semester
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateOffering} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Course</label>
                      <select
                        value={offeringForm.courseId}
                        onChange={(e) => setOfferingForm({ ...offeringForm, courseId: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-slate-200 mt-1"
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} - {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Semester Term</label>
                      <select
                        value={offeringForm.semesterId}
                        onChange={(e) => setOfferingForm({ ...offeringForm, semesterId: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-slate-200 mt-1"
                      >
                        {semesters.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.academicYearName})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Assigned Faculty Instructor</label>
                      <select
                        value={offeringForm.instructorId}
                        onChange={(e) => setOfferingForm({ ...offeringForm, instructorId: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-slate-200 mt-1"
                      >
                        {instructors.map((ins) => (
                          <option key={ins.id} value={ins.id}>
                            {ins.userFullName} ({ins.employeeId})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-300">Section</label>
                        <Input
                          required
                          value={offeringForm.section}
                          onChange={(e) => setOfferingForm({ ...offeringForm, section: e.target.value })}
                          className="bg-slate-950 border-slate-800 mt-1 uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300">Max Students Capacity</label>
                        <Input
                          type="number"
                          min="5"
                          max="300"
                          required
                          value={offeringForm.maxStudents}
                          onChange={(e) => setOfferingForm({ ...offeringForm, maxStudents: Number(e.target.value) })}
                          className="bg-slate-950 border-slate-800 mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowOfferingModal(false)}
                        className="text-slate-400"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Create Offering
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DashboardShell>
  );
}
