"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Send, X, FileText, Image, Download, Eye, CheckCircle, Mail, Search, Inbox, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, type FileTransfer, type FileAttachment } from "@/lib/file-types";
import type { Profile, Patient } from "@/lib/types";

export default function FileTransferPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inbox, setInbox] = useState<(FileTransfer & { file_attachments?: FileAttachment | null })[]>([]);
  const [outbox, setOutbox] = useState<(FileTransfer & { file_attachments?: FileAttachment | null })[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const patientRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"send" | "inbox" | "outbox">("inbox");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(prof as Profile | null);

      supabase.from("profiles").select("*").eq("is_active", true).order("last_name").then((res: { data: Profile[] | null }) => {
        setProfiles((res.data ?? []).filter((p) => p.id !== user.id));
      });

      supabase.from("patients").select("id, nom, prenom, postnom, numero_dossier").order("nom").then((res: { data: Patient[] | null }) => {
        setPatients(res.data ?? []);
      });
    }
    void init();

    function handleClick(e: MouseEvent) {
      if (patientRef.current && !patientRef.current.contains(e.target as Node)) setPatientDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!profile) return;
    loadTransfers();
  }, [profile]);

  function loadTransfers() {
    if (!profile) return;
    supabase.from("file_transfers").select("*, file_attachments(*)")
      .eq("recipient_id", profile.id)
      .order("created_at", { ascending: false })
      .then((res: { data: (FileTransfer & { file_attachments?: FileAttachment | null })[] | null }) => setInbox(res.data ?? []));

    supabase.from("file_transfers").select("*, file_attachments(*)")
      .eq("sender_id", profile.id)
      .order("created_at", { ascending: false })
      .then((res: { data: (FileTransfer & { file_attachments?: FileAttachment | null })[] | null }) => setOutbox(res.data ?? []));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setError("Format non autorisé (PDF, JPG, PNG, WEBP, DOC, TXT).");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("Fichier trop volumineux (max 20 Mo).");
      return;
    }
    setFile(f);
    setError(null);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  async function handleSend() {
    if (!file || !profile || !recipientId || !selectedPatient) return;
    setUploading(true);
    setError(null);

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `patients/${selectedPatient.id}/${Date.now()}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage.from("exam-files").upload(filePath, file, { upsert: false });
    if (uploadError) { setError(uploadError.message); setUploading(false); return; }

    const { data: attachment } = await supabase.from("file_attachments").insert({
      entity_type: "patients",
      entity_id: selectedPatient.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: profile.id,
      description: message || null,
    }).select("id").single();

    if (!attachment) { setError("Erreur création d'attachement"); setUploading(false); return; }

    await supabase.from("file_transfers").insert({
      file_attachment_id: attachment.id,
      sender_id: profile.id,
      recipient_id: recipientId,
      message: message || null,
    });

    setUploading(false);
    setFile(null);
    setPreview(null);
    setRecipientId("");
    setMessage("");
    setSelectedPatient(null);
    setPatientSearch("");
    if (inputRef.current) inputRef.current.value = "";
    setToast({ tone: "success", message: "Fichier envoyé avec succès." });
    loadTransfers();
    setTab("outbox");
  }

  async function markRead(id: string) {
    await supabase.from("file_transfers").update({ is_read: true }).eq("id", id);
    loadTransfers();
  }

  function getFileUrl(path: string) {
    const { data } = supabase.storage.from("exam-files").getPublicUrl(path);
    return data.publicUrl;
  }

  const unreadCount = inbox.filter((t) => !t.is_read).length;

  const filteredInbox = inbox.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.file_attachments?.file_name?.toLowerCase().includes(q) || t.message?.toLowerCase().includes(q);
  });

  const filteredOutbox = outbox.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.file_attachments?.file_name?.toLowerCase().includes(q) || t.message?.toLowerCase().includes(q);
  });

  return (
    <AppShell>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Communications</p>
        <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Transfert de fichiers</h2>
        <p className="mt-1 text-muted text-sm">Envoyez des fichiers (PDF, images) à n&apos;importe quel membre du centre.</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setTab("inbox")} className={cn("px-4 py-3 text-sm font-bold border-b-2 transition", tab === "inbox" ? "border-primary text-primary" : "border-transparent text-muted hover:text-text")}>
          <span className="flex items-center gap-2">
            <Inbox size={16} /> Reçus
            {unreadCount > 0 && <span className="rounded-full bg-error text-white text-[10px] font-bold px-1.5 py-0.5">{unreadCount}</span>}
          </span>
        </button>
        <button onClick={() => setTab("outbox")} className={cn("px-4 py-3 text-sm font-bold border-b-2 transition", tab === "outbox" ? "border-primary text-primary" : "border-transparent text-muted hover:text-text")}>
          <span className="flex items-center gap-2"><Send size={16} /> Envoyés</span>
        </button>
        <button onClick={() => setTab("send")} className={cn("px-4 py-3 text-sm font-bold border-b-2 transition", tab === "send" ? "border-primary text-primary" : "border-transparent text-muted hover:text-text")}>
          <span className="flex items-center gap-2"><Upload size={16} /> Nouvel envoi</span>
        </button>
      </div>

      {tab === "send" && (
        <section className="medical-card p-6 space-y-4">
          <h3 className="text-base font-bold text-text flex items-center gap-2"><Upload size={18} className="text-primary" /> Envoyer un fichier</h3>

          {error && <div className="rounded-xl bg-error/10 border border-error/30 px-4 py-3 text-sm text-error font-semibold">{error}</div>}

          <div className="space-y-1.5">
            <label className="label">Fichier *</label>
            <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-soft p-6 cursor-pointer hover:border-primary/50 transition" onClick={() => inputRef.current?.click()}>
              {preview ? <img src={preview} alt="" className="max-h-32 rounded-lg object-contain mb-2" /> : file ? <FileText size={32} className="text-primary mb-2" /> : <><Upload size={28} className="text-muted mb-2" /><p className="text-sm font-semibold text-muted">Cliquez pour choisir</p></>}
              <p className="text-xs text-muted mt-1">{file ? file.name : "PDF, JPG, PNG, DOC, TXT (max 20 Mo)"}</p>
              <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt" onChange={handleFileSelect} />
            </div>
          </div>

          <div ref={patientRef} className="relative">
            <label className="label">Patient *</label>
            <input className="input-field" placeholder="Rechercher un patient..." value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setPatientDropdownOpen(true); setSelectedPatient(null); }} onFocus={() => setPatientDropdownOpen(true)} />
            {selectedPatient && <p className="text-xs text-primary font-semibold mt-1">{selectedPatient.nom} {selectedPatient.prenom} — {selectedPatient.numero_dossier}</p>}
            {patientDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface-elevated shadow-lg max-h-48 overflow-y-auto">
                {patients.filter((p) => `${p.nom} ${p.prenom} ${p.numero_dossier}`.toLowerCase().includes(patientSearch.toLowerCase())).map((p) => (
                  <button key={p.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-surface-soft transition" onClick={() => { setSelectedPatient(p); setPatientSearch(`${p.nom} ${p.prenom}`); setPatientDropdownOpen(false); }}>
                    {p.nom} {p.prenom} <span className="text-muted">— {p.numero_dossier}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Destinataire *</label>
            <select className="input-field" value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
              <option value="">Sélectionner...</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.role}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Message (optionnel)</label>
            <textarea className="input-field min-h-[60px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message au destinataire..." />
          </div>

          <button onClick={() => void handleSend()} disabled={!file || !recipientId || !selectedPatient || uploading} className="btn-primary flex items-center gap-2">
            {uploading ? "Envoi..." : <><Send size={16} /> Envoyer</>}
          </button>
        </section>
      )}

      {tab === "inbox" && (
        <section className="medical-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input className="input-field pl-10" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="divide-y divide-border">
            {filteredInbox.length === 0 ? (
              <div className="p-12 text-center text-muted text-sm">Aucun fichier reçu.</div>
            ) : (
              filteredInbox.map((t) => (
                <div key={t.id} className={cn("p-4 flex items-start gap-4 hover:bg-surface-soft transition", !t.is_read && "bg-primary/5")}>
                  {t.file_attachments?.mime_type?.startsWith("image/") ? <Image size={20} className="text-primary shrink-0 mt-0.5" /> : <FileText size={20} className="text-primary shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{t.file_attachments?.file_name}</p>
                      {!t.is_read && <span className="w-2 h-2 rounded-full bg-error shrink-0" />}
                    </div>
                    {t.message && <p className="text-xs text-muted mt-0.5 truncate">{t.message}</p>}
                    <p className="text-[10px] text-muted mt-1">{formatDate(t.created_at)} à {formatTime(t.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={t.file_attachments ? getFileUrl(t.file_attachments.file_path) : "#"} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-surface-high text-primary" title="Voir"><Eye size={16} /></a>
                    <a href={t.file_attachments ? getFileUrl(t.file_attachments.file_path) : "#"} download className="p-2 rounded-lg hover:bg-surface-high text-muted" title="Télécharger"><Download size={16} /></a>
                    {!t.is_read && <button onClick={() => void markRead(t.id)} className="p-2 rounded-lg hover:bg-primary/10 text-primary" title="Marquer lu"><CheckCircle size={16} /></button>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {tab === "outbox" && (
        <section className="medical-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input className="input-field pl-10" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="divide-y divide-border">
            {filteredOutbox.length === 0 ? (
              <div className="p-12 text-center text-muted text-sm">Aucun fichier envoyé.</div>
            ) : (
              filteredOutbox.map((t) => (
                <div key={t.id} className="p-4 flex items-start gap-4 hover:bg-surface-soft transition">
                  {t.file_attachments?.mime_type?.startsWith("image/") ? <Image size={20} className="text-primary shrink-0 mt-0.5" /> : <FileText size={20} className="text-primary shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{t.file_attachments?.file_name}</p>
                    {t.message && <p className="text-xs text-muted mt-0.5 truncate">{t.message}</p>}
                    <p className="text-[10px] text-muted mt-1">{formatDate(t.created_at)} à {formatTime(t.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={cn("text-[10px] font-bold", t.is_read ? "text-success" : "text-warning")}>
                      {t.is_read ? "Lu" : "Non lu"}
                    </span>
                    <a href={t.file_attachments ? getFileUrl(t.file_attachments.file_path) : "#"} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-surface-high text-primary"><Eye size={16} /></a>
                    <a href={t.file_attachments ? getFileUrl(t.file_attachments.file_path) : "#"} download className="p-2 rounded-lg hover:bg-surface-high text-muted"><Download size={16} /></a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}
