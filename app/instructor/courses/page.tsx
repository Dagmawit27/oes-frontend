"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { academicApi } from "@/lib/api/academic";
import { CourseOffering, Enrollment } from "@/types/academic";
import { BookOpen, Users, Calendar, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

export default function InstructorCoursesPage() {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Roster Modal State
  const [selectedOffering, setSelectedOffering] = useState<CourseOffering | null>(null);
  const [roster, setRoster] = useState<Enrollment[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  useEffect(() => {
    const fetchAssigned = async () => {
      setIsLoading(true);
      try {
        const res = await academicApi.getMyAssignedOfferings();
        if (res.success && res.data) {
          setOfferings(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch assigned offerings", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssigned();
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
      toast.error("Failed to load student roster");
    } finally {
      setLoadingRoster(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["ROLE_INSTRUCTOR"]}>
      <div className="space-y-6">
        {/* Page Header Banner */}
        <div className="bg-white border border-slate-200/90 p-6 rounded-2xl text-slate-800 shadow-xs">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-sky-600" />
            My Assigned Course Offerings
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Courses you are instructing for the active academic semester with live student rosters
          </p>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading assigned courses...</div>
        ) : offerings.length === 0 ? (
          <Card className="bg-white border-2 border-dashed border-slate-200 text-slate-600">
            <CardContent className="py-16 text-center text-slate-500">
              No courses are currently assigned to your instructor profile.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offerings.map((co) => (
              <Card
                key={co.id}
                className="bg-white border border-slate-200/90 text-slate-800 hover:border-sky-300 hover:shadow-md transition-all shadow-xs rounded-xl"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-md border border-sky-200">
                      {co.courseCode}
                    </span>
                    <Badge variant={co.isActive ? "default" : "secondary"}>
                      Section {co.section}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                    {co.courseName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-600 pt-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>
                      Semester: <strong className="text-slate-800">{co.semesterName}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>
                      Enrolled:{" "}
                      <strong className="text-sky-700 font-semibold">
                        {co.enrolledStudentsCount || 0} / {co.maxStudents}
                      </strong>{" "}
                      students
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">Section: {co.section}</span>
                    <Button
                      size="sm"
                      onClick={() => handleOpenRoster(co)}
                      className="bg-sky-600 hover:bg-sky-700 text-xs text-white shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      View Enrolled Students
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ENROLLED STUDENTS ROSTER MODAL */}
        {selectedOffering && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="bg-white border border-slate-200 text-slate-800 max-w-2xl w-full rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/80 p-4">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    {selectedOffering.courseCode}: {selectedOffering.courseName}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enrolled Student Roster &bull; Section {selectedOffering.section} &bull; {selectedOffering.semesterName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOffering(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {loadingRoster ? (
                  <div className="py-12 text-center text-sm text-slate-400">Loading student roster...</div>
                ) : roster.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">
                    No students are currently enrolled in this course section.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Reg Number</th>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Enrolled Date</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {roster.map((enr) => (
                          <tr key={enr.id} className="hover:bg-sky-50/40 transition-colors">
                            <td className="p-3 font-mono text-sky-700 font-semibold">
                              {enr.studentRegistrationNumber}
                            </td>
                            <td className="p-3 text-slate-900 font-medium">{enr.studentName}</td>
                            <td className="p-3 text-slate-500">{enr.studentEmail}</td>
                            <td className="p-3 text-slate-500">{enr.enrolledDate}</td>
                            <td className="p-3">
                              <Badge variant={enr.status === "ACTIVE" ? "default" : "secondary"}>
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
                    className="text-xs"
                  >
                    Close Roster
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
