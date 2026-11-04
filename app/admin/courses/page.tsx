"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { academicApi } from "@/lib/api/academic";
import { Course, Department } from "@/types/academic";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Building2,
  Award,
  ChevronDown,
  Plus,
  X,
} from "lucide-react";
import { AdminPageToolbar } from "@/components/admin/AdminPageToolbar";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { exportToCsv } from "@/lib/utils/exportCsv";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [creditsFilter, setCreditsFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "board" | "list">("table");

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination State - Default 20
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [departmentId, setDepartmentId] = useState<number>(1);
  const [credits, setCredits] = useState<number>(3);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, deptsRes] = await Promise.all([
        academicApi.getCourses(),
        academicApi.getDepartments(),
      ]);
      if (coursesRes.success) setCourses(coursesRes.data);
      if (deptsRes.success) {
        setDepartments(deptsRes.data);
        if (deptsRes.data.length > 0) setDepartmentId(deptsRes.data[0].id);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await academicApi.createCourse({
        name,
        code,
        departmentId,
        credits,
        description,
        isActive: true,
      });

      if (res.success) {
        setSuccess("Course created successfully!");
        setName("");
        setCode("");
        setDescription("");
        setShowModal(false);
        fetchData();
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Failed to create course");
    }
  };

  // Filtered
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        search === "" ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        (c.departmentName && c.departmentName.toLowerCase().includes(search.toLowerCase()));

      const matchesDept =
        departmentFilter === "" || c.departmentName === departmentFilter;

      const matchesCredits =
        creditsFilter === "" || String(c.credits) === creditsFilter;

      return matchesSearch && matchesDept && matchesCredits;
    });
  }, [courses, search, departmentFilter, creditsFilter]);

  // Paginated slice
  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCourses.slice(startIndex, startIndex + pageSize);
  }, [filteredCourses, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCourses.length / pageSize) || 1;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedCourses.map((c) => c.id));
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
      "courses_catalog_export",
      filteredCourses.map((c) => ({
        ID: c.id,
        Code: c.code,
        Name: c.name,
        Department: c.departmentName,
        Credits: c.credits,
        Status: c.isActive ? "Active" : "Inactive",
      })),
      [
        { key: "ID", label: "ID" },
        { key: "Code", label: "Course Code" },
        { key: "Name", label: "Course Title" },
        { key: "Department", label: "Department" },
        { key: "Credits", label: "Credits" },
        { key: "Status", label: "Status" },
      ]
    );
  };

  return (
    <DashboardShell allowedRoles={["ROLE_ADMIN"]}>
      <div className="space-y-5">
        {/* Header Toolbar */}
        <AdminPageToolbar
          title="Courses"
          subtitle="Manage course curriculum, department assignments, and credit allocations."
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search courses..."
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          primaryActionLabel="Add Course"
          onPrimaryAction={() => setShowModal(true)}
          onExport={handleExport}
          filterChips={
            <>
              {/* Department Filter Pill */}
              <div className="relative inline-flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 transition-colors">
                  <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Department:</span>
                  <select
                    value={departmentFilter}
                    onChange={(e) => {
                      setDepartmentFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter courses by department"
                    className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Credits Filter Pill */}
              <div className="relative inline-flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 transition-colors">
                  <Award className="w-3.5 h-3.5 text-slate-600" />
                  <span>Credits:</span>
                  <select
                    value={creditsFilter}
                    onChange={(e) => {
                      setCreditsFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter courses by credits"
                    className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="">All Credits</option>
                    <option value="1">1 Credit</option>
                    <option value="2">2 Credits</option>
                    <option value="3">3 Credits</option>
                    <option value="4">4 Credits</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Reset filter */}
              <button
                type="button"
                onClick={() => {
                  if (departmentFilter || creditsFilter || search) {
                    setDepartmentFilter("");
                    setCreditsFilter("");
                    setSearch("");
                    setCurrentPage(1);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1"
              >
                {departmentFilter || creditsFilter || search ? (
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
                Loading courses...
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="py-20 text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No courses found</h3>
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
                          aria-label="Select all courses on this page"
                          checked={
                            paginatedCourses.length > 0 &&
                            paginatedCourses.every((c) => selectedIds.includes(c.id))
                          }
                          onChange={handleSelectAll}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Course Name</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Credits</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedCourses.map((course) => {
                      const isSelected = selectedIds.includes(course.id);
                      return (
                        <tr
                          key={course.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? "bg-blue-50/40" : "bg-white"
                          }`}
                        >
                          <td className="py-3 px-4 w-10">
                            <input
                              type="checkbox"
                              aria-label={`Select ${course.name}`}
                              checked={isSelected}
                              onChange={() => handleToggleSelect(course.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-semibold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                              {course.code}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {course.name}
                          </td>
                          <td className="py-3 px-4 text-slate-700 text-xs font-medium">
                            {course.departmentName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              {course.credits} Credits
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={course.isActive ? "success" : "secondary"}
                              className="font-semibold text-[11px]"
                            >
                              {course.isActive ? "Active" : "Inactive"}
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
              totalItems={filteredCourses.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[20, 50, 100]}
            />
          </div>
        ) : viewMode === "board" ? (
          /* Board View grouped by Department */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const deptCourses = filteredCourses.filter((c) => c.departmentName === dept.name);
              return (
                <div key={dept.id} className="bg-slate-50/80 rounded-xl border border-slate-200 p-3 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-semibold text-xs text-slate-800">
                    <span>{dept.name}</span>
                    <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px]">
                      {deptCourses.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {deptCourses.map((c) => (
                      <div key={c.id} className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            {c.code}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {c.credits} Cr
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">{c.name}</div>
                      </div>
                    ))}
                    {deptCourses.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400">No courses</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs">
            {paginatedCourses.map((course) => (
              <div key={course.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-bold text-xs">
                    {course.code}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{course.name}</h4>
                    <p className="text-xs text-slate-600">
                      {course.departmentName} • {course.credits} Credits
                    </p>
                  </div>
                </div>
                <Badge variant={course.isActive ? "success" : "secondary"}>
                  {course.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
            <AdminTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCourses.length}
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
                <BookOpen className="w-5 h-5 text-blue-600" />
                Create New Course
              </h3>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Course Code
                    </label>
                    <Input
                      placeholder="e.g. CS301"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Credits
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={6}
                      value={credits}
                      onChange={(e) => setCredits(parseInt(e.target.value) || 3)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Department
                  </label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(Number(e.target.value))}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Course Name
                  </label>
                  <Input
                    placeholder="e.g. Database Management Systems"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Description
                  </label>
                  <Input
                    placeholder="Brief syllabus overview"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
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
                    Create Course
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
