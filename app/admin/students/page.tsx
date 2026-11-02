"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminStudentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/academic");
  }, [router]);
  return null;
}
