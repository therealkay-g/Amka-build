"use client";

import { Search, User, FileText, Calendar, Stethoscope, ArrowLeft, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePatientResults } from "@/lib/hooks/usePatientResults";
import { formatDate, formatTime } from "@/lib/utils";

export default function DoctorResultsPage() {
  const {
    patientsWithResults,
    selectedPatient,
    setSelectedPatient,
    results,
    loading,
    searchQuery,
    setSearchQuery,
    fetchResultsForPatient,
  } = usePatientResults();

  const body = (
    <>
      <PageHeader
        title="Centre de Résultats"
        subtitle="Consultez tous les résultats par patient"
        icon={FileText}
        actions={null}
      />

      <div className="flex h-[calc(100vh-180px)] gap-6 overflow-hidden">
        {/* Sidebar: Patient List */}
        <div className="w-1/3 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="input-field pl-10 w-full"
              placeholder="Rechercher un patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="glass-card flex-1 overflow-y-auto p-2 space-y-1">
            {loading && patientsWithResults.length === 0 ? (
              <div className="p-4 text-center text-muted">Chargement...</div>
            ) : patientsWithResults.length === 0 ? (
              <div className="p-4 text-center text-muted text-sm">Aucun patient avec résultat trouvé.</div>
            ) : (
              patientsWithResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => void fetchResultsForPatient(p)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition text-left ${
                    selectedPatient?.id === p.id ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-surface-soft"
                  }`}
                >
                  <div className="rounded-full bg-surface-mid p-2 shrink-0">
                    <User size={16} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-semibold text-sm truncate">{p.prenom} {p.nom}</p>
                    <p className="text-xs text-muted truncate">{p.numero_dossier}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content: Patient Result "Folder" */}
        <div className="flex-1 glass-card overflow-y-auto p-6">
          {!selectedPatient ? (
            <EmptyState
              title="Sélectionnez un patient"
              description="Choisissez un patient dans la liste pour consulter l'intégralité de ses résultats d'examens."
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="p-2 rounded-lg hover:bg-surface-soft text-muted"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-text">
                      Dossier de {selectedPatient.prenom} {selectedPatient.nom}
                    </h2>
                    <p className="text-sm text-muted">Dossier N° {selectedPatient.numero_dossier}</p>
                  </div>
                </div>
              </div>

              {loading && results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p>Chargement des résultats...</p>
                </div>
              ) : results.length === 0 ? (
                <EmptyState
                  title="Aucun résultat trouvé"
                  description="Ce patient n'a pas encore de résultats d'examens validés."
                />
              ) : (
                <div className="grid gap-4">
                  {results.map((res) => (
                    <div key={res.id} className="p-4 rounded-xl border border-border bg-white/50 hover:border-primary/30 transition animate-fade-in">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Stethoscope size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-text">{res.exams?.name ?? "Examen inconnu"}</h4>
                            <Badge tone="secondary" className="text-[10px]">{res.exams?.exam_categories?.name ?? "Général"}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-text flex items-center gap-1 justify-end">
                            <Calendar size={12} /> {formatDate(res.consultations?.date_consultation)}
                          </p>
                          <p className="text-[10px] text-muted">
                            Par {res.consultations?.profiles?.last_name ?? "—"}
                          </p>
                        </div>
                      </div>
                      <div className="bg-surface-soft p-3 rounded-lg border border-border/50">
                        <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
                          {res.results || "Aucun compte-rendu disponible."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return <AppShell>{body}</AppShell>;
}
