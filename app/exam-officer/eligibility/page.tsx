"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function ExamOfficerEligibilityRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/exam-officer/scheduling");
  }, [router]);

  return (
    <DashboardShell allowedRoles={["ROLE_EXAM_OFFICER", "ROLE_ADMIN"]}>
      <div className="py-24 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
        <p className="text-sm">Redirecting to Exam Scheduling...</p>
      </div>
    </DashboardShell>
  );
}
