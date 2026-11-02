"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { academicApi } from "@/lib/api/academic";
import { Enrollment, CourseOffering } from "@/types/academic";
import { UserCheck, Plus, Search, CheckCircle2, AlertCircle } from "lucide-react";

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [studentId, setStudentId] = useState<number>(1);
  const [courseOfferingId, setCourseOfferingId] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [enrollRes, offeringsRes] = await Promise.all([
        academicApi.getEnrollments(),
        academicApi.getCourseOfferings(),
      ]);
      if (enrollRes.success) setEnrollments(enrollRes.data);
      if (offeringsRes.success) {
        setOfferings(offeringsRes.data);
        if (offeringsRes.data.length > 0) setCourseOfferingId(offeringsRes.data[0].id);
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
        setSuccess("Student enrolled successfully into course offering!");
        setShowModal(false);
        fetchData();
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Failed to enroll student");
    }
  };

  const filtered = enrollments.filter(
    (en) =>
      en.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      en.studentRegistrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
      en.courseCode?.toLowerCase().includes(search.toLowerCase()) ||
      en.courseName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell allowedRoles={["ROLE_ADMIN"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-blue-600" />
              Course Enrollments
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Assign eligible students to active semester course offerings with duplicate check
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="shadow-md shadow-blue-500/20">
            <Plus className="w-4 h-4 mr-2" />
            Enroll Student
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
              placeholder="Search by student, reg number, or course code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Active Enrollments ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading enrollments...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No enrollments found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <th className="py-3 px-4">Reg Number</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Semester</th>
                      <th className="py-3 px-4">Section</th>
                      <th className="py-3 px-4">Instructor</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((en) => (
                      <tr key={en.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          {en.studentRegistrationNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{en.studentName}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-blue-600 mr-2">
                            {en.courseCode}
                          </span>
                          <span className="text-slate-600">{en.courseName}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{en.semesterName}</td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">{en.section}</td>
                        <td className="py-3 px-4 text-slate-600">{en.instructorName}</td>
                        <td className="py-3 px-4">
                          <Badge variant={en.status === "ACTIVE" ? "success" : "secondary"}>
                            {en.status}
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
              <h3 className="text-lg font-bold text-slate-900">Enroll Student into Course</h3>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleEnroll} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Student ID
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={studentId}
                    onChange={(e) => setStudentId(Number(e.target.value))}
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">Seeded Alex Student is ID: 1</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Select Course Offering
                  </label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
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
                  <Button type="submit">Complete Enrollment</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
