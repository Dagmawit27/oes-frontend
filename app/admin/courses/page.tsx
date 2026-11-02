"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { academicApi } from "@/lib/api/academic";
import { Course, Department } from "@/types/academic";
import { BookOpen, Plus, Search, CheckCircle2, AlertCircle } from "lucide-react";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.departmentName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell allowedRoles={["ROLE_ADMIN"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              Course Catalog
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Manage accredited courses, syllabus assignments, and academic credit values
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="shadow-md shadow-blue-500/20">
            <Plus className="w-4 h-4 mr-2" />
            Add Course
          </Button>
        </div>

        {success && (
          <Alert variant="success">
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <Input
              placeholder="Search courses by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Course Offerings Catalog ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading courses...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No courses found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Course Name</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Credits</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((course) => (
                      <tr key={course.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                          {course.code}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{course.name}</td>
                        <td className="py-3 px-4 text-slate-600">{course.departmentName}</td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">{course.credits} Cr</td>
                        <td className="py-3 px-4">
                          <Badge variant={course.isActive ? "success" : "secondary"}>
                            {course.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Create New Course</h3>

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
                      onChange={(e) => setCode(e.target.value)}
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
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
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
                  <Button type="submit">Create Course</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
