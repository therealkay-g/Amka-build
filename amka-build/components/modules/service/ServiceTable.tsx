import React from "react";
import { Paperclip, Upload, Edit3, CheckCircle, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { FileUpload } from "@/components/files/FileUpload";
import { formatDate, formatTime, formatMoney } from "@/lib/utils";
import { SERVICE_STATUS_LABELS } from "@/lib/constants";
import type { ModuleConfig } from "@/lib/modules/types";
import type { Profile } from "@/lib/types";

type Row = Record<string, unknown> & { id: string };

interface ServiceTableProps {
  rows: Row[];
  patients: any[]; // Use Patient type if available
  payments: any[];
  attachments: Record<string, any[]>;
  uploadTargetId: string | null;
  setUploadTargetId: (id: string | null) => void;
  profile: Profile | null;
  config: ModuleConfig;
  allowEdit: boolean;
  tableFields: any[];
  statusField: string;
  dateField: string;
  amountField: string;
  patientField: string;
  onEdit: (row: Row) => void;
  onUpdateStatus: (row: Row, status: string) => void;
  onUploaded: () => void;
  onDeleted: () => void;
  getPaymentsForService: (row: Row) => any[];
}

export function ServiceTable({
  rows,
  patients,
  payments,
  attachments,
  uploadTargetId,
  setUploadTargetId,
  profile,
  config,
  allowEdit,
  tableFields,
  statusField,
  dateField,
  amountField,
  patientField,
  onEdit,
  onUpdateStatus,
  onUploaded,
  onDeleted,
  getPaymentsForService,
}: ServiceTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <table className="premium-table w-full">
        <thead>
          <tr>
            <th>Patient</th>
            {tableFields.map((f) => <th key={f.key}>{f.label}</th>)}
            <th>Fichiers</th>
            <th>Statut</th>
            <th>Paiement</th>
            <th>Date</th>
            {allowEdit && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const p = row.patients as { nom?: string; prenom?: string; numero_dossier?: string } | null;
            const status = String(row[statusField]);
            const servicePayments = getPaymentsForService(row);
            const totalPaid = servicePayments.reduce((sum, pay) => sum + (Number(pay.montant) || 0), 0);
            const hasPaidPayments = Boolean(row.payment_id) || servicePayments.some(pay => pay.status === "COMPLETED");

            return (
              <tr key={row.id} className="animate-fade-in">
                <td>
                  <div>
                    <p className="font-semibold text-sm">{p ? `${p.prenom} ${p.nom}` : "-"}</p>
                    <p className="text-xs text-muted">{p?.numero_dossier}</p>
                  </div>
                </td>
                {tableFields.map((f) => (
                  <td key={f.key} className="text-sm">
                    {f.type === "number" && f.key.includes("montant")
                      ? formatMoney(Number(row[f.key]))
                      : String(row[f.key] ?? "-")}
                  </td>
                ))}
                <td>
                  <div className="flex items-center gap-1">
                    {(attachments[row.id]?.length ?? 0) > 0 ? (
                      <button
                        onClick={() => setUploadTargetId(uploadTargetId === row.id ? null : row.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <Paperclip size={12} />
                        {attachments[row.id].length}
                      </button>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                    {allowEdit && (
                      <button
                        onClick={() => setUploadTargetId(uploadTargetId === row.id ? null : row.id)}
                        className="p-1 rounded hover:bg-primary/10 text-muted hover:text-primary"
                        title="Joindre un fichier"
                      >
                        <Upload size={13} />
                      </button>
                    )}
                  </div>
                  {uploadTargetId === row.id && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <FileUpload
                        entityType={config.table}
                        entityId={row.id}
                        profile={profile}
                        attachments={attachments[row.id]}
                        onUploaded={onUploaded}
                        onDeleted={onDeleted}
                      />
                    </div>
                  )}
                </td>
                <td>
                  <Badge tone={
                    status === "TERMINE" ? "success" :
                    status === "EN_COURS" ? "primary" :
                    status === "ANNULE" ? "error" : "warning"
                  }>
                    {SERVICE_STATUS_LABELS[status] ?? status}
                  </Badge>
                </td>
                <td>
                  {hasPaidPayments ? (
                    <Badge tone="success" className="flex items-center gap-1">
                      <CheckCircle size={12} /> Payé
                      {totalPaid > 0 && ` (${formatMoney(totalPaid)})`}
                    </Badge>
                  ) : (
                    <Badge tone="warning" className="flex items-center gap-1">
                      <CreditCard size={12} /> Non payé
                    </Badge>
                  )}
                </td>
                <td className="text-sm text-muted whitespace-nowrap">
                  {formatDate(String(row[dateField] ?? row.created_at))}
                  <br />
                  <span className="text-xs">{formatTime(String(row[dateField] ?? row.created_at))}</span>
                </td>
                {allowEdit && (
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => onEdit(row)} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition" title="Modifier">
                        <Edit3 size={15} />
                      </button>
                      {status === "EN_ATTENTE" && (
                        <button onClick={() => onUpdateStatus(row, "EN_COURS")} className="text-xs btn-secondary py-1 px-2">Démarrer</button>
                      )}
                      {status === "EN_COURS" && (
                        <button onClick={() => onUpdateStatus(row, "TERMINE")} className="text-xs btn-primary py-1 px-2">Terminer</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

