"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateQuestionRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/instructor/examinations/create");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center text-slate-500 text-sm">
      Redirecting to Examination Question Creator...
    </div>
  );
}
