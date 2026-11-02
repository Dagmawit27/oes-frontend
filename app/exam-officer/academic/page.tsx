"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { academicApi } from "@/lib/api/academic";
import { CourseOffering, Enrollment } from "@/types/academic";
import { BookOpen, Users, Calendar, UserCheck, X, Search } from "lucide-react";
import { toast } from "sonner";

export default function ExamOfficerAcademicPage() {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Roster Modal State
  const [selectedOffering, setSelectedOffering] = useState<CourseOffering | null>(null);
  const [roster, setRoster] = useState<Enrollment[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        setLoading(true);
        const res = await academicApi.getCourseOfferings();
        setOfferings(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load course offerings");
      } finally {
        setLoading(false);
      }
    };

    fetchOfferings();
  }, []);

  const handleOpenRoster = async (offering: CourseOffering) => {
    setSelectedOffering(offering);
    setLoadingRoster(true);
    try {
      const res = await academicApi.getOfferingEnrolledStudents(offering.id);
      setRoster(res.data);
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

  return (
    <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER"]}>
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-400" />
              Academic Course Offerings & Rosters
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Inspect active semester offerings, assigned instructors, and enrolled students for exam scheduling
            </p>
          </div>
          <div className="w-full md:w-72">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search courses or faculty..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading academic offerings...</div>
        ) : filteredOfferings.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardContent className="py-12 text-center text-slate-400">
              No matching course offerings found.
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Course Code</th>
                      <th className="p-3">Course Title</th>
                      <th className="p-3">Semester</th>
                      <th className="p-3">Section</th>
                      <th className="p-3">Instructor</th>
                      <th className="p-3">Enrolled / Cap</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredOfferings.map((co) => (
                      <tr key={co.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-blue-400">{co.courseCode}</td>
                        <td className="p-3 font-medium text-white">{co.courseName}</td>
                        <td className="p-3 text-slate-300">{co.semesterName}</td>
                        <td className="p-3 font-semibold text-white">Section {co.section}</td>
                        <td className="p-3 text-slate-300">
                          {co.instructorName}
                          <span className="text-slate-500 block text-[11px]">({co.instructorEmployeeId})</span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-white">{co.enrolledStudentsCount || 0}</span>
                          <span className="text-slate-500"> / {co.maxStudents}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant={co.isActive ? "default" : "secondary"}>
                            {co.isActive ? "Active" : "Archived"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleOpenRoster(co)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1" />
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
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl w-full">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <CardTitle className="text-lg text-white">
                    {selectedOffering.courseCode}: {selectedOffering.courseName}
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Eligible Student List &bull; Section {selectedOffering.section} &bull; {selectedOffering.semesterName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOffering(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {loadingRoster ? (
                  <div className="py-8 text-center text-sm text-slate-400">Loading student roster...</div>
                ) : roster.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    No students are currently enrolled in this course section.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="p-2.5">Reg Number</th>
                          <th className="p-2.5">Student Name</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Enrolled Date</th>
                          <th className="p-2.5">Eligibility Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {roster.map((enr) => (
                          <tr key={enr.id} className="hover:bg-slate-800/40">
                            <td className="p-2.5 font-mono text-blue-400 font-semibold">
                              {enr.studentRegistrationNumber}
                            </td>
                            <td className="p-2.5 text-white font-medium">{enr.studentName}</td>
                            <td className="p-2.5 text-slate-400">{enr.studentEmail}</td>
                            <td className="p-2.5 text-slate-400">{enr.enrolledDate}</td>
                            <td className="p-2.5">
                              <Badge className="bg-emerald-600 text-white">
                                {enr.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedOffering(null)}
                    className="border-slate-700 text-slate-300"
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
