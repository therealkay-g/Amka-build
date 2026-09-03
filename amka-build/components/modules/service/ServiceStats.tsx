import React from "react";
import { formatMoney } from "@/lib/utils";

interface ServiceStatsProps {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  revenue: number;
}

export function ServiceStats({ total, pending, inProgress, completed, revenue }: ServiceStatsProps) {
  const items = [
    { label: "Total", value: total, tone: "primary" },
    { label: "En attente", value: pending, tone: "warning" },
    { label: "En cours", value: inProgress, tone: "secondary" },
    { label: "Terminés", value: completed, tone: "success" },
    { label: "Recettes", value: formatMoney(revenue), tone: "primary" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((s) => (
        <div key={s.label} className="glass-card p-4 animate-fade-in">
          <p className="text-xs font-semibold text-muted">{s.label}</p>
          <p className="text-xl font-bold text-text mt-1">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
