"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { academicApi } from "@/lib/api/academic";
import { resultApi } from "@/lib/api/result";
import { Enrollment } from "@/types/academic";
import { StudentCourseResults } from "@/types/result";
import {
  BookOpen,
  User as UserIcon,
  Calendar,
  CheckCircle2,
  FileText,
  ArrowRight,
  Search,
  Award,
  Clock,
  Layers,
} from "lucide-react";

interface MergedCourse {
  courseOfferingId: number;
  courseCode: string;
  courseName: string;
  departmentName?: string;
  instructorName?: string;
  semesterName?: string;
  section?: string;
  enrolledDate?: string;
  status?: string;
  completedExamsCount: number;
  publishedExamsCount: number;
}

export default function StudentCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courseResults, setCourseResults] = useState<StudentCourseResults[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [enrolledRes, resultsRes] = await Promise.allSettled([
          academicApi.getMyEnrolledCourses(),
          resultApi.getStudentResults(),
        ]);

        if (enrolledRes.status === "fulfilled" && enrolledRes.value.success && enrolledRes.value.data) {
          setEnrollments(enrolledRes.value.data);
        }

        if (resultsRes.status === "fulfilled" && resultsRes.value.success && resultsRes.value.data) {
          setCourseResults(resultsRes.value.data);
        }
      } catch (err) {
        console.error("Failed to fetch student courses data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Merge enrolled courses with course result statistics
  const mergedCourses = useMemo<MergedCourse[]>(() => {
    const map = new Map<number, MergedCourse>();

    // 1. Seed from enrollments
    enrollments.forEach((en) => {
      map.set(en.courseOfferingId, {
        courseOfferingId: en.courseOfferingId,
        courseCode: en.courseCode,
        courseName: en.courseName,
        instructorName: en.instructorName,
        semesterName: en.semesterName,
        section: en.section,
        enrolledDate: en.enrolledDate,
        status: en.status || "ACTIVE",
        completedExamsCount: 0,
        publishedExamsCount: 0,
      });
    });

    // 2. Overlay statistics from results (and include any course offering student took exams for)
    courseResults.forEach((cr) => {
      const exams = cr.examinations || [];
      const completedExams = exams.filter((ex) => {
        const status = (ex.displayStatus || "").toLowerCase();
        const attStatus = (ex.attemptStatus || "").toUpperCase();
        return status !== "not attempted" && attStatus !== "NOT_STARTED";
      });

      const publishedExams = exams.filter(
        (ex) => (ex.displayStatus || "").toLowerCase() === "published"
      );

      const existing = map.get(cr.courseId);
      if (existing) {
        existing.departmentName = cr.departmentName || existing.departmentName;
        existing.completedExamsCount = completedExams.length;
        existing.publishedExamsCount = publishedExams.length;
      } else {
        // Course discovered via exam records
        map.set(cr.courseId, {
          courseOfferingId: cr.courseId,
          courseCode: cr.courseCode,
          courseName: cr.courseName,
          departmentName: cr.departmentName,
          semesterName: cr.semesterName || "Current Semester",
          completedExamsCount: completedExams.length,
          publishedExamsCount: publishedExams.length,
          status: "ACTIVE",
        });
      }
    });

    return Array.from(map.values());
  }, [enrollments, courseResults]);

  // Filter courses based on search input
  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mergedCourses;
    return mergedCourses.filter(
      (c) =>
        c.courseCode.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q) ||
        (c.instructorName && c.instructorName.toLowerCase().includes(q)) ||
        (c.departmentName && c.departmentName.toLowerCase().includes(q))
    );
  }, [mergedCourses, search]);

  return (
    <DashboardShell allowedRoles={["ROLE_STUDENT", "ROLE_ADMIN"]}>
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
       

        {/* Content Body */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-xs text-slate-500">Loading your academic courses...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 py-16 text-center">
            <CardContent className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {search ? "No courses matched your search" : "No Enrolled Courses Found"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {search
                  ? "Try searching with a different course code or keyword."
                  : "You are not currently registered in any active course assignments for this academic term."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card
                key={course.courseOfferingId}
                className="flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200 overflow-hidden bg-white"
              >
                <div>
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                        {course.courseCode}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          course.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[11px]"
                            : "bg-slate-100 text-slate-600 border-slate-200 font-medium text-[11px]"
                        }
                      >
                        {course.status || "ACTIVE"}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                      {course.courseName}
                    </CardTitle>
                    {course.departmentName && (
                      <p className="text-[11px] text-slate-500">{course.departmentName}</p>
                    )}
                  </CardHeader>

                  <CardContent className="p-5 space-y-3 text-xs text-slate-600">
                    {course.instructorName && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Instructor: <strong className="text-slate-800">{course.instructorName}</strong>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Semester: <strong className="text-slate-800">{course.semesterName || "Current"}</strong>
                        {course.section ? ` (Sec ${course.section})` : ""}
                      </span>
                    </div>

                    {course.enrolledDate && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Registered on: {course.enrolledDate}</span>
                      </div>
                    )}

                    {/* Examination Overview Badges */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">
                          {course.completedExamsCount}{" "}
                          {course.completedExamsCount === 1 ? "Exam Done" : "Exams Done"}
                        </span>
                      </div>

                      {course.publishedExamsCount > 0 ? (
                        <div className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                          <Award className="w-3.5 h-3.5" />
                          <span>{course.publishedExamsCount} Graded</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">No grades yet</span>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* Primary Action Button */}
                <div className="p-5 pt-0">
                  <Link href={`/student/courses/${course.courseOfferingId}`} className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 h-10 shadow-xs rounded-xl">
                      <FileText className="w-4 h-4" />
                      <span>View Course Exams</span>
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
