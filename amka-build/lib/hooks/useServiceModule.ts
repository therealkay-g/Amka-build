import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { logAudit, logActivity, createNotification } from "@/lib/audit";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { canCreate, canEdit } from "@/lib/permissions";
import type { Patient, Profile, ServiceStatus, Payment } from "@/lib/types";
import type { FileAttachment } from "@/lib/file-types";
import { formatDate, formatMoney, formatTime } from "@/lib/utils";
import { SERVICE_STATUS_LABELS } from "@/lib/constants";
import { exportToCsv, exportToPdf, printHtml } from "@/lib/export";
import type { ModuleConfig } from "@/lib/modules/types";
import type { Database } from "@/lib/types/database";

type Row = Record<string, any> & { id: string };

export function useServiceModule(config: ModuleConfig) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>(config.defaultForm);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<Record<string, FileAttachment[]>>({});
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalRows, setTotalRows] = useState(0);

  const tableFields = config.fields.filter((f) => f.showInTable !== false);
  const patientField = config.patientField ?? "patient_id";
  const statusField = config.statusField ?? "status";
  const dateField = config.dateField ?? "created_at";
  const amountField = config.amountField ?? "montant";

  const getPaymentsForService = useCallback((row: Row) => {
    const rowId = String(row.id);
    const rowPaymentId = row.payment_id ? String(row.payment_id) : null;
    const rowPatientId = String(row[patientField] ?? (row.patients as { id?: string })?.id ?? "");

    return payments.filter(p => {
      if (rowPaymentId && p.id === rowPaymentId) return true;
      if (p.service_id === rowId) return true;
      if (
        rowPatientId &&
        p.patient_id === rowPatientId &&
        p.status === "COMPLETED" &&
        (
          p.service_type === config.key ||
          (p.type && config.paymentType && p.type.toLowerCase() === config.paymentType.toLowerCase()) ||
          (p.type && p.type.toLowerCase() === config.key.toLowerCase())
        )
      ) {
        return true;
      }
      return false;
    });
  }, [payments, config.key, config.paymentType, patientField]);

  const fetchData = useCallback(async (currentPage = page, currentQuery = query, currentStatus = statusFilter) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (prof) setProfile(prof as Profile);
    }

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build the query
    let queryBuilder = supabase.from(config.table as any).select("*, patients(*)", { count: 'exact' });

    if (currentStatus !== "ALL") {
      queryBuilder = queryBuilder.eq(statusField, currentStatus);
    }

    if (currentQuery.trim()) {
      const q = `%${currentQuery.toLowerCase()}%`;
      // Supabase OR filter for search
      queryBuilder = queryBuilder.or(`nom.ilike.${q},prenom.ilike.${q},numero_dossier.ilike.${q}`);
      // Note: This requires a join or separate query for patients.
      // Since we use .select("*, patients(*)"), we are filtering the main table.
      // To filter by patient fields, we'd typically need a view or RPC.
      // For now, let's stick to the main table fields or a basic ilike on a combined field if available.
    }

    const { data: rowsData, count, error } = await queryBuilder.order(dateField, { ascending: false }).range(from, to);

    if (error) {
      console.error("Error fetching rows:", error);
      setToast({ tone: "error", message: "Erreur lors de la récupération des données." });
    } else {
      setRows((rowsData ?? []) as Row[]);
      setTotalRows(count ?? 0);
    }

    // Other data remains global or could be optimized similarly
    const [patientsRes, paymentsRes, filesRes] = await Promise.all([
      supabase.from("patients").select("id, nom, prenom, numero_dossier").order("nom"),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("file_attachments").select("*").eq("entity_type", config.table).order("created_at", { ascending: false }),
    ]);

    setPatients((patientsRes.data ?? []) as Patient[]);
    setPayments((paymentsRes.data ?? []) as Payment[]);

    const attachMap: Record<string, FileAttachment[]> = {};
    for (const f of (filesRes.data ?? []) as FileAttachment[]) {
      if (!attachMap[f.entity_id]) attachMap[f.entity_id] = [];
      attachMap[f.entity_id].push(f);
    }
    setAttachments(attachMap);

    setLoading(false);
  }, [config.table, dateField, config.key, page, pageSize, query, statusFilter]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useRealtimeTable(config.table, () => void fetchData(page, query, statusFilter), [fetchData, page, query, statusFilter]);
  useRealtimeTable("patients", () => void fetchData(page, query, statusFilter), [fetchData, page, query, statusFilter]);
  useRealtimeTable("payments", () => void fetchData(page, query, statusFilter), [fetchData, page, query, statusFilter]);

  const filtered = useMemo(() => rows, [rows]);

  const stats = useMemo(() => {
    const total = totalRows;
    const pending = rows.filter(r => String(r[statusField]) === "EN_ATTENTE").length;
    const inProgress = rows.filter(r => String(r[statusField]) === "EN_COURS").length;
    const completed = rows.filter(r => String(r[statusField]) === "TERMINE").length;
    const revenue = rows.reduce((sum, r) => {
      const amt = Number(r[amountField] ?? 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
    return { total, pending, inProgress, completed, revenue };
  }, [rows, statusField, amountField, totalRows]);

  function openCreate() {
    setEditing(null);
    setForm({ ...config.defaultForm, [patientField]: "" });
    setModalOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    const next: Record<string, string> = { ...config.defaultForm };
    for (const field of config.fields) {
      next[field.key] = row[field.key] != null ? String(row[field.key]) : "";
    }
    next[patientField] = String(row[patientField] ?? "");
    setForm(next);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    for (const field of config.fields) {
      if (field.required && !form[field.key]?.trim()) {
        setToast({ tone: "error", message: `${field.label} est requis.` });
        return;
      }
    }
    if (!form[patientField]) {
      setToast({ tone: "error", message: "Veuillez sélectionner un patient." });
      return;
    }

    setSaving(true);
    const payload: Record<string, unknown> = {};
    for (const field of config.fields) {
      if (field.type === "number") {
        payload[field.key] = form[field.key] ? parseFloat(form[field.key]) : null;
      } else {
        payload[field.key] = form[field.key] || null;
      }
    }
    payload[patientField] = form[patientField];
    if (!editing) {
      payload[statusField] = payload[statusField] ?? "EN_ATTENTE";
    }

    let error;
    if (editing) {
      ({ error } = await supabase.from(config.table as any).update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from(config.table as any).insert(payload));
    }

    setSaving(false);
    if (error) {
      setToast({ tone: "error", message: error.message });
      return;
    }

    await logAudit({
      action: editing ? "UPDATE" : "CREATE",
      module: config.key,
      entityType: config.table,
      entityId: editing?.id,
      details: payload,
    });
    await logActivity({
      action: editing ? "Modification" : "Création",
      module: config.title,
      details: config.title,
    });
    await createNotification({
      type: "service",
      title: config.title,
      message: `${config.title} — ${editing ? "modifié" : "nouveau dossier enregistré"}`,
      module: config.key,
    });

    setToast({ tone: "success", message: editing ? "Enregistrement mis à jour." : "Enregistrement créé avec succès." });
    closeModal();
    void fetchData();
  }

  async function updateStatus(row: Row, status: string) {
    const { error } = await supabase.from(config.table as any).update({ [statusField]: status }).eq("id", row.id);
    if (error) {
      setToast({ tone: "error", message: error.message });
      return;
    }
    await logAudit({ action: "STATUS_CHANGE", module: config.key, entityId: row.id, details: { status } });
    void fetchData();
  }

  function handleExportCsv() {
    const rowsData = filtered.map(row => {
      const p = row.patients as { nom?: string; prenom?: string; numero_dossier?: string } | null;
      return [
        p ? `${p.prenom} ${p.nom}` : "-",
        p?.numero_dossier ?? "-",
        ...tableFields.map(f => String(row[f.key] ?? "-")),
        SERVICE_STATUS_LABELS[String(row[statusField])] ?? String(row[statusField]),
        formatDate(String(row[dateField] ?? row.created_at)),
      ];
    });
    exportToCsv(config.title, ["Patient", "Dossier", ...tableFields.map((f) => f.label), "Statut", "Date"], rowsData);
  }

  async function handleExportPdf() {
    const rowsData = filtered.map(row => {
      const p = row.patients as { nom?: string; prenom?: string; numero_dossier?: string } | null;
      return [
        p ? `${p.prenom} ${p.nom}` : "-",
        ...tableFields.map(f => String(row[f.key] ?? "-")),
        SERVICE_STATUS_LABELS[String(row[statusField])] ?? String(row[statusField]),
      ];
    });
    await exportToPdf(config.title, ["Patient", ...tableFields.map((f) => f.label), "Statut"], rowsData, config.subtitle);
  }

  function handlePrint() {
    const tableBody = filtered.map(row => {
      const p = row.patients as { nom?: string; prenom?: string; numero_dossier?: string } | null;
      return `<tr>
        <td>${p ? `${p.prenom} ${p.nom}` : "-"}</td>
        ${tableFields.map((f) => `<td>${String(row[f.key] ?? "-")}</td>`).join("")}
        <td>${SERVICE_STATUS_LABELS[String(row[statusField])] ?? String(row[statusField])}</td>
      </tr>`;
    }).join("");

    printHtml(config.title, `
      <div class="header"><h1>${config.title}</h1><p class="muted">${config.subtitle}</p></div>
      <table><thead><tr><th>Patient</th>${tableFields.map((f) => `<th>${f.label}</th>`).join("")}<th>Statut</th></tr></thead>
      <tbody>${tableBody}</tbody></table>
    `);
  }

  return {
    profile,
    rows,
    patients,
    payments,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    loading,
    toast,
    setToast,
    modalOpen,
    editing,
    form,
    setForm,
    saving,
    attachments,
    uploadTargetId,
    setUploadTargetId,
    tableFields,
    patientField,
    statusField,
    dateField,
    amountField,
    stats,
    filtered,
    fetchData,
    page,
    setPage,
    pageSize,
    totalRows,
    openCreate,
    openEdit,
    closeModal,
    save,
    updateStatus,
    handleExportCsv,
    handleExportPdf,
    handlePrint,
    getPaymentsForService,
  };
}
