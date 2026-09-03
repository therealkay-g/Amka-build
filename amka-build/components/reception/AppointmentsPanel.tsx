"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar, Clock, User, Plus, X, CheckCircle, Ban, Edit3,
  Search, RefreshCw, Stethoscope, CalendarCheck, CalendarX, UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { logAudit, logActivity, createNotification } from "@/lib/audit";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import type { Appointment, AppointmentStatus, Patient, Profile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<
  AppointmentStatus,
  {
    label: string;
    tone: "primary" | "success" | "warning" | "error" | "neutral";
    icon: React.ElementType;
    iconColor: string;
  }
> = {
  PLANIFIE: { label: "Planifié", tone: "warning", icon: Calendar, iconColor: "text-amber-500" },
  CONFIRME: { label: "Confirmé", tone: "primary", icon: CheckCircle, iconColor: "text-primary" },
  REALISE: { label: "Réalisé", tone: "success", icon: CalendarCheck, iconColor: "text-emerald-500" },
  ANNULE: { label: "Annulé", tone: "error", icon: Ban, iconColor: "text-rose-500" },
  ABSENT: { label: "Absent", tone: "neutral", icon: CalendarX, iconColor: "text-slate-400" },
};

const RDV_TYPES = ["Consultation", "Suivi", "Contrôle", "Urgence", "Autre"];

const emptyForm = {
  patient_id: "",
  medecin_id: "",
  date_rdv: "",
  heure_rdv: "08:00",
  duree_minutes: "30",
  type_rdv: "Consultation",
  motif: "",
  notes: "",
};

export function AppointmentsPanel() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medecins, setMedecins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [patientQuery, setPatientQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [apptsRes, patientsRes, medecinsRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("*, patients(id, nom, prenom, numero_dossier), medecin:medecin_id(id, first_name, last_name)")
        .order("date_rdv", { ascending: true }),
      supabase.from("patients").select("id, nom, prenom, numero_dossier").eq("is_active", true).order("nom"),
      supabase.from("profiles").select("*"),
    ]);

    if (apptsRes.error) {
      setToast({ tone: "error", message: `Erreur chargement rendez-vous: ${apptsRes.error.message}` });
    }

    setAppointments((apptsRes.data ?? []) as Appointment[]);
    setPatients((patientsRes.data ?? []) as Patient[]);

    let docs = (medecinsRes.data ?? []) as Profile[];

    if (docs.length === 0) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch("/api/users", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const apiUsers = await res.json();
            if (Array.isArray(apiUsers)) docs = apiUsers;
          }
        }
      } catch (e) {
        console.error("Erreur fallback fetch users:", e);
      }
    }

    const DOCTOR_ROLES = new Set([
      "MEDECIN_DIRECTEUR", "MEDECIN_1", "MEDECIN_2", "MEDECIN_3", "MEDECIN_4",
      "ORTHOPEDISTE", "PSYCHIATRE", "CHIRURGIEN", "RADIOLOGUE", "KINESITHERAPEUTE", "INFIRMIER", "ADMIN"
    ]);

    const filteredDocs = docs.filter(p => {
      if (p.is_active === false) return false;
      const r = (p.role || "").toUpperCase();
      return DOCTOR_ROLES.has(r) || r.includes("MEDECIN");
    });

    setMedecins(filteredDocs);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeTable("appointments", load, [load]);

  const filtered = appointments.filter(a => {
    if (statusFilter !== "ALL" && a.statut !== statusFilter) return false;
    if (dateFilter) {
      const apptDate = (a.date_rdv || "").slice(0, 10);
      if (apptDate !== dateFilter) return false;
    }
    return true;
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const todayCount = appointments.filter(a => {
    const d = (a.date_rdv || "").slice(0, 10);
    return d === todayStr && a.statut !== "ANNULE";
  }).length;

  const upcomingCount = appointments.filter(a => {
    const d = new Date(a.date_rdv);
    return d >= new Date() && a.statut !== "ANNULE" && a.statut !== "REALISE";
  }).length;

  async function saveAppointment(e: FormEvent) {
    e.preventDefault();
    if (!form.patient_id || !form.medecin_id || !form.date_rdv || !form.motif.trim()) {
      setToast({ tone: "error", message: "Tous les champs obligatoires doivent être remplis." });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const dateRdvStr = `${form.date_rdv}T${form.heure_rdv}:00`;

    try {
      const newStart = new Date(dateRdvStr);
      const newEnd = new Date(newStart.getTime() + Number(form.duree_minutes) * 60000);

      // Vérification des chevauchements d'horaires pour ce médecin
      const startOfDay = `${form.date_rdv}T00:00:00`;
      const endOfDay = `${form.date_rdv}T23:59:59`;

      let query = supabase
        .from("appointments")
        .select("id, date_rdv, duree_minutes")
        .eq("medecin_id", form.medecin_id)
        .gte("date_rdv", startOfDay)
        .lte("date_rdv", endOfDay)
        .neq("statut", "ANNULE");

      if (editingId) {
        query = query.neq("id", editingId);
      }

      const { data: conflicts } = await query;

      if (conflicts && conflicts.length > 0) {
        const hasOverlap = conflicts.some((c: { date_rdv: string; duree_minutes: number | null }) => {
          const start = new Date(c.date_rdv);
          const end = new Date(start.getTime() + (c.duree_minutes || 30) * 60000);
          return (newStart < end && newEnd > start);
        });

        if (hasOverlap) {
          setToast({ tone: "error", message: "Ce médecin a déjà un rendez-vous sur ce créneau horaire." });
          setSaving(false);
          return;
        }
      }

      if (editingId) {
        // Mode modification
        const { error } = await supabase
          .from("appointments")
          .update({
            patient_id: form.patient_id,
            medecin_id: form.medecin_id,
            date_rdv: dateRdvStr,
            date_appointment: dateRdvStr,
            duree_minutes: parseInt(form.duree_minutes, 10),
            type_rdv: form.type_rdv,
            motif: form.motif.trim(),
            notes: form.notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;

        await logAudit({ action: "UPDATE", module: "reception", entityType: "appointments", entityId: editingId, details: { patient_id: form.patient_id } });
        setToast({ tone: "success", message: "Rendez-vous mis à jour avec succès." });
      } else {
        // Mode création
        const { error } = await supabase.from("appointments").insert({
          patient_id: form.patient_id,
          medecin_id: form.medecin_id,
          date_rdv: dateRdvStr,
          date_appointment: dateRdvStr,
          duree_minutes: parseInt(form.duree_minutes, 10),
          type_rdv: form.type_rdv,
          motif: form.motif.trim(),
          notes: form.notes.trim() || null,
          statut: "PLANIFIE",
          created_by: user?.id ?? null,
        });

        if (error) throw error;

        const patient = patients.find(p => p.id === form.patient_id);
        const medecin = medecins.find(m => m.id === form.medecin_id);

        await logAudit({ action: "CREATE", module: "reception", entityType: "appointments", details: { patient_id: form.patient_id } });
        await logActivity({ action: "RDV créé", module: "reception", details: `${patient?.prenom} ${patient?.nom} avec Dr. ${medecin?.last_name}` });
        await createNotification({
          type: "appointment",
          title: "Nouveau rendez-vous",
          message: `RDV pour ${patient?.prenom} ${patient?.nom} le ${formatDate(dateRdvStr)} avec Dr. ${medecin?.last_name}`,
          module: "reception",
        });

        setToast({ tone: "success", message: "Rendez-vous planifié avec succès." });
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      void load();
    } catch (error: any) {
      setToast({ tone: "error", message: error.message || "Erreur lors de l'enregistrement." });
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, newStatus: AppointmentStatus) {
    const { error } = await supabase.from("appointments").update({ statut: newStatus }).eq("id", id);
    if (error) {
      setToast({ tone: "error", message: error.message });
      return;
    }

    await logAudit({ action: "STATUS_CHANGE", module: "reception", entityType: "appointments", entityId: id, details: { statut: newStatus } });

    if (newStatus === "REALISE") {
      setToast({ tone: "success", message: "RDV marqué comme réalisé." });
    } else {
      setToast({ tone: "success", message: `Statut mis à jour : ${STATUS_CONFIG[newStatus].label}` });
    }
    void load();
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      date_rdv: new Date().toISOString().slice(0, 10),
    });
    setPatientQuery("");
    setModalOpen(true);
  }

  function openEdit(appt: Appointment) {
    setEditingId(appt.id);
    const [dDate, dTime] = (appt.date_rdv || "").split("T");
    setForm({
      patient_id: appt.patient_id,
      medecin_id: appt.medecin_id,
      date_rdv: dDate || new Date().toISOString().slice(0, 10),
      heure_rdv: (dTime || "08:00").slice(0, 5),
      duree_minutes: String(appt.duree_minutes || 30),
      type_rdv: appt.type_rdv || "Consultation",
      motif: appt.motif || "",
      notes: appt.notes || "",
    });
    setPatientQuery("");
    setModalOpen(true);
  }

  const selectedPatient = patients.find(p => p.id === form.patient_id);

  const filteredPatients = patientQuery.trim().length > 0
    ? patients.filter(p =>
        p.nom.toLowerCase().includes(patientQuery.toLowerCase()) ||
        p.prenom.toLowerCase().includes(patientQuery.toLowerCase()) ||
        p.numero_dossier.toLowerCase().includes(patientQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h3 className="text-xl font-black text-text">Rendez-vous</h3>
          <p className="text-sm text-muted mt-1">Planification et suivi des rendez-vous patients.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2" aria-label="Nouveau rendez-vous">
          <Plus size={18} /> Nouveau RDV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Aujourd'hui", value: todayCount, tone: "primary" },
          { label: "À venir", value: upcomingCount, tone: "warning" },
          { label: "Confirmés", value: appointments.filter(a => a.statut === "CONFIRME").length, tone: "success" },
          { label: "Total", value: appointments.length, tone: "neutral" },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <p className="text-xs text-muted font-semibold">{s.label}</p>
            <p className="text-2xl font-black mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="date"
            aria-label="Filtrer par date"
            className="input-field pl-10"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
        </div>
        <select
          aria-label="Filtrer par statut"
          className="input-field w-auto min-w-[140px]"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Tous statuts</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <button
          onClick={() => { setDateFilter(new Date().toISOString().slice(0, 10)); setStatusFilter("ALL"); }}
          className="btn-secondary text-xs"
          aria-label="Afficher les rendez-vous d'aujourd'hui"
        >
          <RefreshCw size={14} /> Aujourd'hui
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun rendez-vous" description="Aucun rendez-vous ne correspond à vos filtres actuels." />
      ) : (
        <div className="space-y-3">
          {filtered.map(appt => {
            const cfg = STATUS_CONFIG[appt.statut] || STATUS_CONFIG.PLANIFIE;
            const Icon = cfg.icon;
            const p = appt.patients;
            const m = appt.medecin;
            const rdvDate = new Date(appt.date_rdv);
            const isPast = rdvDate < new Date();

            return (
              <div key={appt.id} className="rounded-xl border border-border bg-white p-4 hover:border-primary/30 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-surface-soft shrink-0">
                      <Icon size={20} className={cfg.iconColor} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-text">{p ? `${p.prenom} ${p.nom}` : "Patient inconnu"}</p>
                        {p?.numero_dossier && <Badge tone="primary" className="text-[10px]">{p.numero_dossier}</Badge>}
                        <Badge tone={cfg.tone} className="text-[10px]">{cfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted flex-wrap">
                        <span className="flex items-center gap-1"><Stethoscope size={12} /> Dr. {m?.last_name ?? "Non spécifié"}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(appt.date_rdv)}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {appt.duree_minutes} min</span>
                      </div>
                      <p className="text-sm text-text mt-1.5">{appt.motif}</p>
                      {appt.notes && <p className="text-xs text-muted italic mt-1">Note: {appt.notes}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone="neutral" className="text-[10px]">{appt.type_rdv}</Badge>
                        {isPast && appt.statut === "PLANIFIE" && (
                          <Badge tone="error" className="text-[10px]">En retard</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => openEdit(appt)}
                      className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                      title="Modifier le rendez-vous"
                      aria-label="Modifier le rendez-vous"
                    >
                      <Edit3 size={13} /> Modifier
                    </button>

                    {appt.statut === "PLANIFIE" && (
                      <>
                        <button
                          onClick={() => void updateStatus(appt.id, "CONFIRME")}
                          className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                          title="Confirmer"
                          aria-label="Confirmer le rendez-vous"
                        >
                          <CheckCircle size={13} /> Confirmer
                        </button>
                        <button
                          onClick={() => void updateStatus(appt.id, "ANNULE")}
                          className="btn-secondary py-1 px-2 text-xs text-error flex items-center gap-1"
                          title="Annuler"
                          aria-label="Annuler le rendez-vous"
                        >
                          <Ban size={13} /> Annuler
                        </button>
                      </>
                    )}

                    {appt.statut === "CONFIRME" && (
                      <>
                        <Link
                          href={`/consultations/new?patientId=${appt.patient_id}`}
                          className="btn-primary py-1 px-2 text-xs flex items-center gap-1"
                          title="Ouvrir consultation"
                        >
                          <Stethoscope size={13} /> Consultation
                        </Link>
                        <button
                          onClick={() => void updateStatus(appt.id, "REALISE")}
                          className="btn-secondary py-1 px-2 text-xs text-success flex items-center gap-1"
                          title="Marquer comme réalisé"
                          aria-label="Marquer comme réalisé"
                        >
                          <CalendarCheck size={13} /> Réalisé
                        </button>
                        <button
                          onClick={() => void updateStatus(appt.id, "ABSENT")}
                          className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                          title="Marquer absent"
                          aria-label="Marquer comme absent"
                        >
                          <UserCheck size={13} /> Absent
                        </button>
                        <button
                          onClick={() => void updateStatus(appt.id, "ANNULE")}
                          className="btn-secondary py-1 px-2 text-xs text-error flex items-center gap-1"
                          title="Annuler"
                          aria-label="Annuler le rendez-vous"
                        >
                          <Ban size={13} />
                        </button>
                      </>
                    )}

                    {appt.statut === "ANNULE" && (
                      <button
                        onClick={() => void updateStatus(appt.id, "PLANIFIE")}
                        className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                        title="Restaurer"
                        aria-label="Restaurer le rendez-vous"
                      >
                        <RefreshCw size={13} /> Restaurer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Calendar size={20} className="text-primary" /> {editingId ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
              </h3>
              <button
                onClick={() => { setModalOpen(false); setEditingId(null); }}
                className="p-2 rounded-lg hover:bg-surface-soft"
                aria-label="Fermer la modale"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(e) => void saveAppointment(e)} className="space-y-4">
              <div>
                <label className="label">Patient *</label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-soft">
                    <div>
                      <p className="font-semibold text-sm text-text">{selectedPatient.prenom} {selectedPatient.nom}</p>
                      <p className="text-xs text-muted">Dossier: {selectedPatient.numero_dossier}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setForm({ ...form, patient_id: "" }); setPatientQuery(""); }}
                      className="btn-secondary text-xs py-1 px-2"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    <input
                      className="input-field pl-10"
                      placeholder="Rechercher par nom, prénom ou n° dossier..."
                      value={patientQuery}
                      onChange={e => setPatientQuery(e.target.value)}
                    />
                    {filteredPatients.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-surface shadow-card overflow-hidden">
                        {filteredPatients.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            className="flex w-full justify-between px-4 py-3 hover:bg-surface-soft text-left text-sm"
                            onClick={() => { setForm({ ...form, patient_id: p.id }); setPatientQuery(""); }}
                          >
                            <span className="font-semibold">{p.prenom} {p.nom}</span>
                            <Badge tone="primary" className="text-[10px]">{p.numero_dossier}</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Médecin *</label>
                <select className="input-field" value={form.medecin_id} onChange={e => setForm({ ...form, medecin_id: e.target.value })} required>
                  <option value="">— Sélectionner —</option>
                  {medecins.map(m => (
                    <option key={m.id} value={m.id}>Dr. {m.first_name} {m.last_name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input-field" value={form.date_rdv} onChange={e => setForm({ ...form, date_rdv: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Heure *</label>
                  <input type="time" className="input-field" value={form.heure_rdv} onChange={e => setForm({ ...form, heure_rdv: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select className="input-field" value={form.type_rdv} onChange={e => setForm({ ...form, type_rdv: e.target.value })}>
                    {RDV_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Durée (min)</label>
                  <select className="input-field" value={form.duree_minutes} onChange={e => setForm({ ...form, duree_minutes: e.target.value })}>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 heure</option>
                    <option value="90">1h30</option>
                    <option value="120">2 heures</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Motif *</label>
                <textarea
                  className="input-field min-h-[80px]"
                  placeholder="Raison du rendez-vous..."
                  value={form.motif}
                  onChange={e => setForm({ ...form, motif: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input-field min-h-[60px]"
                  placeholder="Notes additionnelles..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalOpen(false); setEditingId(null); }} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Planifier le RDV"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

