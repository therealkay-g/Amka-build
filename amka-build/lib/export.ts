import { CENTER_INFO } from "@/lib/constants";

function dateStr() {
  return new Date().toLocaleDateString("fr-FR");
}

function timeStr() {
  return new Date().toLocaleTimeString("fr-FR");
}

const DOC_CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #fff; color: #1c1c2e; padding: 32px; line-height: 1.6;
}
.doc-wrapper { max-width: 210mm; margin: 0 auto; position: relative; }
.doc-border {
  position: absolute; inset: 0; pointer-events: none;
  border: 2px solid #f0eff8; border-radius: 16px;
}
.doc-header {
  text-align: center; padding: 32px 24px 24px;
  border-bottom: 3px solid #e8e6f8; margin-bottom: 28px; position: relative;
}
.doc-header::after {
  content: ''; position: absolute; bottom: -3px; left: 50%;
  transform: translateX(-50%); width: 240px; height: 3px;
  background: linear-gradient(90deg, transparent, #4648d4, #6063ee, #4648d4, transparent);
}
.doc-logo {
  font-size: 34px; font-weight: 900; letter-spacing: -0.5px;
  background: linear-gradient(135deg, #4648d4 0%, #7c7ff7 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; margin-bottom: 6px;
}
.doc-center-name { font-size: 17px; color: #474560; font-weight: 600; }
.doc-center-details { font-size: 11.5px; color: #8a8a9e; margin-top: 3px; }
.doc-center-details span { display: inline-block; }
.doc-center-details .sep { margin: 0 8px; color: #d0d0e0; }
.doc-title-section { margin: 32px 0 24px; text-align: center; }
.doc-title {
  font-size: 22px; font-weight: 800; color: #4648d4;
  text-transform: uppercase; letter-spacing: 2.5px;
}
.doc-subtitle { font-size: 13px; color: #8a8a9e; margin-top: 6px; }
.doc-meta { font-size: 10px; color: #aaaabc; margin-top: 10px; letter-spacing: 0.5px; }
.doc-section { margin-bottom: 28px; }
.doc-section-title {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.5px; color: #8a8a9e; margin-bottom: 12px;
}
table {
  width: 100%; border-collapse: separate; border-spacing: 0;
  margin-top: 16px; background: #fff;
  border-radius: 12px; overflow: hidden;
  box-shadow: 0 2px 16px rgba(70,72,212,0.06);
}
th {
  background: linear-gradient(135deg, #4648d4, #6063ee);
  color: #fff; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.7px; font-size: 10.5px; padding: 13px 14px; text-align: left;
}
th:last-child { text-align: right; }
th.center { text-align: center; }
td {
  border-bottom: 1px solid #f0eff8; padding: 12px 14px;
  font-size: 12.5px; color: #1c1c2e;
}
td:last-child { text-align: right; }
td.center { text-align: center; }
tr:last-child td { border-bottom: none; }
tr:nth-child(even) td { background: #fafafe; }
.doc-total-row td {
  font-weight: 800; font-size: 14px; color: #4648d4;
  border-top: 2px solid #4648d4; background: #f5f5ff !important;
}
.doc-footer {
  margin-top: 40px; padding-top: 20px;
  border-top: 1px solid #e8e6f8;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 10.5px; color: #8a8a9e;
}
.doc-watermark {
  position: fixed; bottom: 30px; right: 30px;
  font-size: 90px; font-weight: 900; color: #f0eff8;
  opacity: 0.15; transform: rotate(-15deg);
  user-select: none; pointer-events: none; z-index: 0;
}
.doc-stamp {
  display: inline-block; border: 2px solid #4648d4; border-radius: 8px;
  color: #4648d4; font-size: 10px; font-weight: 800;
  padding: 4px 12px; letter-spacing: 1.5px; text-transform: uppercase;
}
@media print {
  body { padding: 12px; }
  .doc-watermark { opacity: 0.08; }
  table { box-shadow: none; page-break-inside: avoid; }
  .doc-border { border-color: #e0e0e0; }
}
`;

function docHeader() {
  return `
    <div class="doc-header">
      <div class="doc-logo">${CENTER_INFO.shortName}</div>
      <div class="doc-center-name">${CENTER_INFO.name}</div>
      <div class="doc-center-details">
        <span>${CENTER_INFO.legalForm}</span>
        <span class="sep">•</span>
        <span>${CENTER_INFO.address}</span>
        <span class="sep">•</span>
        <span>Tél: ${CENTER_INFO.phone}</span>
        ${CENTER_INFO.email ? `<span class="sep">•</span><span>Email: ${CENTER_INFO.email}</span>` : ""}
      </div>
    </div>`;
}

function docTitleSection(title: string, subtitle?: string) {
  return `
    <div class="doc-title-section">
      <h1 class="doc-title">${title}</h1>
      ${subtitle ? `<p class="doc-subtitle">${subtitle}</p>` : ""}
      <p class="doc-meta">Document généré le ${dateStr()} à ${timeStr()}</p>
    </div>`;
}

function docFooter() {
  return `
    <div class="doc-footer">
      <span>© ${new Date().getFullYear()} ${CENTER_INFO.shortName}</span>
      <span class="doc-stamp">Document original</span>
      <span>Page 1/1</span>
    </div>`;
}

function wrapHtml(title: string, body: string) {
  const printScript = isAndroid() ? "" : `<script>window.onload=()=>{setTimeout(()=>{window.print()},500)}<\/script>`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <title>${title} - ${CENTER_INFO.shortName}</title>
  <meta charset="UTF-8">
  <style>${DOC_CSS}</style>
</head>
<body>
  <div class="doc-watermark">${CENTER_INFO.shortName}</div>
  <div class="doc-wrapper">
    <div class="doc-border"></div>
    ${body}
  </div>
  ${printScript}
</body>
</html>`;
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

function openPrintWindow(html: string) {
  if (isAndroid()) return;
  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ─── Public API ─────────────────────────────────────────────

export function printLetterhead(title: string, subtitle?: string) {
  return `
    <div class="doc-section">
      <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #e8e6f8;">
        <p style="font-size:20px;font-weight:800;color:#4648d4;">${title}</p>
        ${subtitle ? `<p style="font-size:13px;color:#8a8a9e;margin-top:4px;">${subtitle}</p>` : ""}
      </div>
    </div>`;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToPdf(title: string, headers: string[], rows: (string | number)[][], subtitle?: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFillColor(70, 72, 212);
  doc.roundedRect(10, 10, 190, 28, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(CENTER_INFO.shortName, 105, 26, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(230, 230, 255);
  doc.text(CENTER_INFO.name, 105, 33, { align: "center" });

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 56);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 14, 64);
  }

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: subtitle ? 74 : 66,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 3.5, font: "helvetica" },
    headStyles: { fillColor: [70, 72, 212], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    tableLineWidth: 0.1,
    tableLineColor: [200, 200, 220],
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.setDrawColor(230, 230, 230);
    doc.line(14, 280, 196, 280);
    doc.text(
      `${CENTER_INFO.shortName} - Page ${i}/${pageCount} - ${dateStr()} ${timeStr()}`,
      105, 287, { align: "center" }
    );
  }

  doc.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportToExcel(filename: string, sheetName: string, headers: string[], rows: (string | number)[][]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function printHtml(title: string, content: string) {
  openPrintWindow(wrapHtml(title, `${docHeader()}${docTitleSection(title)}${content}${docFooter()}`));
}

// ─── Premium Invoice Print ──────────────────────────────────

export function printInvoice(params: {
  invoiceNumber: string;
  patientName: string;
  patientDossier: string;
  doctorName: string;
  date: string;
  items: { name: string; category: string; price: number }[];
  total: number;
  status: string;
}) {
  const rows = params.items.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td class="center" style="color:#8a8a9e;font-size:11px;">${item.category}</td>
      <td>${item.price.toLocaleString("fr-FR")} CDF</td>
    </tr>`).join("");

  const body = `
    ${docHeader()}
    <div class="doc-title-section">
      <h1 class="doc-title">Facture</h1>
      <p style="font-size:28px;font-weight:900;color:#4648d4;margin-top:4px;letter-spacing:2px;">${params.invoiceNumber}</p>
      <p class="doc-meta">${params.date}</p>
    </div>

    <div class="doc-section" style="display:flex;justify-content:space-between;gap:24px;">
      <div style="flex:1;">
        <p class="doc-section-title">Émetteur</p>
        <p style="font-size:13px;font-weight:700;color:#1c1c2e;">${CENTER_INFO.name}</p>
        <p style="font-size:12px;color:#8a8a9e;">${CENTER_INFO.address}</p>
        <p style="font-size:12px;color:#8a8a9e;">Tél: ${CENTER_INFO.phone}</p>
        ${CENTER_INFO.email ? `<p style="font-size:12px;color:#8a8a9e;">Email: ${CENTER_INFO.email}</p>` : ""}
      </div>
      <div style="flex:1;text-align:right;">
        <p class="doc-section-title">Destinataire</p>
        <p style="font-size:13px;font-weight:700;color:#1c1c2e;">${params.patientName}</p>
        <p style="font-size:12px;color:#8a8a9e;">Dossier: ${params.patientDossier}</p>
        <p style="font-size:12px;color:#8a8a9e;">Médecin: ${params.doctorName}</p>
      </div>
    </div>

    <div class="doc-section">
      <p class="doc-section-title">Détail des prestations</p>
      <table>
        <thead><tr><th style="width:45%;">Examen</th><th class="center" style="width:30%;">Catégorie</th><th style="width:25%;">Montant</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="margin-top:20px;text-align:right;">
      <table style="width:auto;margin-left:auto;box-shadow:none;border-radius:8px;">
        <tr class="doc-total-row"><td style="font-size:16px;">Total à payer</td><td style="font-size:18px;">${params.total.toLocaleString("fr-FR")} CDF</td></tr>
      </table>
    </div>

    <div style="margin-top:28px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <p style="font-size:11px;color:#8a8a9e;">Statut</p>
        <p style="font-size:14px;font-weight:700;color:${params.status === "PAYEE" ? "#22c55e" : "#f59e0b"};">
          ${params.status === "PAYEE" ? "✓ Payée" : "En attente de paiement"}
        </p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:11px;color:#8a8a9e;">Cachet et signature</p>
        <div style="width:140px;height:50px;border-bottom:2px solid #1c1c2e;margin-top:4px;"></div>
      </div>
    </div>

    ${docFooter()}`;

  openPrintWindow(wrapHtml(`Facture ${params.invoiceNumber}`, body));
}

// ─── Premium Ordonnance Print ──────────────────────────────

export function buildOrdonnanceHtml(params: {
  patientName: string;
  patientDossier: string;
  patientAge?: string | null;
  doctorName: string;
  date: string;
  motif?: string | null;
  diagnostic?: string | null;
  items: {
    name: string;
    type: string;
    category: string;
    quantity: number;
    dosage?: string | null;
    posology?: string | null;
    duration?: string | null;
  }[];
  notes?: string | null;
}) {
  const itemRows = params.items.map((item, idx) => `
    <tr>
      <td style="width:28px;text-align:center;color:#8a8a9e;font-size:11px;">${idx + 1}</td>
      <td style="font-weight:600;">${item.name}${item.category ? `<div style="font-size:10px;color:#8a8a9e;font-weight:400;margin-top:2px;">${item.category}</div>` : ""}</td>
      <td class="center" style="color:#8a8a9e;font-size:11px;">${item.type === "medical_act" ? "Acte" : "Médicament"}</td>
      <td class="center">${item.quantity}</td>
      <td>${item.dosage || "—"}</td>
      <td>${item.posology || "—"}</td>
      <td>${item.duration || "—"}</td>
    </tr>`).join("");

  return `
    <div class="doc-title-section">
      <h1 class="doc-title">Ordonnance Médicale</h1>
      <p class="doc-subtitle">${CENTER_INFO.name}</p>
      <p class="doc-meta">Date: ${params.date}</p>
    </div>

    <div class="doc-section" style="display:flex;justify-content:space-between;gap:24px;">
      <div style="flex:1;">
        <p class="doc-section-title">Bénéficiaire</p>
        <p style="font-size:14px;font-weight:700;color:#1c1c2e;">${params.patientName}</p>
        <p style="font-size:12px;color:#8a8a9e;">Dossier: ${params.patientDossier}</p>
        ${params.patientAge ? `<p style="font-size:12px;color:#8a8a9e;">Âge: ${params.patientAge}</p>` : ""}
      </div>
      <div style="flex:1;text-align:right;">
        <p class="doc-section-title">Médecin prescripteur</p>
        <p style="font-size:14px;font-weight:700;color:#1c1c2e;">Dr. ${params.doctorName}</p>
      </div>
    </div>

    ${params.motif ? `<div class="doc-section"><p class="doc-section-title">Motif de la consultation</p><p style="font-size:13px;">${params.motif}</p></div>` : ""}
    ${params.diagnostic ? `<div class="doc-section"><p class="doc-section-title">Diagnostic</p><p style="font-size:13px;">${params.diagnostic}</p></div>` : ""}

    <div class="doc-section">
      <p class="doc-section-title">Prescriptions</p>
      ${params.items.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th style="width:28px;text-align:center;">N°</th>
              <th style="width:26%;">Prescription</th>
              <th class="center" style="width:12%;">Type</th>
              <th class="center" style="width:8%;">Qté</th>
              <th style="width:14%;">Dosage</th>
              <th style="width:22%;">Posologie</th>
              <th style="width:10%;">Durée</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>`
      : `<p style="font-size:13px;color:#8a8a9e;">Aucune prescription détaillée.</p>`}
    </div>

    ${params.notes ? `<div class="doc-section"><p class="doc-section-title">Notes</p><p style="font-size:13px;">${params.notes}</p></div>` : ""}

    <div style="margin-top:36px;display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <p style="font-size:11px;color:#8a8a9e;">Fait à Kindu, le ${params.date}</p>
      </div>
      <div style="text-align:center;">
        <p style="font-size:11px;color:#8a8a9e;margin-bottom:8px;">Signature et cachet du médecin</p>
        <div style="width:190px;height:60px;border-bottom:2px solid #1c1c2e;"></div>
      </div>
    </div>`;
}

export function printOrdonnance(params: {
  patientName: string;
  patientDossier: string;
  patientAge?: string | null;
  doctorName: string;
  date: string;
  motif?: string | null;
  diagnostic?: string | null;
  items: {
    name: string;
    type: string;
    category: string;
    quantity: number;
    dosage?: string | null;
    posology?: string | null;
    duration?: string | null;
  }[];
  notes?: string | null;
}) {
  openPrintWindow(wrapHtml(`Ordonnance ${params.patientDossier}`, `${docHeader()}${buildOrdonnanceHtml(params)}${docFooter()}`));
}

// ─── Premium Receipt Print ─────────────────────────────────

export async function printReceipt(params: {
  receiptNumber: string;
  patientName: string;
  patientDossier: string;
  type: string;
  mode: string;
  amount: number;
  date: string;
  time: string;
  notes?: string;
}) {
  if (isAndroid()) {
    try {
      const { printThermalReceipt } = await import("@/lib/thermal-print");
      const result = await printThermalReceipt(params);
      if (!result.success) {
        alert("Impression échouée. Vérifiez l'imprimante Bluetooth.");
      }
    } catch (err: any) {
      alert(`Erreur d'impression: ${err?.message ?? err}`);
    }
    return;
  }

  const body = `
    ${docHeader()}
    <div class="doc-title-section">
      <h1 class="doc-title">Reçu de paiement</h1>
      <p style="font-size:12px;font-weight:700;color:#8a8a9e;margin-top:4px;letter-spacing:2px;">N° ${params.receiptNumber}</p>
    </div>

    <div class="doc-section" style="display:flex;justify-content:space-between;gap:24px;">
      <div style="flex:1;">
        <p class="doc-section-title">Patient</p>
        <p style="font-size:14px;font-weight:700;color:#1c1c2e;">${params.patientName}</p>
        <p style="font-size:12px;color:#8a8a9e;">Dossier: ${params.patientDossier}</p>
      </div>
      <div style="flex:1;text-align:right;">
        <p class="doc-section-title">Date & heure</p>
        <p style="font-size:13px;font-weight:600;color:#1c1c2e;">${params.date}</p>
        <p style="font-size:12px;color:#8a8a9e;">${params.time}</p>
      </div>
    </div>

    <div style="margin:24px 0;padding:20px;background:linear-gradient(135deg,#f5f5ff,#fafafe);border-radius:12px;border:1px solid #e8e6f8;text-align:center;">
      <p style="font-size:11px;color:#8a8a9e;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;">Montant reçu</p>
      <p style="font-size:36px;font-weight:900;color:#4648d4;">${params.amount.toLocaleString("fr-FR")} CDF</p>
    </div>

    <table style="box-shadow:none;border-radius:8px;">
      <tr><td style="width:40%;font-weight:600;">Service</td><td>${params.type}</td></tr>
      <tr><td style="font-weight:600;">Mode de paiement</td><td>${params.mode}</td></tr>
      <tr><td style="font-weight:600;">Statut</td><td><span style="color:#22c55e;font-weight:700;">✓ Payé</span></td></tr>
      ${params.notes ? `<tr><td style="font-weight:600;">Notes</td><td>${params.notes}</td></tr>` : ""}
    </table>

    <div style="margin-top:32px;display:flex;justify-content:space-between;align-items:center;">
      <p style="font-size:11px;color:#8a8a9e;">Cachet et signature</p>
      <p style="font-size:11px;color:#8a8a9e;">Merci pour votre confiance</p>
    </div>
    <div style="margin-top:4px;"><div style="width:160px;height:50px;border-bottom:2px solid #1c1c2e;"></div></div>

    <div style="margin-top:24px;padding:16px;background:#f0f9f0;border-radius:8px;text-align:center;">
      <p style="font-size:12px;color:#16a34a;font-weight:600;">✓ Paiement validé — ${params.date} à ${params.time}</p>
    </div>

    ${docFooter()}`;

  openPrintWindow(wrapHtml(`Reçu ${params.receiptNumber}`, body));
}
