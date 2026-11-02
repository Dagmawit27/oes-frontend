"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { academicApi } from "@/lib/api/academic";
import { CourseOffering, Enrollment } from "@/types/academic";
import { BookOpen, Users, Calendar, Award, UserCheck, X } from "lucide-react";
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
        if (res.success) {
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
      setRoster(res.data);
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
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-slate-100 shadow-sm">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            My Assigned Course Offerings
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Courses you are instructing for the active academic semester with live student rosters
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading assigned courses...</div>
        ) : offerings.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardContent className="py-12 text-center text-slate-400">
              No courses are currently assigned to your instructor profile.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offerings.map((co) => (
              <Card key={co.id} className="bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700 transition-colors shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-blue-950 text-blue-400 rounded-md border border-blue-800">
                      {co.courseCode}
                    </span>
                    <Badge variant={co.isActive ? "default" : "secondary"}>
                      Section {co.section}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold text-white leading-snug">
                    {co.courseName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-300 pt-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Semester: <strong className="text-white">{co.semesterName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Enrolled: <strong className="text-blue-400 font-semibold">{co.enrolledStudentsCount || 0} / {co.maxStudents}</strong> students</span>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Section: {co.section}</span>
                    <Button
                      size="sm"
                      onClick={() => handleOpenRoster(co)}
                      className="bg-blue-600 hover:bg-blue-700 text-xs text-white"
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
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl w-full">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <CardTitle className="text-lg text-white">
                    {selectedOffering.courseCode}: {selectedOffering.courseName}
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enrolled Student Roster &bull; Section {selectedOffering.section} &bull; {selectedOffering.semesterName}
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
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="p-2.5">Reg Number</th>
                          <th className="p-2.5">Student Name</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Enrolled Date</th>
                          <th className="p-2.5">Status</th>
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
                    className="border-slate-700 text-slate-300"
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
