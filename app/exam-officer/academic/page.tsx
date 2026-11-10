"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { academicApi } from "@/lib/api/academic";
import { CourseOffering, Enrollment } from "@/types/academic";
import { BookOpen, Users, Calendar, UserCheck, X, Search, RefreshCw, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export default function ExamOfficerAcademicPage() {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Roster Modal State
  const [selectedOffering, setSelectedOffering] = useState<CourseOffering | null>(null);
  const [roster, setRoster] = useState<Enrollment[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const fetchOfferings = async () => {
    try {
      setLoading(true);
      const res = await academicApi.getCourseOfferings();
      if (res.success && res.data) {
        setOfferings(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load course assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferings();
  }, []);

  const handleOpenRoster = async (offering: CourseOffering) => {
    setSelectedOffering(offering);
    setLoadingRoster(true);
    try {
      const res = await academicApi.getOfferingEnrolledStudents(offering.id);
      if (res.success && res.data) {
        setRoster(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load enrolled student list");
    } finally {
      setLoadingRoster(false);
    }
  };

  const filteredOfferings = offerings.filter(
    (o) =>
      o.courseCode.toLowerCase().includes(search.toLowerCase()) ||
      o.courseName.toLowerCase().includes(search.toLowerCase()) ||
      o.instructorName.toLowerCase().includes(search.toLowerCase()) ||
      o.semesterName.toLowerCase().includes(search.toLowerCase())
  );

  const totalEnrolled = offerings.reduce((acc, o) => acc + (o.enrolledStudentsCount || 0), 0);

  return (
    <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white border-slate-200/90 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Course Assignments</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{offerings.length}</p>
                <p className="text-[11px] text-slate-500">Across current academic terms</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/90 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Enrolled Students</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalEnrolled}</p>
                <p className="text-[11px] text-slate-500">Total student enrollments</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/90 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/60">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Status</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">
                  {offerings.filter((o) => o.isActive).length} Active
                </p>
                <p className="text-[11px] text-slate-500">Ready for exam assignment</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Offerings Table */}
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400 bg-white border border-slate-200/90 rounded-2xl">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
            <p>Loading course assignments...</p>
          </div>
        ) : filteredOfferings.length === 0 ? (
          <Card className="bg-white border-slate-200/90 shadow-xs">
            <CardContent className="py-16 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-800">No Course Assignments Found</p>
              <p className="text-xs text-slate-500 mt-1">
                {search ? "No course assignments match your search query." : "No course assignments have been created yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Course Assignments ({filteredOfferings.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select a course assignment to inspect the live candidate roster
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 font-semibold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Course Code</th>
                      <th className="py-3 px-4">Course Title</th>
                      <th className="py-3 px-4">Semester</th>
                      <th className="py-3 px-4">Section</th>
                      <th className="py-3 px-4">Instructor</th>
                      <th className="py-3 px-4">Enrolled / Cap</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOfferings.map((co) => (
                      <tr key={co.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-sky-700">{co.courseCode}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">{co.courseName}</td>
                        <td className="py-3.5 px-4 text-slate-600">{co.semesterName}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">Section {co.section}</td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {co.instructorName}
                          <span className="text-slate-400 block text-[11px]">({co.instructorEmployeeId})</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-900">{co.enrolledStudentsCount || 0}</span>
                          <span className="text-slate-400"> / {co.maxStudents}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              co.isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {co.isActive ? "Active" : "Archived"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleOpenRoster(co)}
                            className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8 gap-1.5 shadow-xs"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            View Enrolled Students
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ENROLLED STUDENTS ROSTER MODAL */}
        {selectedOffering && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="bg-white border-slate-200 shadow-xl max-w-3xl w-full rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-sky-700 px-2 py-0.5 bg-sky-50 border border-sky-200 rounded">
                      {selectedOffering.courseCode}
                    </span>
                    <CardTitle className="text-base text-slate-900 font-bold">
                      {selectedOffering.courseName}
                    </CardTitle>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Enrolled Student Roster &bull; Section {selectedOffering.section} &bull; {selectedOffering.semesterName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOffering(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {loadingRoster ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600 mb-2"></div>
                    <p>Loading student roster...</p>
                  </div>
                ) : roster.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No Enrolled Students</p>
                    <p className="text-slate-400 mt-0.5">
                      No students are currently enrolled in this course section.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200 text-[10px] font-semibold">
                        <tr>
                          <th className="p-3">Reg Number</th>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Enrolled Date</th>
                          <th className="p-3">Eligibility Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {roster.map((enr) => (
                          <tr key={enr.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 font-mono text-sky-700 font-semibold">
                              {enr.studentRegistrationNumber}
                            </td>
                            <td className="p-3 text-slate-900 font-medium">{enr.studentName}</td>
                            <td className="p-3 text-slate-500">{enr.studentEmail}</td>
                            <td className="p-3 text-slate-500">{enr.enrolledDate}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {enr.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Total: <strong>{roster.length}</strong> students enrolled
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedOffering(null)}
                    className="border-slate-200 text-slate-700 text-xs h-8"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
