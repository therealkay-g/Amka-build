"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Stethoscope, X, User, FileText, Clock, Accessibility, ExternalLink } from "lucide-react";

export type VocalNotificationData = {
  notificationId: string;
  patientId: string;
  numero_dossier: string;
  nom: string;
  prenom: string;
  sexe: string;
  heure: string;
  type_handicap?: string | null;
  niveau_autonomie?: string | null;
};

type VocalNotificationCardProps = {
  data: VocalNotificationData;
  onClose: () => void;
  autoCloseMs?: number; // Défaut: 10000ms (10 sec)
};

export function VocalNotificationCard({ data, onClose, autoCloseMs = 10000 }: VocalNotificationCardProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / autoCloseMs) * 100);
      setProgress(remainingPercent);
      if (elapsed >= autoCloseMs) {
        clearInterval(interval);
        onClose();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [autoCloseMs, onClose]);

  const fullName = `${data.prenom} ${data.nom}`.trim();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-96 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-primary/20 bg-surface/95 p-5 shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-300">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary/10">
        <div
          className="h-full bg-primary transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2 text-primary font-bold text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Stethoscope size={18} />
          </div>
          <span>Nouveau patient</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted hover:bg-surface-soft hover:text-text transition-colors"
          title="Fermer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="py-4 space-y-3.5 text-sm">
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Nom :</p>
          <p className="text-base font-black text-text mt-0.5">{fullName}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-primary/70 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase">Dossier</p>
              <p className="font-mono font-bold text-xs text-text">{data.numero_dossier}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={15} className="text-primary/70 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase">Heure</p>
              <p className="font-bold text-xs text-text">{data.heure}</p>
            </div>
          </div>
        </div>

        {data.type_handicap && (
          <div className="flex items-center gap-2 pt-1">
            <Accessibility size={15} className="text-primary/70 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase">Type de handicap</p>
              <p className="font-medium text-xs text-text">{data.type_handicap}</p>
            </div>
          </div>
        )}

        {data.niveau_autonomie && (
          <div className="text-xs text-muted">
            <span className="font-semibold text-text">Autonomie : </span>
            {data.niveau_autonomie}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
        <Link
          href={`/consultations/new?patientId=${data.patientId}`}
          onClick={onClose}
          className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold"
        >
          <ExternalLink size={14} /> Ouvrir le dossier
        </Link>
        <button
          onClick={onClose}
          className="btn-secondary py-2 px-3 text-xs font-bold"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
