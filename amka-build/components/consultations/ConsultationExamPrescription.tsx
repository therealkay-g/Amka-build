"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, FlaskConical, ScanLine, Activity, Brain, CheckSquare, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExamCategoryWithExams, Exam } from "@/lib/exam-types";
import { EXAM_STATUS_LABELS, EXAM_STATUS_COLORS } from "@/lib/exam-workflow-types";

type Props = {
  catalog: ExamCategoryWithExams[];
  selectedExamIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  readOnly?: boolean;
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  FlaskConical,
  ScanLine,
  Activity,
  Brain,
};

function SubcategoryGroup({
  subcategory,
  exams,
  selectedExamIds,
  onToggle,
  onSelectionChange,
  readOnly,
  search,
}: {
  subcategory: string;
  exams: Exam[];
  selectedExamIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectionChange: (ids: Set<string>) => void;
  readOnly: boolean;
  search: string;
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return exams;
    const q = search.toLowerCase();
    return exams.filter((e) => e.name.toLowerCase().includes(q));
  }, [exams, search]);

  if (filtered.length === 0) return null;

  const allChecked = filtered.every((e) => selectedExamIds.has(e.id));
  const someChecked = filtered.some((e) => selectedExamIds.has(e.id));

  return (
    <div className="space-y-1.5">
      <label className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-wider", someChecked ? "text-primary" : "text-muted")}>
        {!readOnly && (
          <button
            type="button"
            className="shrink-0"
            onClick={() => {
              const next = new Set(selectedExamIds);
              if (allChecked) {
                filtered.forEach((e) => next.delete(e.id));
              } else {
                filtered.forEach((e) => next.add(e.id));
              }
              onSelectionChange(next);
            }}
          >
            {allChecked ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} className="text-muted" />}
          </button>
        )}
        {subcategory}
      </label>
      {filtered.map((exam) => {
        const checked = selectedExamIds.has(exam.id);
        return (
          <label
            key={exam.id}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer",
              checked ? "bg-primary/10 text-primary border border-primary/20" : "text-text hover:bg-surface-soft border border-transparent",
              readOnly && "cursor-default opacity-80"
            )}
          >
            {!readOnly && (
              <input
                type="checkbox"
                className="accent-primary shrink-0"
                checked={checked}
                onChange={() => onToggle(exam.id)}
              />
            )}
            {readOnly && checked && <CheckSquare size={14} className="text-primary shrink-0" />}
            <span className="flex-1">{exam.name}</span>
          </label>
        );
      })}
    </div>
  );
}

export function ConsultationExamPrescription({ catalog, selectedExamIds, onSelectionChange, readOnly = false }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searches, setSearches] = useState<Record<string, string>>({});
  const [globalSearch, setGlobalSearch] = useState("");

  function toggleCategory(catId: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  function toggleExam(examId: string) {
    const next = new Set(selectedExamIds);
    if (next.has(examId)) next.delete(examId);
    else next.add(examId);
    onSelectionChange(next);
  }

  function selectAllInCategory(cat: ExamCategoryWithExams) {
    const next = new Set(selectedExamIds);
    const allIds = cat.exams.map((e) => e.id);
    const allSelected = allIds.every((id) => next.has(id));
    if (allSelected) {
      allIds.forEach((id) => next.delete(id));
    } else {
      allIds.forEach((id) => next.add(id));
    }
    onSelectionChange(next);
  }

  function clearAll() {
    onSelectionChange(new Set());
  }

  function countSelectedInCategory(cat: ExamCategoryWithExams): number {
    return cat.exams.filter((e) => selectedExamIds.has(e.id)).length;
  }

  const totalSelected = selectedExamIds.size;

  return (
    <section className="medical-card p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-base font-bold text-text flex items-center gap-2">
          <CheckSquare size={18} className="text-primary" />
          Examen complémentaire
          {totalSelected > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold px-2.5 py-0.5">
              {totalSelected} sélectionné{totalSelected > 1 ? "s" : ""}
            </span>
          )}
        </h3>
        {!readOnly && totalSelected > 0 && (
          <button type="button" onClick={clearAll} className="text-xs font-bold text-error hover:underline flex items-center gap-1">
            <X size={13} /> Tout effacer
          </button>
        )}
      </div>

      {/* Recherche globale */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
        <input
          className="input-field pl-10"
          placeholder="Rechercher un examen..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          readOnly={readOnly}
        />
      </div>

      {/* Listes des catégories */}
      <div className="space-y-3">
        {catalog.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.icon || ""] || FlaskConical;
          const expanded = expandedCategories.has(cat.id);
          const count = countSelectedInCategory(cat);
          const catSearch = searches[cat.id] || "";
          const effectiveSearch = globalSearch || catSearch;

          const filteredExams = effectiveSearch.trim()
            ? cat.exams.filter((e) => e.name.toLowerCase().includes(effectiveSearch.toLowerCase()))
            : cat.exams;

          if (filteredExams.length === 0) return null;

          return (
            <div key={cat.id} className="rounded-xl border border-border overflow-hidden">
              {/* Header catégorie */}
              <div className={cn("flex items-center gap-3 px-4 py-3 transition-colors", expanded ? "bg-primary/5 border-b border-border" : "bg-surface-soft hover:bg-surface-mid")}>
                {!readOnly && (
                  <button type="button" onClick={() => toggleCategory(cat.id)} className="text-muted hover:text-text">
                    {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                )}
                <button type="button" onClick={() => !readOnly && toggleCategory(cat.id)} className="flex-1 flex items-center gap-3 text-left">
                  <div className={cn("rounded-lg p-2", expanded ? "bg-primary/15 text-primary" : "bg-surface-high text-muted")}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-text">{cat.name}</p>
                    <p className="text-xs text-muted">{filteredExams.length} examen{filteredExams.length > 1 ? "s" : ""}</p>
                  </div>
                  {count > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-primary text-white text-xs font-bold px-2.5 py-0.5 min-w-[24px]">
                      {count}
                    </span>
                  )}
                </button>
                {!readOnly && expanded && (
                  <button type="button" onClick={() => selectAllInCategory(cat)} className="text-xs font-bold text-primary hover:underline">
                    {cat.exams.every((e) => selectedExamIds.has(e.id)) ? "Tout décocher" : "Tout cocher"}
                  </button>
                )}
              </div>

              {/* Contenu catégorie */}
              {expanded && (
                <div className="p-4 space-y-4 bg-surface/50">
                  {!readOnly && !globalSearch && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                      <input
                        className="input-field pl-9 text-xs"
                        placeholder={`Rechercher dans ${cat.name}...`}
                        value={catSearch}
                        onChange={(e) => setSearches((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                      />
                    </div>
                  )}
                  {(() => {
                    const groups: Record<string, Exam[]> = {};
                    for (const exam of filteredExams) {
                      const key = exam.subcategory || "_none_";
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(exam);
                    }
                    const entries = Object.entries(groups);
                    if (entries.length <= 1 && entries[0]?.[0] === "_none_") {
                      return (
                        <div className="space-y-1.5">
                          {filteredExams.map((exam) => {
                            const checked = selectedExamIds.has(exam.id);
                            return (
                              <label
                                key={exam.id}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                                  checked ? "bg-primary/10 text-primary border border-primary/20" : "text-text hover:bg-surface-soft border border-transparent",
                                  readOnly && "cursor-default opacity-80"
                                )}
                              >
                                {!readOnly && (
                                  <input type="checkbox" className="accent-primary shrink-0" checked={checked} onChange={() => toggleExam(exam.id)} />
                                )}
                                {readOnly && checked && <CheckSquare size={14} className="text-primary shrink-0" />}
                                <span className="flex-1">{exam.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    }
                    return entries.map(([sub, exams]) => (
                      <SubcategoryGroup
                        key={sub}
                        subcategory={sub === "_none_" ? cat.name : sub}
                        exams={exams}
                        selectedExamIds={selectedExamIds}
                        onToggle={toggleExam}
                        onSelectionChange={onSelectionChange}
                        readOnly={readOnly}
                        search=""
                      />
                    ));
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ExamDisplay({ catalog, selectedExamIds, examStatuses, examResults }: { catalog: ExamCategoryWithExams[]; selectedExamIds: Set<string>; examStatuses?: Record<string, string>; examResults?: Record<string, { results: Record<string, unknown>; examName: string }> }) {
  const [viewResult, setViewResult] = useState<string | null>(null);
  if (selectedExamIds.size === 0) return null;

  return (
    <section className="medical-card p-6">
      <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
        <CheckSquare size={18} className="text-primary" />
        Examen complémentaire
        {examStatuses && Object.keys(examStatuses).length > 0 && (
          <span className="ml-auto text-xs font-normal text-muted">Synchronisé en temps réel</span>
        )}
      </h3>
      <div className="space-y-4">
        {catalog.map((cat) => {
          const catExams = cat.exams.filter((e) => selectedExamIds.has(e.id));
          if (catExams.length === 0) return null;
          const Icon = CATEGORY_ICONS[cat.icon || ""] || FlaskConical;
          return (
            <div key={cat.id}>
              <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-2">
                <Icon size={14} />
                {cat.name}
              </p>
              <ul className="ml-6 space-y-1">
                {catExams.map((e) => {
                  const status = examStatuses?.[e.id];
                  const statusLabel = status ? (EXAM_STATUS_LABELS[status as keyof typeof EXAM_STATUS_LABELS] ?? status) : null;
                  const statusColor = status ? (EXAM_STATUS_COLORS[status as keyof typeof EXAM_STATUS_COLORS] ?? null) : null;
                  const dotColor = statusColor === "success" ? "bg-success"
                    : statusColor === "warning" ? "bg-warning"
                    : statusColor === "primary" ? "bg-primary"
                    : statusColor === "secondary" ? "bg-secondary"
                    : statusColor === "error" ? "bg-error"
                    : "bg-primary/40";
                  return (
                    <li key={e.id} className="text-sm text-text flex items-center gap-2">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
                      <span className="flex-1">{e.name}</span>
                      {statusLabel && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          statusColor === "success" && "bg-success/10 text-success",
                          statusColor === "warning" && "bg-warning/10 text-warning",
                          statusColor === "primary" && "bg-primary/10 text-primary",
                          statusColor === "secondary" && "bg-secondary/10 text-secondary",
                          statusColor === "error" && "bg-error/10 text-error",
                        )}>
                          {statusLabel}
                        </span>
                      )}
                      {(examResults?.[e.id]?.results?.report as string) ? (
                        <button
                          onClick={() => setViewResult(examResults![e.id].results.report as string)}
                          className="text-[10px] text-primary underline ml-2 shrink-0"
                        >
                          Voir résultat
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {viewResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setViewResult(null)}>
          <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-text">Résultat d'examen</h4>
              <button onClick={() => setViewResult(null)} className="p-2 rounded-lg hover:bg-surface-soft"><X size={18} /></button>
            </div>
            <p className="text-sm text-text whitespace-pre-wrap">{viewResult}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function buildExamPrintHtml(catalog: ExamCategoryWithExams[], selectedExamIds: Set<string>): string {
  if (selectedExamIds.size === 0) return "";

  let html = '<h3 style="margin-top:24px;font-size:16px;font-weight:800;color:#4648d4;border-bottom:2px solid #4648d4;padding-bottom:8px;">EXAMENS COMPLÉMENTAIRES</h3>';

  for (const cat of catalog) {
    const catExams = cat.exams.filter((e) => selectedExamIds.has(e.id));
    if (catExams.length === 0) continue;
    html += `<div style="margin-top:16px;">`;
    html += `<p style="font-size:13px;font-weight:700;color:#4648d4;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">${cat.name}</p>`;
    html += `<ul style="margin-left:20px;">`;
    for (const exam of catExams) {
      html += `<li style="font-size:13px;color:#1c1c2e;padding:2px 0;">☐ ${exam.name}</li>`;
    }
    html += `</ul></div>`;
  }

  return html;
}
