"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { academicApi } from "@/lib/api/academic";
import { Student, Enrollment } from "@/types/academic";
import { GraduationCap, BookOpen, Calendar, Mail, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function StudentProfilePage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const [profRes, enrRes] = await Promise.all([
          academicApi.getMyStudentProfile(),
          academicApi.getMyEnrolledCourses(),
        ]);
        setStudent(profRes.data);
        setEnrollments(enrRes.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load academic profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <DashboardShell allowedRoles={["ROLE_STUDENT"]}>
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-slate-100 shadow-sm">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-400" />
            My Academic Profile
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Personal degree registration, current year of study, and active course enrollments
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading academic profile...</div>
        ) : !student ? (
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardContent className="py-12 text-center text-slate-400">
              No academic record was found for your account. Please contact the administrator.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student ID Card */}
            <Card className="bg-slate-900 border-slate-800 text-slate-100 md:col-span-1 shadow-sm">
              <CardHeader className="text-center pb-4 border-b border-slate-800">
                <div className="w-20 h-20 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-3 shadow-inner">
                  <User className="w-10 h-10" />
                </div>
                <CardTitle className="text-xl font-bold text-white">{student.userFullName}</CardTitle>
                <div className="text-xs text-blue-400 font-mono font-semibold tracking-wider mt-1">
                  {student.registrationNumber}
                </div>
                <div className="pt-2 flex justify-center">
                  <Badge className="bg-emerald-600 text-white flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Enrolled & Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    College Email
                  </span>
                  <span className="text-slate-200 font-medium">{student.userEmail}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                    Degree Program
                  </span>
                  <span className="text-blue-400 font-semibold">{student.programCode}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Year of Study
                  </span>
                  <span className="text-slate-200 font-medium">Year {student.yearOfStudy}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                    Enrolled Courses
                  </span>
                  <span className="text-slate-200 font-bold">{enrollments.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Enrolled Courses Table */}
            <Card className="bg-slate-900 border-slate-800 text-slate-100 md:col-span-2 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-lg text-white">Current Enrolled Courses</CardTitle>
                <CardDescription className="text-slate-400">
                  Verified courses registered for your semester examinations
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {enrollments.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    You are not currently enrolled in any courses for this term.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Course Code</th>
                          <th className="p-3">Course Title</th>
                          <th className="p-3">Semester</th>
                          <th className="p-3">Instructor</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {enrollments.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-800/40">
                            <td className="p-3 font-mono font-bold text-blue-400">{e.courseCode}</td>
                            <td className="p-3 text-white font-medium">{e.courseName}</td>
                            <td className="p-3 text-slate-300">{e.semesterName}</td>
                            <td className="p-3 text-slate-400">{e.instructorName}</td>
                            <td className="p-3">
                              <Badge variant={e.status === "ACTIVE" ? "default" : "secondary"}>
                                {e.status}
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
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
