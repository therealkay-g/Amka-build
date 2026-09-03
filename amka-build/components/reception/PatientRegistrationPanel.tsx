"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Edit, Plus, Search, Trash2, Users, FileText, Calendar, Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { logAudit, logActivity, createNotification } from "@/lib/audit";
import type { Patient, Profile } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { HANDICAP_TYPES, AUTONOMIE_LEVELS } from "@/lib/constants";

const pageSize = 10;
const emptyForm = {
  nom: "", prenom: "", postnom: "", sexe: "MASCULIN", date_naissance: "",
  telephone: "", adresse: "", type_handicap: "", niveau_autonomie: "",
  contact_urgence: "", telephone_urgence: "", medecin_referent: "", appareillage: "",
};

export function PatientRegistrationPanel() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medecins, setMedecins] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    async function loadMedecins() {
      const { data } = await supabase.from("profiles").select("*");
      if (data) {
        const DOCTOR_ROLES = new Set([
          "MEDECIN_DIRECTEUR", "MEDECIN_1", "MEDECIN_2", "MEDECIN_3", "MEDECIN_4",
          "ORTHOPEDISTE", "PSYCHIATRE", "CHIRURGIEN", "RADIOLOGUE", "KINESITHERAPEUTE", "INFIRMIER", "ADMIN"
        ]);
        const filtered = (data as Profile[]).filter(p => {
          if (p.is_active === false) return false;
          const r = (p.role || "").toUpperCase();
          return DOCTOR_ROLES.has(r) || r.includes("MEDECIN");
        });
        setMedecins(filtered);
      }
    }
    void loadMedecins();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    let request = supabase.from("patients").select("*", { count: "exact" }).eq("is_active", true)
      .order("created_at", { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
    if (debouncedQuery.trim()) {
      const term = `%${debouncedQuery.trim()}%`;
      request = request.or(`nom.ilike.${term},prenom.ilike.${term},numero_dossier.ilike.${term},telephone.ilike.${term}`);
    }
    const { data, count, error } = await request;
    if (error) setToast({ tone: "error", message: error.message });
    setPatients((data ?? []) as Patient[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, debouncedQuery]);

  useEffect(() => {
    void fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    const channel = supabase
      .channel("reception-patients-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => void fetchPatients())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [fetchPatients]);

  async function generateDossierNumber() {
    const year = new Date().getFullYear();
    const { count } = await supabase.from("patients").select("id", { count: "exact", head: true }).gte("created_at", `${year}-01-01`);
    return `AMKA-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true); }

  function openEdit(patient: Patient) {
    setEditing(patient);
    const newForm = {
      nom: patient.nom, prenom: patient.prenom, postnom: patient.postnom ?? "",
      sexe: patient.sexe, date_naissance: patient.date_naissance,
      telephone: patient.telephone ?? "", adresse: patient.adresse ?? "",
      type_handicap: patient.type_handicap ?? "", niveau_autonomie: patient.niveau_autonomie ?? "",
      contact_urgence: patient.contact_urgence ?? "", telephone_urgence: patient.telephone_urgence ?? "",
      medecin_referent: patient.medecin_referent ?? "", appareillage: patient.appareillage ?? "",
    };
    setForm(newForm);
    setModalOpen(true);
  }

  async function savePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const today = new Date().toISOString().split("T")[0];
    if (form.date_naissance > today) {
      setToast({ tone: "error", message: "Date de naissance invalide." });
      return;
    }
    const formattedForm = {
      nom: form.nom.trim().toUpperCase(),
      prenom: form.prenom.trim().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "),
      postnom: form.postnom ? form.postnom.trim().toUpperCase() : null,
      sexe: form.sexe, date_naissance: form.date_naissance,
      telephone: form.telephone.trim() || null, adresse: form.adresse.trim() || null,
      type_handicap: form.type_handicap || null, niveau_autonomie: form.niveau_autonomie || null,
      contact_urgence: form.contact_urgence.trim() || null, telephone_urgence: form.telephone_urgence.trim() || null,
      medecin_referent: form.medecin_referent.trim() || null, appareillage: form.appareillage.trim() || null,
    };
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editing) {
        const { error, data } = await supabase
          .from("patients")
          .update({ ...formattedForm, updated_at: new Date().toISOString() })
          .eq("id", editing.id)
          .select();
        if (error) throw error;
        setToast({ tone: "success", message: "Dossier modifié." });
      } else {
        const numero_dossier = await generateDossierNumber();
        const { error, data } = await supabase.from("patients").insert({ ...formattedForm, numero_dossier, is_active: true }).select();
        if (error) throw error;
        
        const createdPatient = data && data[0] ? (data[0] as Patient) : null;

        await logAudit({ action: "CREATE", module: "reception", entityType: "patients", details: { numero_dossier } });
        await logActivity({ action: "Nouveau patient", module: "reception", details: numero_dossier });
        await createNotification({
          type: "system",
          title: "Nouveau patient",
          message: `Dossier patient ${formattedForm.prenom} ${formattedForm.nom} (${numero_dossier}) créé`,
          module: "reception",
          entityId: numero_dossier,
          userId: user?.id
        });

        if (formattedForm.medecin_referent) {
          let doctorProfile = medecins.find(m => m.id === formattedForm.medecin_referent);

          if (!doctorProfile) {
            const term = formattedForm.medecin_referent.trim().toLowerCase();
            doctorProfile = medecins.find(m =>
              `${m.first_name} ${m.last_name}`.toLowerCase().includes(term) ||
              m.id === formattedForm.medecin_referent
            );
          }

          if (!doctorProfile && formattedForm.medecin_referent.length > 5) {
            const { data: foundDoc } = await supabase
              .from("profiles")
              .select("*")
              .or(`id.eq.${formattedForm.medecin_referent},first_name.ilike.%${formattedForm.medecin_referent}%,last_name.ilike.%${formattedForm.medecin_referent}%`)
              .maybeSingle();
            if (foundDoc) doctorProfile = foundDoc as Profile;
          }

          if (doctorProfile) {
            const nowTimeStr = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            const payloadData = {
              patientId: createdPatient?.id || numero_dossier,
              numero_dossier,
              nom: formattedForm.nom,
              prenom: formattedForm.prenom,
              sexe: formattedForm.sexe,
              heure: nowTimeStr,
              type_handicap: formattedForm.type_handicap,
              niveau_autonomie: formattedForm.niveau_autonomie,
              medecin_id: doctorProfile.id,
            };

            await createNotification({
              type: "patient_registration_vocal",
              title: "🩺 Nouveau patient attribué",
              message: JSON.stringify(payloadData),
              module: "reception",
              entityId: createdPatient?.id || numero_dossier,
              userId: doctorProfile.id,
            });
          }
        }
        setToast({ tone: "success", message: `Dossier créé : ${numero_dossier}` });
      }
      setModalOpen(false);
      void fetchPatients();
    } catch (error) {
      console.error("Error in savePatient:", error);
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Erreur inattendue." });
    }
  }

  async function archivePatient() {
    if (!confirmDelete) return;
    const { error } = await supabase.from("patients").update({ is_active: false }).eq("id", confirmDelete.id);
    if (error) setToast({ tone: "error", message: error.message });
    else { setToast({ tone: "success", message: "Dossier archivé." }); setConfirmDelete(null); void fetchPatients(); }
  }

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h3 className="text-xl font-black text-text">Enregistrement des patients</h3>
          <p className="text-sm text-muted mt-1">Création et gestion des dossiers à la réception.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nouveau patient
        </button>
      </div>

      <div className="medical-card p-5 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users size={24} />
        </div>
        <div>
          <p className="text-xs font-bold text-muted uppercase">Dossiers actifs</p>
          <p className="text-3xl font-black">{total}</p>
        </div>
      </div>

      <section className="medical-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input className="input-field pl-10" placeholder="Rechercher..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-14" />)}</div>
        ) : patients.length === 0 ? (
          <div className="p-12"><EmptyState title="Aucun patient" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="premium-table w-full">
              <thead>
                <tr>
                  <th>Patient</th><th>Dossier</th><th>Handicap</th><th>Autonomie</th><th>Téléphone</th><th></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="font-bold">{patient.prenom} {patient.nom}</td>
                    <td className="font-mono text-sm">{patient.numero_dossier}</td>
                    <td className="text-sm text-muted">{patient.type_handicap ?? "—"}</td>
                    <td className="text-sm text-muted">{patient.niveau_autonomie ?? "—"}</td>
                    <td className="text-sm">{patient.telephone ?? "—"}</td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <Link href={`/consultations/new?patientId=${patient.id}`} className="btn-secondary py-1 px-2 text-xs">Consultation</Link>
                        <button onClick={() => openEdit(patient)} className="btn-secondary py-1 px-2"><Edit size={14} /></button>
                        <button onClick={() => setConfirmDelete(patient)} className="btn-secondary py-1 px-2 text-error"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-between border-t border-border p-4">
          <button className="btn-secondary" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Précédent</button>
          <button className="btn-secondary" disabled={(page + 1) * pageSize >= total} onClick={() => setPage(p => p + 1)}>Suivant</button>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form onSubmit={savePatient} className="medical-card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText className="text-primary" />{editing ? "Modifier le dossier" : "Nouveau patient"}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block"><span className="label">Nom *</span><input className="input-field" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required /></label>
              <label className="block"><span className="label">Prénom *</span><input className="input-field" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} required /></label>
              <label className="block"><span className="label">Postnom</span><input className="input-field" value={form.postnom} onChange={e => setForm({...form, postnom: e.target.value})} /></label>
              <label className="block"><span className="label">Sexe</span><select className="input-field" value={form.sexe} onChange={e => setForm({...form, sexe: e.target.value})}><option value="MASCULIN">Masculin</option><option value="FEMININ">Féminin</option></select></label>
              <label className="block"><span className="label">Date naissance *</span><input className="input-field" type="date" value={form.date_naissance} onChange={e => setForm({...form, date_naissance: e.target.value})} required /></label>
              <label className="block"><span className="label">Téléphone</span><input className="input-field" value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} /></label>
              <label className="md:col-span-2"><span className="label">Adresse</span><textarea className="input-field min-h-16" value={form.adresse} onChange={e => setForm({...form, adresse: e.target.value})} /></label>
              <label className="block"><span className="label">Type handicap</span><select className="input-field" value={form.type_handicap} onChange={e => setForm({...form, type_handicap: e.target.value})}><option value="">—</option>{HANDICAP_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
              <label className="block"><span className="label">Niveau autonomie</span><select className="input-field" value={form.niveau_autonomie} onChange={e => setForm({...form, niveau_autonomie: e.target.value})}><option value="">—</option>{AUTONOMIE_LEVELS.map(l => <option key={l}>{l}</option>)}</select></label>
              <label className="block"><span className="label">Contact urgence</span><input className="input-field" value={form.contact_urgence} onChange={e => setForm({...form, contact_urgence: e.target.value})} /></label>
              <label className="block"><span className="label">Tél. urgence</span><input className="input-field" value={form.telephone_urgence} onChange={e => setForm({...form, telephone_urgence: e.target.value})} /></label>
              <label className="block">
                <span className="label">Médecin référent</span>
                <select className="input-field" value={form.medecin_referent} onChange={e => setForm({...form, medecin_referent: e.target.value})}>
                  <option value="">— Aucun médecin référent —</option>
                  {medecins.map(m => (
                    <option key={m.id} value={m.id}>
                      Dr. {m.first_name} {m.last_name}
                    </option>
                  ))}
                  {form.medecin_referent && !medecins.some(m => m.id === form.medecin_referent) && (
                    <option value={form.medecin_referent}>{form.medecin_referent}</option>
                  )}
                </select>
              </label>
              <label className="block"><span className="label">Appareillage</span><input className="input-field" value={form.appareillage} onChange={e => setForm({...form, appareillage: e.target.value})} /></label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
              <button type="submit" className="btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="medical-card max-w-md p-6">
            <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="text-error" />Archiver ce dossier ?</h3>
            <p className="text-sm text-muted mt-2">{confirmDelete.prenom} {confirmDelete.nom} — {confirmDelete.numero_dossier}</p>
            <div className="flex justify-end gap-3 mt-4">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="btn-primary bg-error" onClick={() => void archivePatient()}>Archiver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
