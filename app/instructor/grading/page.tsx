"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InstructorGradingIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/instructor/results");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
