"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resultApi } from "@/lib/api/result";
import { academicApi } from "@/lib/api/academic";
import { StudentCourseResults, StudentExamResult } from "@/types/result";
import { Enrollment } from "@/types/academic";
import {
  ChevronLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Award,
  Eye,
  FileText,
  AlertCircle,
  GraduationCap,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

function CourseExamsDetailContent() {
  const params = useParams();
  const courseOfferingId = params?.courseOfferingId ? Number(params.courseOfferingId) : null;

  const [courseResults, setCourseResults] = useState<StudentCourseResults[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [resultsRes, enrolledRes] = await Promise.allSettled([
          resultApi.getStudentResults(),
          academicApi.getMyEnrolledCourses(),
        ]);

        if (resultsRes.status === "fulfilled" && resultsRes.value.success && resultsRes.value.data) {
          setCourseResults(resultsRes.value.data);
        }

        if (enrolledRes.status === "fulfilled" && enrolledRes.value.success && enrolledRes.value.data) {
          setEnrollments(enrolledRes.value.data);
        }
      } catch (err: any) {
        toast.error("Failed to load course examination records.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseOfferingId]);

  // Current course record
  const currentCourseResult = useMemo(() => {
    if (!courseOfferingId) return null;
    return courseResults.find((c) => c.courseId === courseOfferingId) || null;
  }, [courseResults, courseOfferingId]);

  const currentEnrollment = useMemo(() => {
    if (!courseOfferingId) return null;
    return enrollments.find((e) => e.courseOfferingId === courseOfferingId) || null;
  }, [enrollments, courseOfferingId]);

  // Filter completed and passed exams (strictly exclude unattempted/unsubmitted exams)
  const completedExams = useMemo<StudentExamResult[]>(() => {
    if (!currentCourseResult?.examinations) return [];
    return currentCourseResult.examinations.filter((exam) => {
      const displayStatus = (exam.displayStatus || "").toLowerCase();
      const attemptStatus = (exam.attemptStatus || "").toUpperCase();

      // Exclude unattempted and not started exams
      if (displayStatus === "not attempted" || attemptStatus === "NOT_STARTED") {
        return false;
      }

      return true;
    });
  }, [currentCourseResult]);

  const courseTitle = currentCourseResult?.courseName || currentEnrollment?.courseName || "Course Examinations";
  const courseCode = currentCourseResult?.courseCode || currentEnrollment?.courseCode || "COURSE";
  const semesterName = currentCourseResult?.semesterName || currentEnrollment?.semesterName || "Current Semester";
  const instructorName = currentEnrollment?.instructorName || "Department Faculty";
  const departmentName = currentCourseResult?.departmentName;

  const publishedCount = completedExams.filter(
    (e) => (e.displayStatus || "").toLowerCase() === "published"
  ).length;

  return (
    <DashboardShell allowedRoles={["ROLE_STUDENT", "ROLE_ADMIN"]}>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            <span>My Courses</span> &gt; <span className="font-mono text-slate-800">{courseCode}</span> &gt;{" "}
            <span className="text-blue-600 font-semibold">Completed Examinations</span>
          </div>

          <Link href="/student/courses">
            <Button variant="outline" size="sm" className="gap-2 bg-white border-slate-200 text-slate-700">
              <ChevronLeft className="w-4 h-4" />
              <span>Back to My Courses</span>
            </Button>
          </Link>
        </div>

        {/* Course Overview Card */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                  {courseCode}
                </span>
                {currentEnrollment?.section && (
                  <span className="text-xs text-slate-500 font-medium">
                    Section {currentEnrollment.section}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{courseTitle}</h1>
              {departmentName && <p className="text-xs text-slate-500">{departmentName}</p>}
            </div>

            
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-slate-400" />
              <span>
                Semester: <strong className="text-slate-800">{semesterName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>
                Instructor: <strong className="text-slate-800">{instructorName}</strong>
              </span>
            </div>
          </div>
        </div>

        

        {/* Examinations List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-xs text-slate-500">Loading completed examination records...</p>
          </div>
        ) : completedExams.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 py-16 text-center bg-white rounded-2xl">
            <CardContent className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Completed Examinations Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You have not completed or submitted any examination sessions for this course yet. Scheduled
                and active tests are accessed from the{" "}
                <Link href="/student/examinations" className="text-blue-600 font-semibold underline">
                  Available Exams portal
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedExams.map((exam) => {
              const statusLower = (exam.displayStatus || "").toLowerCase();
              const isPublished = statusLower === "published";
              const isPending = statusLower === "pending";

              return (
                <Card
                  key={exam.examinationId}
                  className="bg-white border-slate-200 hover:border-slate-300 transition-all rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between"
                >
                  <div className="p-5 flex flex-col justify-between h-full gap-4">
                    {/* Top: Badge, Exam Title & Publish Timestamp */}
                    <div className="space-y-2.5">
                      <div>
                        {isPublished ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold gap-1 whitespace-nowrap">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Approved & Published</span>
                          </Badge>
                        ) : isPending ? (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold gap-1 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Approval Pending</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] text-slate-600 whitespace-nowrap">
                            {exam.attemptStatus || "Submitted"}
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                          {exam.examinationTitle}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {isPublished && exam.publishedAt
                            ? `Published: ${new Date(exam.publishedAt).toLocaleString()}`
                            : isPending
                            ? "Submitted and under instructor/officer review."
                            : `Attempt Status: ${exam.attemptStatus}`}
                        </p>
                      </div>
                    </div>

                    {/* Bottom: Marks Summary & Full-Width Detail Button */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Awarded Marks
                        </span>
                        <span className="text-lg font-black font-mono whitespace-nowrap">
                          {isPublished ? (
                            <span className="text-emerald-700">
                              {exam.earnedMarks !== null ? Number(exam.earnedMarks).toFixed(2) : "0.00"}
                              <span className="text-xs text-slate-400 font-normal">
                                {" "}
                                / {Number(exam.totalMarks).toFixed(2)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-amber-600 text-xs font-semibold">Under Evaluation</span>
                          )}
                        </span>
                      </div>

                      {!isPublished && (
                        <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            Scores and answer keys unlock once published by the Exam Officer.
                          </span>
                        </div>
                      )}

                      {isPublished ? (
                        <Link
                          href={`/student/courses/${courseOfferingId}/exams/${exam.examinationId}`}
                          className="block"
                        >
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 h-10 px-4 rounded-xl shadow-xs justify-center">
                            <Eye className="w-4 h-4 shrink-0" />
                            <span>See Detail</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-auto shrink-0" />
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          disabled
                          variant="outline"
                          className="w-full text-xs text-slate-400 border-slate-200 cursor-not-allowed h-10 px-4 rounded-xl"
                        >
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          <span>Detail Locked</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function CourseExamsDetailPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell allowedRoles={["ROLE_STUDENT", "ROLE_ADMIN"]}>
          <div className="py-20 flex justify-center items-center">
            <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
        </DashboardShell>
      }
    >
      <CourseExamsDetailContent />
    </Suspense>
  );
}
