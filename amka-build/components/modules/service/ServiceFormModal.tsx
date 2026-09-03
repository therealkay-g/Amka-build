import React from "react";
import { X } from "lucide-react";
import type { ModuleConfig } from "@/lib/modules/types";
import type { Profile } from "@/lib/types";

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editing: any | null;
  form: Record<string, string>;
  setForm: (form: Record<string, string>) => void;
  saving: boolean;
  patients: any[];
  config: ModuleConfig;
  patientField: string;
}

export function ServiceFormModal({
  isOpen,
  onClose,
  onSubmit,
  editing,
  form,
  setForm,
  saving,
  patients,
  config,
  patientField,
}: ServiceFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{editing ? "Modifier" : config.createLabel ?? "Nouveau"}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-soft"><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Patient *</label>
            <select
              className="input-field"
              value={form[patientField]}
              onChange={(e) => setForm({ ...form, [patientField]: e.target.value })}
              required
            >
              <option value="">Sélectionner un patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.prenom} {p.nom} — {p.numero_dossier}</option>
              ))}
            </select>
          </div>
          {config.fields.map((field) => (
            <div key={field.key}>
              <label className="label">{field.label}{field.required ? " *" : ""}</label>
              {field.type === "textarea" ? (
                <textarea
                  className="input-field min-h-[80px]"
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              ) : field.type === "select" ? (
                <select
                  className="input-field"
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  required={field.required}
                >
                  <option value="">Sélectionner</option>
                  {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  className="input-field"
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                  step={field.type === "number" ? "0.01" : undefined}
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
