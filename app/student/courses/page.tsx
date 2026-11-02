"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { academicApi } from "@/lib/api/academic";
import { Enrollment } from "@/types/academic";
import { BookOpen, User as UserIcon, Calendar, CheckCircle2 } from "lucide-react";

export default function StudentCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const res = await academicApi.getMyEnrolledCourses();
        if (res.success) {
          setEnrollments(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch student courses", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <DashboardShell allowedRoles={["ROLE_STUDENT"]}>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            My Enrolled Courses
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Official courses registered for your degree program in the current semester
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading your courses...</div>
        ) : enrollments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              You are not currently enrolled in any course offerings.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((en) => (
              <Card key={en.id} className="hover:shadow-md transition-shadow border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                      {en.courseCode}
                    </span>
                    <Badge variant={en.status === "ACTIVE" ? "success" : "secondary"}>
                      {en.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900 leading-snug">
                    {en.courseName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs text-slate-600 pt-0">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Instructor: <strong className="text-slate-800">{en.instructorName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Semester: <strong className="text-slate-800">{en.semesterName} (Sec {en.section})</strong></span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Enrolled on: {en.enrolledDate}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
