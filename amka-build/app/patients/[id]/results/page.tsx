"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { User, FileText, ClipboardList, Download, ExternalLink, AlertCircle, Calendar, Clock, Activity, X, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { formatMoney, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PatientResult {
  id: string;
  exam_name: string;
  result_text: string;
  date: string;
  status: string;
  consultation_id: string;
}

interface PatientFile {
  id: string;
  name: string;
  type: string;
  url: string;
  created_at: string;
}



export default function PatientResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<any>(null);
  const [results, setResults] = useState<PatientResult[]>([]);
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedResult, setSelectedResult] = useState<PatientResult | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();
      setPatient(patientData);

      const { data: consults } = await supabase
        .from("consultations")
        .select("id")
        .eq("patient_id", id);

      const consultIds = consults?.map((c: any) => c.id) || [];

      if (consultIds.length === 0) {
        setResults([]);
        setLoading(false);
        // We continue to fetch files, so we don't return yet
      } else {
        const { data: examResults, error: examsError } = await supabase
          .from("consultation_exams")
          .select(`
            id,
            results,
            status,
            created_at,
            consultation_id,
            exams (name)
          `)
          .in("consultation_id", consultIds)
          .order("created_at", { ascending: false });

        if (examsError) throw examsError;

        const formattedResults = (examResults || []).map((r: any) => ({
          id: r.id,
          exam_name: r.exams?.name || "Acte Médical",
          result_text: r.results?.report || "Aucun rapport disponible",
          date: r.created_at,
          status: r.status,
          consultation_id: r.consultation_id,
        }));
        setResults(formattedResults);
      }

      const fileTables = ["laboratory_exams", "ecg_exams", "radiology_exams", "eg_exams"];
      const allFiles: PatientFile[] = [];

      for (const table of fileTables) {
        const { data: tableFiles } = await supabase
          .from(table)
          .select("id, name, file_url, created_at")
          .eq("patient_id", id);

        (tableFiles || []).forEach((f: any) => {
          allFiles.push({
            id: f.id,
            name: f.name || `Document ${table}`,
            type: "file",
            url: f.file_url,
            created_at: f.created_at,
          });
        });
      }
      setFiles(allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

    } catch (e: any) {
      setToast({ tone: "error", message: "Erreur lors du chargement des résultats: " + e.message });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadData(); }, [loadData]);

  if (loading) return <div className="p-8 flex items-center justify-center h-full"><div className="skeleton w-full max-w-4xl h-96 rounded-2xl" /></div>;
  if (!patient) return <div className="p-8 text-center text-muted">Patient non trouvé.</div>;

  return (
    <div className="p-6 animate-fade-in space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <a href={`/patients/${id}`} className="p-2 rounded-lg bg-surface-soft text-muted hover:text-primary transition-all" title="Retour au dossier">
            <X size={20} />
          </a>
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <User size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">{patient.prenom} {patient.nom}</h1>
            <p className="text-sm text-muted flex items-center gap-2">
              <Badge tone="neutral">{patient.numero_dossier}</Badge>
              <span>•</span>
              <span>Dossier Médical Consolidé</span>
            </p>
          </div>
        </div>
        <button onClick={() => void loadData()} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <ClipboardList className="text-primary" size={20} />
              Rapports Médicaux
            </h2>
            <Badge tone="primary">{results.length} total</Badge>
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-surface-soft">
              <AlertCircle size={32} className="mx-auto text-muted mb-2" />
              <p className="text-sm text-muted font-medium">Aucun rapport médical structuré trouvé pour ce patient.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {results.map(res => (
                <div key={res.id} className="p-4 rounded-xl border border-border bg-white hover:border-primary/50 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-surface-soft text-primary mt-1">
                        <Activity size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-text">{res.exam_name}</p>
                        <p className="text-xs text-muted flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(res.date)}
                        </p>
                      </div>
                    </div>
                    <Badge tone={res.status === "TERMINE" ? "success" : "warning"}>
                      {res.status}
                    </Badge>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                    <p className="text-sm text-muted italic truncate max-w-[70%]">
                      {res.result_text.substring(0, 100)}{res.result_text.length > 100 ? "..." : ""}
                    </p>
                    <button
                      onClick={() => setSelectedResult(res)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <FileText size={12} /> Voir le rapport
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Download className="text-primary" size={20} />
              Documents joints
            </h2>
            <Badge tone="neutral">{files.length} fichiers</Badge>
          </div>

          {files.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-surface-soft">
              <AlertCircle size={24} className="mx-auto text-muted mb-2" />
              <p className="text-xs text-muted font-medium">Aucun fichier joint trouvé.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(file => (
                <div key={file.id} className="p-3 rounded-xl border border-border bg-white hover:bg-surface-soft transition-all group flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <FileText size={16} />
                    </div>
                    <p className="text-xs font-medium text-text truncate">{file.name}</p>
                  </div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-all"
                    title="Ouvrir le document"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-soft">
              <div className="flex items-center gap-2">
                <Activity className="text-primary" size={20} />
                <h3 className="font-bold text-text">{selectedResult.exam_name}</h3>
              </div>
              <button onClick={() => setSelectedResult(null)} className="p-2 hover:bg-surface rounded-lg text-muted">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex items-center gap-4 mb-6 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="p-2 rounded-lg bg-white shadow-sm text-primary">
                  <Calendar size={18} />
                </div>
                <div className="text-xs text-muted">
                  <p className="font-bold text-text">Date de l'acte</p>
                  <p>{formatDate(selectedResult.date)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-bold text-muted tracking-wider">Compte-rendu médical</label>
                <div className="p-4 rounded-xl bg-surface border border-border text-text text-sm leading-relaxed whitespace-pre-wrap min-h-[200px]">
                  {selectedResult.result_text}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end bg-surface-soft">
              <button
                onClick={() => setSelectedResult(null)}
                className="btn-primary px-6 py-2"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
