"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { academicApi } from "@/lib/api/academic";
import { authApi } from "@/lib/api/auth";
import { resultApi } from "@/lib/api/result";
import { useAuth } from "@/lib/auth/AuthContext";
import { Enrollment, Student } from "@/types/academic";
import { StudentCourseResults } from "@/types/result";
import { Check, KeyRound, Loader2, MoreVertical, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

function formatDisplayDate(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function escapeCsvCell(value: unknown): string {
  const raw = String(value ?? "");
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p
        className="mt-1 text-sm font-semibold text-slate-800 wrap-break-word"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courseResults, setCourseResults] = useState<StudentCourseResults[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Change password modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const loadProfileData = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [profileRes, enrollmentRes, resultsRes] = await Promise.allSettled([
        academicApi.getMyStudentProfile(),
        academicApi.getMyEnrolledCourses(),
        resultApi.getStudentResults(),
      ]);

      if (profileRes.status === "fulfilled" && profileRes.value.success && profileRes.value.data) {
        setProfile(profileRes.value.data);
      } else if (!silent) {
        toast.error("Failed to load academic profile record");
      }

      if (enrollmentRes.status === "fulfilled" && enrollmentRes.value.success && enrollmentRes.value.data) {
        setEnrollments(enrollmentRes.value.data);
      }

      if (resultsRes.status === "fulfilled" && resultsRes.value.success && resultsRes.value.data) {
        setCourseResults(resultsRes.value.data);
      }
    } catch (error) {
      console.error("Failed to load profile page:", error);
      toast.error("Failed to load academic profile data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfileData(false);
  }, [loadProfileData]);

  const fullName = useMemo(() => {
    if (profile?.userFullName?.trim()) return profile.userFullName.trim();
    const combined = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return combined || "Student";
  }, [profile?.userFullName, user?.firstName, user?.lastName]);

  const { firstName, lastName, initials } = useMemo(() => {
    const parts = fullName.split(/\s+/).filter(Boolean);
    const fName = user?.firstName?.trim() || parts[0] || "—";
    const lName =
      user?.lastName?.trim() || (parts.length > 1 ? parts.slice(1).join(" ") : "—");
    const init =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : fullName.slice(0, 2).toUpperCase();
    return { firstName: fName, lastName: lName, initials: init || "ST" };
  }, [fullName, user?.firstName, user?.lastName]);

  const academicSummary = useMemo(() => {
    const departmentName =
      courseResults.find((c) => c.departmentName)?.departmentName ||
      profile?.programName ||
      "Academic Department";

    const currentSemester =
      enrollments.find((e) => e.semesterName)?.semesterName ||
      courseResults.find((c) => c.semesterName)?.semesterName ||
      "Current Academic Term";

    const earliestEnrolled = enrollments
      .map((e) => e.enrolledDate)
      .filter(Boolean)
      .sort()[0];

    const instructors = Array.from(
      new Set(enrollments.map((e) => e.instructorName).filter(Boolean))
    );

    const sections = Array.from(
      new Set(enrollments.map((e) => e.section).filter(Boolean))
    );

    const allExams = courseResults.flatMap((c) => c.examinations || []);
    const publishedExams = allExams.filter(
      (ex) => Boolean(ex.publishedAt) || ex.displayStatus === "PUBLISHED"
    );

    return {
      departmentName,
      currentSemester,
      enrolledDate: formatDisplayDate(earliestEnrolled || user?.createdAt),
      advisor: instructors[0] || "Assigned Faculty",
      sections: sections.length > 0 ? sections.join(", ") : "Standard Cohort",
      totalExams: allExams.length,
      publishedCount: publishedExams.length,
    };
  }, [courseResults, enrollments, profile?.programName, user?.createdAt]);

  const handleExportTranscript = () => {
    const lines: string[] = [];
    lines.push(["Section", "Field / Course", "Details / Exam", "Score", "Status", "Date"].map(escapeCsvCell).join(","));
    lines.push(["Profile", "Full Name", fullName, "", "", ""].map(escapeCsvCell).join(","));
    lines.push(["Profile", "Registration Number", profile?.registrationNumber || "N/A", "", "", ""].map(escapeCsvCell).join(","));
    lines.push(["Profile", "Program", `${profile?.programName || "N/A"} (${profile?.programCode || "-"})`, "", "", ""].map(escapeCsvCell).join(","));
    lines.push(["Profile", "Year of Study", profile?.yearOfStudy ? `Year ${profile.yearOfStudy}` : "N/A", "", "", ""].map(escapeCsvCell).join(","));
    lines.push(["Profile", "Email", profile?.userEmail || user?.email || "N/A", "", "", ""].map(escapeCsvCell).join(","));

    for (const enrollment of enrollments) {
      lines.push(
        [
          "Course Enrollment",
          `${enrollment.courseCode} - ${enrollment.courseName}`,
          `${enrollment.semesterName} (${enrollment.section || "Default"})`,
          "",
          enrollment.status,
          formatDisplayDate(enrollment.enrolledDate),
        ]
          .map(escapeCsvCell)
          .join(",")
      );
    }

    for (const course of courseResults) {
      for (const exam of course.examinations || []) {
        lines.push(
          [
            "Examination Result",
            `${course.courseCode} - ${course.courseName}`,
            exam.examinationTitle,
            exam.marksDisplay || `${exam.earnedMarks ?? 0} / ${exam.totalMarks ?? 0}`,
            exam.displayStatus || exam.attemptStatus || "RECORDED",
            formatDisplayDate(exam.publishedAt),
          ]
            .map(escapeCsvCell)
            .join(",")
        );
      }
    }

    const csvContent = lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeReg = (profile?.registrationNumber || "student").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `academic_transcript_${safeReg}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Academic transcript exported");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await authApi.changePassword(currentPassword, newPassword);
      if (response.success) {
        toast.success("Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setIsPasswordModalOpen(false);
      } else {
        toast.error(response.message || "Unable to update password");
      }
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : "Failed to update password";
      toast.error(errMsg);
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["ROLE_STUDENT", "ROLE_ADMIN"]}>
      <div className="space-y-6 pb-8">
        

        {/* Outer Container Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs sm:p-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-[460px] animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
              <div className="h-[400px] animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                {/* Left Card: About Me */}
                <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7">
                  <div className="relative mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">About Me</h2>
                    <button
                      type="button"
                      aria-label="Profile options"
                      onClick={() => setMenuOpen((prev) => !prev)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {menuOpen && (
                      <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            loadProfileData(true);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                          Refresh Profile Data
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setIsPasswordModalOpen(true);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Change Password
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Identity Header */}
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="relative shrink-0">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-slate-800 via-indigo-900 to-violet-800 text-lg font-bold tracking-wide text-white shadow-xs">
                        {initials}
                      </div>
                      <span
                        title="Verified Student Record"
                        className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-violet-600 text-white shadow-xs"
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold text-slate-900">
                        {fullName}
                      </h3>
                      <p className="mt-0.5 truncate text-sm text-slate-500">
                        {profile?.programName || "Academic Degree Program"}
                      </p>
                    </div>
                  </div>

                  {/* 2-Column Academic Details Grid */}
                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 pt-6 sm:grid-cols-2">
                    <ProfileField label="First Name" value={firstName} />
                    <ProfileField label="Last Name" value={lastName} />
                    <ProfileField
                      label="Student ID"
                      value={profile?.id ? `STU-${profile.id}` : "—"}
                    />
                    <ProfileField
                      label="Matriculation / Reg No"
                      value={profile?.registrationNumber || "—"}
                    />
                    <ProfileField
                      label="Faculty / Dept"
                      value={academicSummary.departmentName}
                    />
                    <ProfileField
                      label="Academic Term"
                      value={academicSummary.currentSemester}
                    />
                    <ProfileField
                      label="Program Code"
                      value={profile?.programCode || "—"}
                    />
                    <ProfileField
                      label="Academic Standing"
                      value={
                        user?.isActive === false
                          ? "Inactive"
                          : "Enrolled & Good Standing"
                      }
                    />
                    <ProfileField
                      label="Enrolled Date"
                      value={academicSummary.enrolledDate}
                    />
                    <ProfileField
                      label="Primary Instructor"
                      value={academicSummary.advisor}
                    />
                    <ProfileField
                      label="Examination Records"
                      value={
                        academicSummary.totalExams > 0
                          ? `${academicSummary.publishedCount} Published / ${academicSummary.totalExams} Exams`
                          : "Cleared (Active)"
                      }
                    />
                    <ProfileField
                      label="Program Level"
                      value={
                        profile?.yearOfStudy
                          ? `Undergraduate (Year ${profile.yearOfStudy})`
                          : "—"
                      }
                    />
                  </div>
                </section>

                {/* Right Card: Contact Information */}
                <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Contact Information
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Personal & Academic Contacts
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                    <ProfileField
                      label="Primary Email"
                      value={profile?.userEmail || user?.email || "—"}
                    />
                    <ProfileField
                      label="Phone Number"
                      value={user?.phone?.trim() || "Not Provided"}
                    />
                    <ProfileField
                      label="Account Status"
                      value={
                        user?.isActive === false
                          ? "Inactive Account"
                          : "Verified & Active"
                      }
                    />
                    <ProfileField
                      label="User Account ID"
                      value={
                        profile?.userId
                          ? `USR-${profile.userId}`
                          : user?.id
                            ? `USR-${user.id}`
                            : "—"
                      }
                    />
                    <ProfileField
                      label="Registered Courses"
                      value={`${enrollments.length} Active ${
                        enrollments.length === 1 ? "Course" : "Courses"
                      }`}
                    />
                    <ProfileField
                      label="Assigned Section(s)"
                      value={academicSummary.sections}
                    />
                    <ProfileField
                      label="Program ID"
                      value={profile?.programId ? `PRG-${profile.programId}` : "—"}
                    />
                    <ProfileField
                      label="Member Since"
                      value={formatDisplayDate(user?.createdAt)}
                    />
                    <ProfileField
                      label="Published Results"
                      value={`${academicSummary.publishedCount} Official ${
                        academicSummary.publishedCount === 1 ? "Result" : "Results"
                      }`}
                    />
                    <ProfileField label="Portal Access" value="Student Portal" />
                  </div>
                </section>
              </div>

              {/* Bottom Action Bar */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-7">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportTranscript}
                  className="h-10 rounded-xl border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  Export Transcript
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="h-10 rounded-xl bg-violet-600 px-6 text-sm font-medium text-white shadow-xs hover:bg-violet-700"
                >
                  Change Password
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Password Update Modal */}
      {isPasswordModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3
                  id="change-password-title"
                  className="text-base font-bold text-slate-900"
                >
                  Update Account Password
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Manage security credentials for {profile?.userEmail || user?.email}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setIsPasswordModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Current Password
                </label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  New Password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Confirm New Password
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isSavingPassword}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingPassword}
                  className="rounded-xl bg-violet-600 text-white hover:bg-violet-700"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Password"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
