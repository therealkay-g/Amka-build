"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, User, Calendar, Stethoscope, Play, FileText, X, ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { getPendingExamRequests, getInProgressExams, onExamStarted, saveExamResult } from "@/lib/exam-workflow";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";

type WorkflowItem = {
  id: string;
  consultation_id: string;
  exam_id: string;
  status: string;
  status_updated_at: string;
  created_at: string;
  results: Record<string, unknown> | null;
  consultations: {
    patient_id: string;
    date_consultation: string;
    patients: { nom: string; prenom: string; numero_dossier: string; sexe: string; date_naissance: string } | null;
    profiles: { first_name: string; last_name: string } | null;
  } | null;
  exams: { name: string; price: number; exam_categories: { name: string } } | null;
};

type PatientDossier = {
  patientId: string;
  patient: { nom: string; prenom: string; numero_dossier: string; sexe: string; date_naissance: string } | null;
  doctor: { first_name: string; last_name: string } | null;
  items: WorkflowItem[];
};

function groupByPatient(items: WorkflowItem[]): PatientDossier[] {
  const map = new Map<string, PatientDossier>();
  for (const item of items) {
    const pid = item.consultations?.patient_id ?? "unknown";
    if (!map.has(pid)) {
      const c = item.consultations;
      map.set(pid, {
        patientId: pid,
        patient: c?.patients ?? null,
        doctor: c?.profiles ?? null,
        items: [],
      });
    }
    map.get(pid)!.items.push(item);
  }
  return Array.from(map.values());
}

export function PendingExamRequests({ serviceCategory, onAccept }: { serviceCategory: string; onAccept?: (item: WorkflowItem) => void }) {
  const [pending, setPending] = useState<WorkflowItem[]>([]);
  const [inProgress, setInProgress] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [resultModal, setResultModal] = useState<WorkflowItem | null>(null);
  const [resultText, setResultText] = useState("");
  const [savingResult, setSavingResult] = useState(false);
  const [expandedDossiers, setExpandedDossiers] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then((res: { data: { user: { id: string } | null } }) => {
      if (res.data.user) setUserId(res.data.user.id);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, ip] = await Promise.all([
      getPendingExamRequests(serviceCategory) as unknown as WorkflowItem[],
      getInProgressExams(serviceCategory) as unknown as WorkflowItem[],
    ]);
    setPending(p);
    setInProgress(ip);
    setLoading(false);
  }, [serviceCategory]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeTable("consultation_exams", load, [load]);

  function toggleDossier(patientId: string) {
    setExpandedDossiers(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  }

  async function handleStart(item: WorkflowItem) {
    await onExamStarted(item.id, userId);
    if (onAccept) onAccept(item);
    await load();
  }

  async function handleSaveResult() {
    if (!resultModal) return;
    setSavingResult(true);
    await saveExamResult(resultModal.id, userId, { report: resultText });
    setSavingResult(false);
    setResultModal(null);
    setResultText("");
    await load();
  }

  function openResultModal(item: WorkflowItem) {
    const existing = item.results as { report?: string } | null;
    setResultText(existing?.report ?? "");
    setResultModal(item);
  }

  if (loading) return <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="skeleton h-20" />)}</div>;

  if (pending.length === 0 && inProgress.length === 0) return null;

  const pendingDossiers = groupByPatient(pending);
  const inProgressDossiers = groupByPatient(inProgress);

  function renderDossier(dossier: PatientDossier, isPendingDossier: boolean) {
    const isOpen = expandedDossiers.has(dossier.patientId);
    const p = dossier.patient;

    return (
      <div key={dossier.patientId} className="rounded-xl border border-border bg-surface-soft overflow-hidden transition">
        <button
          onClick={() => toggleDossier(dossier.patientId)}
          className="w-full flex items-center justify-between gap-4 p-4 hover:bg-surface-mid transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 shrink-0">
              <FolderOpen size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-text">{p ? `${p.prenom} ${p.nom}` : "—"}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge tone="primary" className="text-[10px]">{p?.numero_dossier ?? "—"}</Badge>
                <Badge tone="warning" className="text-[10px]">{dossier.items.length} examen{dossier.items.length > 1 ? "s" : ""}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted">
                <span className="flex items-center gap-1"><Stethoscope size={11} /> Dr. {dossier.doctor?.last_name ?? "—"}</span>
                <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(dossier.items[0]?.consultations?.date_consultation ?? "")}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 text-muted">
            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
        </button>

        {isOpen && (
          <div className="border-t border-border px-4 pb-4 space-y-2">
            {dossier.items.map(item => {
              const isItemPending = item.status === "EN_ATTENTE_EXECUTION";
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/60 hover:bg-white transition">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/5 p-1.5 shrink-0">
                      <User size={14} className="text-primary/60" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text">{item.exams?.name ?? "—"}</p>
                      <p className="text-[11px] text-muted">{item.exams?.price ? `${item.exams.price} CDF` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isItemPending ? (
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">En attente</span>
                    ) : (
                      <span className="text-[10px] font-bold bg-secondary/10 text-secondary px-2 py-1 rounded-full">En cours</span>
                    )}
                    {isItemPending ? (
                      <button onClick={() => void handleStart(item)} className="btn-primary text-xs py-1.5 px-3" title="Commencer l'examen">
                        <Play size={12} /> Démarrer
                      </button>
                    ) : (
                      <button onClick={() => openResultModal(item)} className="btn-secondary text-xs py-1.5 px-3" title="Saisir les résultats">
                        <FileText size={12} /> Résultats
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <section className="medical-card p-5 space-y-4 border-l-4 border-l-primary">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-primary" />
          <h3 className="font-bold text-text">Examens du workflow ({pending.length + inProgress.length})</h3>
        </div>

        {pendingDossiers.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">En attente ({pending.length})</p>
            <div className="space-y-3">{pendingDossiers.map((d) => renderDossier(d, true))}</div>
          </div>
        )}

        {inProgressDossiers.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">En cours ({inProgress.length})</p>
            <div className="space-y-3">{inProgressDossiers.map((d) => renderDossier(d, false))}</div>
          </div>
        )}
      </section>

      {resultModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Résultats — {resultModal.exams?.name}</h3>
              <button onClick={() => setResultModal(null)} className="p-2 rounded-lg hover:bg-surface-soft">
                <X size={18} />
              </button>
            </div>
            <div className="mb-4 text-sm text-muted">
              Patient : {resultModal.consultations?.patients?.prenom} {resultModal.consultations?.patients?.nom}
            </div>
            <textarea
              className="input-field min-h-[200px] w-full"
              placeholder="Saisissez le compte-rendu des résultats..."
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
            />
            <div className="flex gap-3 pt-4">
              <button onClick={() => setResultModal(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => void handleSaveResult()} disabled={savingResult || !resultText.trim()} className="btn-primary flex-1">
                {savingResult ? "Enregistrement..." : "Valider les résultats"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
