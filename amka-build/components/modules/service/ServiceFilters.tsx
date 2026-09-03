import React from "react";
import { Search, Filter } from "lucide-react";
import { SERVICE_STATUSES } from "@/lib/modules/types";
import { SERVICE_STATUS_LABELS } from "@/lib/constants";

export function ServiceFilters({
  query,
  setQuery,
  statusFilter,
  setStatusFilter
}: {
  query: string;
  setQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
        <input
          className="input-field pl-10"
          placeholder="Rechercher..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-muted" />
        <select
          className="input-field w-auto min-w-[140px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Tous statuts</option>
          {SERVICE_STATUSES.map((s) => (
            <option key={s} value={s}>{SERVICE_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
