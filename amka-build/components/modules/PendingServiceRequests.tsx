"use client";

import { useCallback, useEffect, useState } from "react";
import { User, CheckCircle, Clock, Activity, AlertCircle, RefreshCw, FileText, Send, ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { getPendingServiceRequests, updateServiceRequestStatus } from "@/lib/workflow/service-workflow";
import { formatMoney, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PendingServiceRequestsProps {
  serviceType: string;
  onAccept: () => void;
}

type PatientDossier = {
  patientId: string;
  patient: any;
  items: any[];
};

function groupByPatient(items: any[]): PatientDossier[] {
  const map = new Map<string, PatientDossier>();
  for (const item of items) {
    const pid = item.patient_id ?? "unknown";
    if (!map.has(pid)) {
      map.set(pid, {
        patientId: pid,
        patient: item.patients ?? null,
        items: [],
      });
    }
    map.get(pid)!.items.push(item);
  }
  return Array.from(map.values());
}

export function PendingServiceRequests({ serviceType, onAccept }: PendingServiceRequestsProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [resultText, setResultText] = useState("");
  const [expandedDossiers, setExpandedDossiers] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingServiceRequests(serviceType);
      setRequests(data);
    } catch (e: any) {
      setToast({ tone: "error", message: "Erreur chargement des demandes: " + e.message });
    } finally {
      setLoading(false);
    }
  }, [serviceType]);

  useEffect(() => { void load(); }, [load]);

  function toggleDossier(patientId: string) {
    setExpandedDossiers(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  }

  async function handleAccept(request: any) {
    setProcessingId(request.id);
    try {
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: "ACCEPTE" } : r));
      await updateServiceRequestStatus(request.id, "ACCEPTE");
      setToast({ tone: "success", message: "Patient accepté et pris en charge." });
      void load();
      onAccept();
    } catch (e: any) {
      setToast({ tone: "error", message: "Erreur acceptation: " + e.message });
      void load();
    } finally {
      setProcessingId(null);
    }
  }

  async function handleComplete(request: any) {
    if (!resultText.trim()) {
      setToast({ tone: "error", message: "Veuillez saisir un résultat avant de terminer." });
      return;
    }

    const cid = `comp-${request.id}`;
    setProcessingId(cid);
    try {
      setRequests(prev => prev.filter(r => r.id !== request.id));
      await updateServiceRequestStatus(request.id, "TERMINE", null, null, resultText);
      setToast({ tone: "success", message: "Acte terminé et résultat envoyé au médecin." });
      setResultText("");
      setCompletingId(null);
      void load();
      onAccept();
    } catch (e: any) {
      setToast({ tone: "error", message: "Erreur lors de la finalisation: " + e.message });
      void load();
    } finally {
      setProcessingId(null);
    }
  }

  const waiting = requests.filter(r => r.status === "EN_ATTENTE");
  const inProgress = requests.filter(r => r.status === "ACCEPTE");

  const waitingDossiers = groupByPatient(waiting);
  const inProgressDossiers = groupByPatient(inProgress);

  return (
    <div className="glass-card p-6 mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-warning/10 text-warning">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="font-bold text-text">Gestion des Prises en Charge</h3>
            <p className="text-xs text-muted">Suivi des demandes de services</p>
          </div>
        </div>
        <button onClick={() => void load()} className="btn-secondary"><RefreshCw size={16} /></button>
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="skeleton h-20" />)}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 bg-surface-soft rounded-xl border border-dashed border-border">
          <AlertCircle size={32} className="mx-auto text-muted mb-2" />
          <p className="text-sm text-muted font-medium">Aucune demande de prise en charge.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {waitingDossiers.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase text-muted px-1 flex items-center gap-1">
                <div className="h-1 w-1 rounded-full bg-warning" /> En attente d'acceptation
              </p>
              <div className="space-y-3">
                {waitingDossiers.map(dossier => {
                  const isOpen = expandedDossiers.has(dossier.patientId);
                  return (
                    <div key={dossier.patientId} className="rounded-xl border border-border bg-white overflow-hidden transition">
                      <button
                        onClick={() => toggleDossier(dossier.patientId)}
                        className="w-full flex items-center justify-between gap-4 p-4 hover:border-primary/50 transition text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-full bg-surface-soft group-hover:bg-primary/10 transition-colors">
                            <FolderOpen size={20} className="text-muted group-hover:text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-text">{dossier.patient ? `${dossier.patient.prenom} ${dossier.patient.nom}` : "—"}</p>
                              <Badge tone="primary" className="text-[10px]">{dossier.patient?.numero_dossier}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted flex items-center gap-1"><Clock size={12} /> {formatDate(dossier.items[0]?.created_at)}</span>
                              <Badge tone="warning" className="text-[10px]">{dossier.items.length} acte{dossier.items.length > 1 ? "s" : ""}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-muted">
                          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border px-4 pb-4 space-y-2">
                          {dossier.items.map((req: any) => (
                            <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-soft hover:bg-surface-mid transition">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-white shadow-sm">
                                  <Activity size={16} className="text-muted" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-text">{req.prescribed_item?.item_name ?? "—"}</p>
                                  <span className="text-[11px] text-muted">{formatDate(req.created_at)}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => void handleAccept(req)}
                                disabled={processingId === req.id}
                                className="btn-primary py-1.5 px-3 flex items-center gap-1.5 text-xs"
                              >
                                {processingId === req.id ? "..." : <><CheckCircle size={13} /> Accepter</>}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {inProgressDossiers.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase text-muted px-1 flex items-center gap-1">
                <div className="h-1 w-1 rounded-full bg-primary" /> En cours de réalisation
              </p>
              <div className="space-y-3">
                {inProgressDossiers.map(dossier => {
                  const isOpen = expandedDossiers.has(dossier.patientId);
                  return (
                    <div key={dossier.patientId} className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden transition">
                      <button
                        onClick={() => toggleDossier(dossier.patientId)}
                        className="w-full flex items-center justify-between gap-4 p-4 hover:border-primary/50 transition text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-full bg-white shadow-sm group-hover:bg-primary/10 transition-colors">
                            <FolderOpen size={20} className="text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-text">{dossier.patient ? `${dossier.patient.prenom} ${dossier.patient.nom}` : "—"}</p>
                              <Badge tone="primary" className="text-[10px]">{dossier.patient?.numero_dossier}</Badge>
                            </div>
                            <Badge tone="primary" className="text-[9px] mt-1">{dossier.items.length} acte{dossier.items.length > 1 ? "s" : ""} en cours</Badge>
                          </div>
                        </div>
                        <div className="shrink-0 text-muted">
                          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-primary/10 px-4 pb-4 space-y-2">
                          {dossier.items.map((req: any) => (
                            <div key={req.id} className="flex flex-col gap-2 p-3 rounded-lg bg-white/60">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-full bg-white shadow-sm">
                                    <Activity size={16} className="text-primary" />
                                  </div>
                                  <p className="text-sm font-semibold text-text">{req.prescribed_item?.item_name ?? "—"}</p>
                                </div>
                                <Badge tone="primary" className="text-[9px]">ACCEPTE</Badge>
                              </div>
                              <div className="flex items-center gap-2 pt-2 border-t border-primary/10">
                                <div className="relative flex-1">
                                  <input
                                    className="input-field text-sm py-2 pl-3 pr-10 w-full"
                                    placeholder="Saisissez le résultat de l'acte..."
                                    value={completingId === req.id ? resultText : ""}
                                    onChange={e => {
                                      setCompletingId(req.id);
                                      setResultText(e.target.value);
                                    }}
                                    disabled={processingId === `comp-${req.id}`}
                                  />
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted">
                                    <FileText size={14} />
                                  </div>
                                </div>
                                <button
                                  onClick={() => void handleComplete(req)}
                                  disabled={processingId === `comp-${req.id}`}
                                  className="btn-primary py-2 px-4 flex items-center gap-2 text-sm"
                                >
                                  {processingId === `comp-${req.id}` ? "..." : <><Send size={14} /> Terminer</>}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
