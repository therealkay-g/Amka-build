"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";



export default function PatientDetailRedirectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  useEffect(() => {
    router.replace(`/reception?tab=enregistrement`);
  }, [router, params.id]);
  return null;
}
