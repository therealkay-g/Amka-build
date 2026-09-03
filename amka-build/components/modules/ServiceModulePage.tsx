"use client";

import { Plus, RefreshCw, Download, Printer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toast } from "@/components/ui/Toast";
import { PendingExamRequests } from "./PendingExamRequests";
import { PendingServiceRequests } from "./PendingServiceRequests";
import { canCreate, canEdit } from "@/lib/permissions";
import type { ModuleConfig } from "@/lib/modules/types";
import { useServiceModule } from "@/lib/hooks/useServiceModule";
import { ServiceStats } from "./service/ServiceStats";
import { ServiceFilters } from "./service/ServiceFilters";
import { ServiceTable } from "./service/ServiceTable";
import { ServiceFormModal } from "./service/ServiceFormModal";
import { ServicePagination } from "./service/ServicePagination";

export function ServiceModulePage({ config, embedded = false }: { config: ModuleConfig; embedded?: boolean }) {
  const {
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
  } = useServiceModule(config);

  const Icon = config.icon;
  const allowCreate = (profile && canCreate(profile.role, config.modulePermission)) && !config.isWorkflowService;
  const allowEdit = canEdit(profile?.role, config.modulePermission);

  const body = (
    <>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        icon={Icon}
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void fetchData()} className="btn-secondary" aria-label="Actualiser">
              <RefreshCw size={16} />
            </button>
            <button onClick={handleExportCsv} className="btn-secondary"><Download size={16} /> CSV</button>
            <button onClick={() => void handleExportPdf()} className="btn-secondary"><Download size={16} /> PDF</button>
            <button onClick={handlePrint} className="btn-secondary"><Printer size={16} /></button>
            {allowCreate && !config.examCategory && (
              <button onClick={openCreate} className="btn-primary">
                <Plus size={16} /> {config.createLabel ?? "Nouveau"}
              </button>
            )}
          </div>
        }
      />

      {config.examCategory && (
        <PendingExamRequests
          serviceCategory={config.examCategory}
          onAccept={() => { void fetchData(); }}
        />
      )}
      {config.isWorkflowService && (
        <PendingServiceRequests
          serviceType={config.key}
          onAccept={() => { void fetchData(); }}
        />
      )}

      <ServiceStats {...stats} />

      <div className="glass-card p-4">
        <ServiceFilters
          query={query}
          setQuery={(val) => {
            setQuery(val);
            setPage(1);
            void fetchData(1, val, statusFilter);
          }}
          statusFilter={statusFilter}
          setStatusFilter={(val) => {
            setStatusFilter(val);
            setPage(1);
            void fetchData(1, query, val);
          }}
        />

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
             <p className="text-muted">Aucun enregistrement</p>
             <p className="text-sm text-muted/60">Commencez par créer un dossier {config.title.toLowerCase()}.</p>
          </div>
        ) : (
          <>
            <ServiceTable
              rows={filtered}
              patients={patients}
              payments={payments}
              attachments={attachments}
              uploadTargetId={uploadTargetId}
              setUploadTargetId={setUploadTargetId}
              profile={profile}
              config={config}
              allowEdit={allowEdit}
              tableFields={tableFields}
              statusField={statusField}
              dateField={dateField}
              amountField={amountField}
              patientField={patientField}
              onEdit={openEdit}
              onUpdateStatus={updateStatus}
              onUploaded={() => void fetchData()}
              onDeleted={() => void fetchData()}
              getPaymentsForService={getPaymentsForService}
            />
            <ServicePagination
              totalRows={totalRows}
              pageSize={pageSize}
              currentPage={page}
              onPageChange={(p) => {
                setPage(p);
                void fetchData(p);
              }}
            />
          </>
        )}
      </div>

      <ServiceFormModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={save}
        editing={editing}
        form={form}
        setForm={setForm}
        saving={saving}
        patients={patients}
        config={config}
        patientField={patientField}
      />
    </>
  );

  if (embedded) return body;
  return <AppShell>{body}</AppShell>;
}
