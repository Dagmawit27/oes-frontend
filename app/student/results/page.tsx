"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Loader2 } from "lucide-react";

export default function StudentResultsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/courses");
  }, [router]);

  return (
    <DashboardShell allowedRoles={["ROLE_STUDENT", "ROLE_ADMIN"]}>
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">
          Redirecting to My Registered Courses & Examinations...
        </p>
      </div>
    </DashboardShell>
  );
}
