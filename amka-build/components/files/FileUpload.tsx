"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, FileText, Image, Send, Paperclip, Download, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, type FileAttachment, type FileTransfer } from "@/lib/file-types";
import type { Profile } from "@/lib/types";

type Props = {
  entityType: string;
  entityId: string;
  profile: Profile | null;
  onUploaded?: () => void;
  attachments?: FileAttachment[];
  transfers?: FileTransfer[];
  onDeleted?: () => void;
};

export function FileUpload({ entityType, entityId, profile, onUploaded, attachments, transfers, onDeleted }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Profile[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalOpen) {
    supabase.from("profiles").select("*").eq("is_active", true).order("last_name").then((res: { data: Profile[] | null }) => {
      setRecipients((res.data ?? []).filter((p) => p.id !== profile?.id));
    });
    }
  }, [modalOpen, profile?.id]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setError("Format non autorisé. Utilisez PDF, JPG, PNG, WEBP, DOC, TXT.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("Fichier trop volumineux (max 20 MB).");
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

  function reset() {
    setFile(null);
    setPreview(null);
    setRecipientId("");
    setMessage("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file || !profile || !recipientId) return;
    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${entityType}/${entityId}/${Date.now()}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from("exam-files")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: attachError } = await supabase.from("file_attachments").insert({
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: profile.id,
      description: message || null,
    });

    if (attachError) {
      setError(attachError.message);
      setUploading(false);
      return;
    }

    const { data: attachment } = await supabase.from("file_attachments")
      .select("id")
      .eq("file_path", filePath)
      .maybeSingle();

    if (attachment && recipientId) {
      await supabase.from("file_transfers").insert({
        file_attachment_id: attachment.id,
        sender_id: profile.id,
        recipient_id: recipientId,
        message: message || null,
      });
    }

    setUploading(false);
    setModalOpen(false);
    reset();
    onUploaded?.();
  }

  async function handleDelete(attachmentId: string) {
    const attach = attachments?.find((a) => a.id === attachmentId);
    if (!attach) return;
    await supabase.storage.from("exam-files").remove([attach.file_path]);
    await supabase.from("file_attachments").delete().eq("id", attachmentId);
    onDeleted?.();
  }

  function getFileUrl(path: string) {
    const { data } = supabase.storage.from("exam-files").getPublicUrl(path);
    return data.publicUrl;
  }

  const combined = (attachments ?? []).map((a) => ({
    ...a,
    transfer: (transfers ?? []).find((t) => t.file_attachment_id === a.id),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setModalOpen(true)} className="btn-secondary text-xs flex items-center gap-1.5">
          <Upload size={14} /> Joindre un fichier
        </button>
      </div>

      {combined.length > 0 && (
        <div className="space-y-1.5">
          {combined.map((item) => (
            <div key={item.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm">
              {item.mime_type?.startsWith("image/") ? <Image size={16} className="text-primary shrink-0" /> : <FileText size={16} className="text-primary shrink-0" />}
              <a href={getFileUrl(item.file_path)} target="_blank" rel="noopener noreferrer" className="flex-1 truncate font-medium text-text hover:text-primary underline-offset-2 hover:underline">
                {item.file_name}
              </a>
              <span className="text-[10px] text-muted">{(item.file_size / 1024).toFixed(0)} KB</span>
              {item.transfer && (
                <span className="text-[10px] text-muted">→ {item.transfer.recipient_id.slice(0, 8)}...</span>
              )}
              <a href={getFileUrl(item.file_path)} download className="p-1 rounded hover:bg-surface-high text-muted" title="Télécharger">
                <Download size={14} />
              </a>
              {onDeleted && (
                <button onClick={() => void handleDelete(item.id)} className="p-1 rounded hover:bg-error/10 text-error" title="Supprimer">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => !uploading && setModalOpen(false)}>
          <div className="glass-card w-full max-w-lg p-6 animate-slide-up space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2"><Upload size={18} className="text-primary" /> Joindre un fichier</h3>
              <button onClick={() => { setModalOpen(false); reset(); }} className="p-2 rounded-lg hover:bg-surface-soft"><X size={18} /></button>
            </div>

            {error && (
              <div className="rounded-xl bg-error/10 border border-error/30 px-4 py-3 text-sm text-error font-semibold">{error}</div>
            )}

            <div className="space-y-1.5">
              <label className="label">Fichier (PDF, image, DOC, TXT — max 20 Mo)</label>
              <div
                className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-soft p-6 cursor-pointer hover:border-primary/50 transition"
                onClick={() => inputRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Prévisualisation" className="max-h-32 rounded-lg object-contain mb-2" />
                ) : file ? (
                  <FileText size={32} className="text-primary mb-2" />
                ) : (
                  <>
                    <Upload size={28} className="text-muted mb-2" />
                    <p className="text-sm font-semibold text-muted">Cliquez pour choisir un fichier</p>
                  </>
                )}
                <p className="text-xs text-muted mt-1">{file ? file.name : "ou glissez-déposez"}</p>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            <div>
              <label className="label">Destinataire *</label>
              <select className="input-field" value={recipientId} onChange={(e) => setRecipientId(e.target.value)} required>
                <option value="">Sélectionner un destinataire</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>{r.first_name} {r.last_name} — {r.role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Message (optionnel)</label>
              <textarea
                className="input-field min-h-[60px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ajouter un message au destinataire..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setModalOpen(false); reset(); }} className="btn-secondary flex-1" disabled={uploading}>Annuler</button>
              <button type="button" onClick={() => void handleUpload()} disabled={!file || !recipientId || uploading} className="btn-primary flex-1">
                {uploading ? "Envoi en cours..." : <span className="flex items-center gap-2"><Send size={16} /> Envoyer</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FileViewer({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [files, setFiles] = useState<FileAttachment[]>([]);

  useEffect(() => {
    supabase.from("file_attachments").select("*").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: false }).then((res: { data: FileAttachment[] | null }) => {
      setFiles(res.data ?? []);
    });
  }, [entityType, entityId]);

  if (files.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {files.map((f) => {
        const { data } = supabase.storage.from("exam-files").getPublicUrl(f.file_path);
        return (
          <div key={f.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm">
            {f.mime_type?.startsWith("image/") ? <Image size={16} className="text-primary shrink-0" /> : <FileText size={16} className="text-primary shrink-0" />}
            <a href={data.publicUrl} target="_blank" rel="noopener noreferrer" className="flex-1 truncate font-medium text-text hover:text-primary underline-offset-2 hover:underline">
              {f.file_name}
            </a>
            <span className="text-[10px] text-muted">{(f.file_size / 1024).toFixed(0)} KB</span>
            <a href={data.publicUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-surface-high text-primary" title="Voir">
              <Eye size={14} />
            </a>
            <a href={data.publicUrl} download className="p-1 rounded hover:bg-surface-high text-muted" title="Télécharger">
              <Download size={14} />
            </a>
          </div>
        );
      })}
    </div>
  );
}
