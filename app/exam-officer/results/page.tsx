"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

function ExamOfficerResultsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get("examId");

  useEffect(() => {
    const parsed = examId ? Number(examId) : NaN;
    if (!Number.isNaN(parsed) && parsed > 0) {
      router.replace(`/exam-officer/grading-review/${parsed}`);
    } else {
      router.replace("/exam-officer/grading-review");
    }
  }, [examId, router]);

  return (
    <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <div className="py-24 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
        <p className="text-sm">Redirecting to Grading Review...</p>
      </div>
    </DashboardShell>
  );
}

export default function ExamOfficerResultsRedirectPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
          <div className="py-24 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
            <p className="text-sm">Redirecting to Grading Review...</p>
          </div>
        </DashboardShell>
      }
    >
      <ExamOfficerResultsRedirectContent />
    </Suspense>
  );
}
