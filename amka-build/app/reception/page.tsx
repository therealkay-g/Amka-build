"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, UserPlus, Calendar } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { PatientRegistrationPanel } from "@/components/reception/PatientRegistrationPanel";
import { AppointmentsPanel } from "@/components/reception/AppointmentsPanel";
import { cn } from "@/lib/utils";

function ReceptionContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "enregistrement" ? "enregistrement" : "rendez-vous";
  const [tab, setTab] = useState<"rendez-vous" | "enregistrement">(initialTab as "rendez-vous" | "enregistrement");

  useEffect(() => {
    if (searchParams.get("tab") === "enregistrement") setTab("enregistrement");
  }, [searchParams]);

  return (
    <AppShell>
      <PageHeader
        title="Réception"
        subtitle="Planification des rendez-vous et enregistrement des patients"
        icon={ClipboardList}
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab("rendez-vous")}
          className={cn("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all", tab === "rendez-vous" ? "bg-primary text-white" : "bg-surface-soft text-muted")}
        >
          <Calendar size={16} /> Rendez-vous
        </button>
        <button
          onClick={() => setTab("enregistrement")}
          className={cn("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all", tab === "enregistrement" ? "bg-primary text-white" : "bg-surface-soft text-muted")}
        >
          <UserPlus size={16} /> Enregistrement patient
        </button>
      </div>

      {tab === "rendez-vous" ? (
        <AppointmentsPanel />
      ) : (
        <PatientRegistrationPanel />
      )}
    </AppShell>
  );
}

export default function ReceptionPage() {
  return (
    <Suspense fallback={<AppShell><div className="skeleton h-32" /></AppShell>}>
      <ReceptionContent />
    </Suspense>
  );
}
