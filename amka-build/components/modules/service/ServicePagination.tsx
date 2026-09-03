import React from "react";

interface ServicePaginationProps {
  totalRows: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function ServicePagination({
  totalRows,
  pageSize,
  currentPage,
  onPageChange,
}: ServicePaginationProps) {
  const totalPages = Math.ceil(totalRows / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface-soft/50 rounded-lg mt-4">
      <div className="text-sm text-muted">
        Affichage de <span className="font-semibold text-text">{(currentPage - 1) * pageSize + 1}</span> à{" "}
        <span className="font-semibold text-text">{Math.min(currentPage * pageSize, totalRows)}</span> sur{" "}
        <span className="font-semibold text-text">{totalRows}</span> enregistrements
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
        >
          Précédent
        </button>
        <div className="flex items-center gap-1 px-2">
          <span className="text-xs font-medium">Page {currentPage} sur {totalPages}</span>
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
