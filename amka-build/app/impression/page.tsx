"use client";

import { useState } from "react";
import { Printer, FileText, Receipt, Pill, BarChart3, Stethoscope, BedDouble } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { supabase } from "@/lib/supabase";
import { printHtml, printLetterhead, buildOrdonnanceHtml } from "@/lib/export";
import { formatMoney, formatDate } from "@/lib/utils";
import { CENTER_INFO } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

const printTypes = [
  { id: "factures", label: "Factures / Reçus", icon: Receipt, handler: "payments" },
  { id: "ordonnances", label: "Ordonnances", icon: FileText, handler: "consultations" },
  { id: "resultats", label: "Résultats laboratoire", icon: Stethoscope, handler: "laboratory" },
  { id: "pharmacie", label: "Inventaire pharmacie", icon: Pill, handler: "pharmacy" },
  { id: "comptabilite", label: "Dépenses", icon: BarChart3, handler: "accounting" },
  { id: "hospitalisation", label: "Hospitalisations", icon: BedDouble, handler: "hospitalization" },
];

export default function ImpressionPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function printPayments() {
    const { data } = await supabase.from("payments").select("*, patients(nom, prenom, numero_dossier)").eq("status", "COMPLETED").order("created_at", { ascending: false }).limit(50);
    const rows = (data ?? []).map((p: Record<string, unknown>) => {
      const patient = p.patients as { prenom?: string; nom?: string; numero_dossier?: string } | null;
      return `<tr><td>${formatDate(String(p.created_at))}</td><td>${patient ? `${patient.prenom} ${patient.nom}` : "-"}</td><td>${patient?.numero_dossier ?? "-"}</td><td>${p.type}</td><td>${formatMoney(Number(p.montant))}</td><td>${p.mode_paiement}</td></tr>`;
    }).join("");
    printHtml("Reçus / Factures", `${printLetterhead("Reçus et factures")}<table><thead><tr><th>Date</th><th>Patient</th><th>Dossier</th><th>Type</th><th>Montant</th><th>Mode</th></tr></thead><tbody>${rows || "<tr><td colspan='6'>Aucune donnée</td></tr>"}</tbody></table>`);
  }

  async function printConsultations() {
    const { data } = await supabase.from("consultations").select("*, patients(nom, prenom, numero_dossier, date_naissance), profiles(first_name, last_name)").order("date_consultation", { ascending: false }).limit(20);
    const blocks: string[] = [];
    for (const c of (data ?? []) as Record<string, any>[]) {
      const patient = c.patients as { prenom?: string; nom?: string; numero_dossier?: string; date_naissance?: string } | null;
      const med = c.profiles as { first_name?: string; last_name?: string } | null;
      const { data: items } = await supabase.from("prescribed_items").select("item_name, item_type, category, quantity, dosage, posology, duration").eq("consultation_id", c.id);
      const age = patient?.date_naissance ? String(Math.max(0, Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000)))) : "";
      blocks.push(`<div style="border:1px solid #e8e6f8;border-radius:12px;padding:24px;margin-bottom:24px;box-shadow:0 2px 16px rgba(70,72,212,0.05);">${buildOrdonnanceHtml({
        patientName: patient ? `${patient.prenom} ${patient.nom}` : "-",
        patientDossier: patient?.numero_dossier ?? "-",
        patientAge: age ? `${age} ans` : null,
        doctorName: med?.last_name ?? "-",
        date: formatDate(String(c.date_consultation)),
        motif: c.motif as string | null,
        diagnostic: c.diagnostic as string | null,
        items: (items ?? []).map((i: any) => ({
          name: i.item_name,
          type: i.item_type,
          category: i.category ?? "",
          quantity: i.quantity ?? 1,
          dosage: i.dosage,
          posology: i.posology,
          duration: i.duration,
        })),
        notes: c.traitement as string | null,
      })}</div>`);
    }
    printHtml("Ordonnances", `${printLetterhead("Ordonnances et consultations")}${blocks.join("") || "<p>Aucune consultation</p>"}`);
  }

  async function printLaboratory() {
    const { data } = await supabase.from("laboratory_exams").select("*, patients(nom, prenom, numero_dossier)").order("created_at", { ascending: false }).limit(30);
    const rows = (data ?? []).map((e: Record<string, unknown>) => {
      const p = e.patients as { prenom?: string; nom?: string } | null;
      return `<tr><td>${p ? `${p.prenom} ${p.nom}` : "-"}</td><td>${e.type_examen}</td><td>${e.status}</td><td>${e.resultats ?? "En attente"}</td><td>${formatDate(String(e.date_prescription ?? e.created_at))}</td></tr>`;
    }).join("");
    printHtml("Résultats laboratoire", `${printLetterhead("Résultats d'examens biologiques")}<table><thead><tr><th>Patient</th><th>Examen</th><th>Statut</th><th>Résultats</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  async function printPharmacy() {
    const { data } = await supabase.from("medications").select("*").eq("is_active", true).order("name");
    const rows = (data ?? []).map((m: Record<string, unknown>) =>
      `<tr><td>${m.name}</td><td>${m.category}</td><td>${m.stock}</td><td>${m.threshold}</td><td>${formatMoney(Number(m.price))}</td><td>${m.expiry_date ? formatDate(String(m.expiry_date)) : "-"}</td></tr>`
    ).join("");
    printHtml("Pharmacie", `${printLetterhead("Inventaire pharmacie")}<table><thead><tr><th>Médicament</th><th>Catégorie</th><th>Stock</th><th>Seuil</th><th>Prix</th><th>Expiration</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  async function printAccounting() {
    const { data } = await supabase.from("expenses").select("*").order("date", { ascending: false }).limit(50);
    const rows = (data ?? []).map((e: Record<string, unknown>) =>
      `<tr><td>${formatDate(String(e.date))}</td><td>${e.description}</td><td>${e.category}</td><td>${formatMoney(Number(e.amount))}</td></tr>`
    ).join("");
    printHtml("Comptabilité", `${printLetterhead("Journal des dépenses")}<table><thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Montant</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  async function printHospitalization() {
    const { data } = await supabase.from("hospitalizations").select("*, patients(nom, prenom, numero_dossier)").order("date_admission", { ascending: false }).limit(30);
    const rows = (data ?? []).map((h: Record<string, unknown>) => {
      const p = h.patients as { prenom?: string; nom?: string } | null;
      return `<tr><td>${p ? `${p.prenom} ${p.nom}` : "-"}</td><td>${h.chambre ?? "-"} / ${h.lit ?? "-"}</td><td>${h.motif_admission}</td><td>${h.status}</td><td>${formatDate(String(h.date_admission))}</td><td>${h.date_sortie ? formatDate(String(h.date_sortie)) : "En cours"}</td></tr>`;
    }).join("");
    printHtml("Hospitalisations", `${printLetterhead("Registre d'hospitalisation")}<table><thead><tr><th>Patient</th><th>Chambre/Lit</th><th>Motif</th><th>Statut</th><th>Admission</th><th>Sortie</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  const handlers: Record<string, () => Promise<void>> = {
    payments: printPayments,
    consultations: printConsultations,
    laboratory: printLaboratory,
    pharmacy: printPharmacy,
    accounting: printAccounting,
    hospitalization: printHospitalization,
  };

  async function handlePrint(id: string, handler: string, label: string) {
    setLoading(id);
    await handlers[handler]?.();
    await logAudit({ action: "PRINT", module: "impression", details: { type: id, label } });
    setLoading(null);
  }

  return (
    <AppShell>
      <PageHeader
        title="Impression"
        subtitle="Documents formatés avec en-tête officiel du centre"
        icon={Printer}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {printTypes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => void handlePrint(item.id, item.handler, item.label)}
              disabled={loading === item.id}
              className="glass-card p-6 text-left hover-lift group transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                <Icon size={24} />
              </div>
              <h3 className="font-bold text-text">{item.label}</h3>
              <p className="text-sm text-muted mt-1">
                {loading === item.id ? "Préparation..." : "Impression directe avec en-tête AMKA"}
              </p>
            </button>
          );
        })}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold mb-2">{CENTER_INFO.shortName}</h3>
        <p className="text-sm text-muted">{CENTER_INFO.name}</p>
        <p className="text-sm text-muted mt-1">{CENTER_INFO.address} — Tél: {CENTER_INFO.phone}</p>
        <p className="text-xs text-muted mt-3">Impression générée le {formatDate(new Date().toISOString())}</p>
      </div>
    </AppShell>
  );
}
