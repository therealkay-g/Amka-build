"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, Search, RefreshCw, AlertTriangle, Pill, PackagePlus, Edit3, X,
  ShoppingCart, Truck, History, CalendarClock, CheckCircle, CreditCard, FileText, Activity,
  ChevronDown, ChevronRight, FolderOpen, BookOpen,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { logAudit, logActivity } from "@/lib/audit";
import { useRealtimeTables } from "@/lib/hooks/useRealtimeTable";
import type { Medication, Patient, PharmacySupplier, Payment } from "@/lib/types";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { getPendingPharmacyRequests, updatePharmacyRequestStatus } from "@/lib/workflow/pharmacy-workflow";


const UNITS = ["comprimés", "gélules", "flacons", "ampoules", "sachets", "tubes", "unités"];
const CATEGORIES = ["Antibiotique", "Analgésique", "Anti-inflammatoire", "Antipaludéen", "Antihypertenseur", "Antidiabétique", "Vitamines", "Antiparasitaire", "Soluté", "Vaccination", "Autre"];

type Tab = "stock" | "ventes" | "fournisseurs" | "achats" | "alertes" | "prescriptions" | "catalogue";
type ModalMode = "add" | "edit" | "restock" | "sale" | "supplier" | "purchase" | "deliver" | "quickAdd" | null;

type CatalogueProduct = {
  id: number;
  nom_produit: string;
  categorie: string;
  forme: string;
  prix_unitaire_fc: number;
  unite_vente: string;
  stock_initial: number;
  description: string | null;
  statut: string;
};


type Sale = { id: string; medication_id: string; patient_id: string | null; quantity: number; unit_price: number; total_price: number; sold_at: string; medications?: { name: string }; patients?: { nom: string; prenom: string } | null };
type Purchase = { id: string; supplier_id: string | null; medication_id: string | null; quantity: number; unit_price: number; total_price: number; purchase_date: string; invoice_number: string | null; medications?: { name: string }; pharmacy_suppliers?: { name: string } | null };

export default function PharmacyPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [catalogueProducts, setCatalogueProducts] = useState<CatalogueProduct[]>([]);
  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [catalogueCategory, setCatalogueCategory] = useState<string>("Toutes");
  const [expandedPharmaDossiers, setExpandedPharmaDossiers] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Medication | null>(null);
  const [saving, setSaving] = useState(false);
  const [restockQty, setRestockQty] = useState("");

  const [form, setForm] = useState({
    name: "", category: "Antibiotique", unit: "comprimés",
    price: "", stock: "", threshold: "20", expiry_date: "", batch_number: "",
  });
  const [saleForm, setSaleForm] = useState({ medication_id: "", patient_id: "", quantity: "1" });
  const [supplierForm, setSupplierForm] = useState({ name: "", contact: "", phone: "", email: "", address: "" });
  const [purchaseForm, setPurchaseForm] = useState({ supplier_id: "", medication_id: "", quantity: "", unit_price: "", invoice_number: "", purchase_date: new Date().toISOString().slice(0, 10) });

  const getPaymentsForSale = useCallback((saleId: string, patientId?: string | null) => {
    return payments.filter(p => 
      p.service_id === saleId ||
      (patientId && p.patient_id === patientId && (p.service_type === "pharmacie" || p.type?.toLowerCase() === "pharmacie"))
    );
  }, [payments]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    // Charger toutes les données depuis la DB
    const [medsRes, suppliersRes, salesRes, purchasesRes, patientsRes, paymentsRes, pharmaRes, catRes] = await Promise.all([
      supabase.from("medications").select("*").order("name"),
      supabase.from("pharmacy_suppliers").select("*").order("name"),
      supabase.from("sales").select("*, medications(name), patients(nom, prenom)").order("sold_at", { ascending: false }).limit(50),
      supabase.from("pharmacy_purchases").select("*, medications(name), pharmacy_suppliers(name)").order("purchase_date", { ascending: false }),
      supabase.from("patients").select("id, nom, prenom").order("nom"),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      getPendingPharmacyRequests(),
      supabase.from("produits_pharmacie").select("*").order("categorie"),
    ]);

    setMedications((medsRes.data ?? []) as Medication[]);
    setSuppliers((suppliersRes.data ?? []) as PharmacySupplier[]);
    setSales((salesRes.data ?? []) as Sale[]);
    setPurchases((purchasesRes.data ?? []) as Purchase[]);
    setPatients((patientsRes.data ?? []) as Patient[]);
    setPayments((paymentsRes.data ?? []) as Payment[]);
    setPendingRequests(pharmaRes as any[]);
    setCatalogueProducts((catRes.data ?? []) as CatalogueProduct[]);
    setLoading(false);
  }, []);


  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // Real-time pour les tables de la pharmacie
  useRealtimeTables(["medications", "pharmacy_suppliers", "sales", "pharmacy_purchases", "patients", "payments", "produits_pharmacie"], fetchAll);

  const filteredMeds = medications.filter((m) =>
    !query.trim() || m.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCatalogue = catalogueProducts.filter((p) => {
    const matchesQuery = !catalogueQuery.trim() || 
      p.nom_produit.toLowerCase().includes(catalogueQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(catalogueQuery.toLowerCase());
    const matchesCategory = catalogueCategory === "Toutes" || p.categorie === catalogueCategory;
    return matchesQuery && matchesCategory;
  });

  const catalogueCategories = ["Toutes", ...new Set(catalogueProducts.map(p => p.categorie))];

  const isInStock = (productName: string) => {
    return medications.some(m => m.name.toLowerCase() === productName.toLowerCase());
  };

  async function quickAddFromCatalogue(product: CatalogueProduct) {
    setSaving(true);
    const { error } = await supabase.from("medications").insert({
      name: product.nom_produit,
      category: product.categorie,
      unit: product.unite_vente,
      price: product.prix_unitaire_fc,
      stock: product.stock_initial,
      threshold: 10,
      is_active: true,
      expiry_date: null,
      batch_number: null,
    });
    setSaving(false);
    if (error) {
      setToast({ tone: "error", message: error.message });
    } else {
      setToast({ tone: "success", message: `${product.nom_produit} ajouté au stock.` });
      void fetchAll();
    }
  }

  // Calcul des alertes
  const now = new Date();
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(now.getMonth() + 1);
  
  const lowStock: Medication[] = medications.filter(m => m.stock <= m.threshold);
  const expiringSoon: Medication[] = medications.filter(m => 
    m.expiry_date && new Date(m.expiry_date) <= oneMonthLater && new Date(m.expiry_date) >= now
  );
  const expired: Medication[] = medications.filter(m => 
    m.expiry_date && new Date(m.expiry_date) < now
  );

  function closeModal() { setModalMode(null); setSelected(null); }

  function togglePharmaDossier(patientId: string) {
    setExpandedPharmaDossiers(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  }

  type PharmaPatientDossier = { patientId: string; patient: any; items: any[] };
  function groupPharmaByPatient(items: any[]): PharmaPatientDossier[] {
    const map = new Map<string, PharmaPatientDossier>();
    for (const item of items) {
      const pid = item.patient_id ?? "unknown";
      if (!map.has(pid)) {
        map.set(pid, { patientId: pid, patient: item.patients ?? null, items: [] });
      }
      map.get(pid)!.items.push(item);
    }
    return Array.from(map.values());
  }

  async function saveForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name, category: form.category, unit: form.unit,
      price: parseFloat(form.price), stock: parseInt(form.stock, 10),
      threshold: parseInt(form.threshold, 10), is_active: true,
      expiry_date: form.expiry_date || null,
      batch_number: form.batch_number || null,
    };
    let error;
    if (modalMode === "add") {
      ({ error } = await supabase.from("medications").insert(payload));
    } else if (modalMode === "edit" && selected) {
      ({ error } = await supabase.from("medications").update(payload).eq("id", selected.id));
    }
    setSaving(false);
    if (error) { setToast({ tone: "error", message: error.message }); return; }
    setToast({ tone: "success", message: "Médicament enregistré." });
    closeModal();
    void fetchAll();
  }

  async function saveRestock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const qty = parseInt(restockQty, 10);
    if (!qty || qty <= 0) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("medications").update({ stock: selected.stock + qty }).eq("id", selected.id);
    await supabase.from("pharmacy_stock_movements").insert({
      medication_id: selected.id, type: "ENTREE", quantity: qty,
      reason: "Réapprovisionnement", created_by: user?.id ?? null,
    });
    setSaving(false);
    setToast({ tone: "success", message: `${qty} unités ajoutées.` });
    closeModal();
    void fetchAll();
  }

  async function saveSale(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const med = medications.find((m) => m.id === saleForm.medication_id);
    const qty = parseInt(saleForm.quantity, 10);
    if (!med || !qty || qty <= 0) return;
    if (med.stock < qty) { setToast({ tone: "error", message: "Stock insuffisant." }); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const total = med.price * qty;
    await supabase.from("sales").insert({
      medication_id: med.id, patient_id: saleForm.patient_id || null,
      sold_by: user?.id ?? null, quantity: qty, unit_price: med.price, total_price: total,
    });
    await supabase.from("medications").update({ stock: med.stock - qty }).eq("id", med.id);
    await supabase.from("pharmacy_stock_movements").insert({
      medication_id: med.id, type: "VENTE", quantity: qty,
      reason: "Vente pharmacie", created_by: user?.id ?? null,
    });
    await logAudit({ action: "SALE", module: "pharmacie", details: { medication: med.name, quantity: qty, total } });
    await logActivity({ action: "Vente pharmacie", module: "pharmacie", details: `${med.name} x${qty}` });
    setSaving(false);
    setToast({ tone: "success", message: `Vente de ${formatMoney(total)} enregistrée.` });
    closeModal();
    void fetchAll();
  }

  async function saveSupplier(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("pharmacy_suppliers").insert({ ...supplierForm, is_active: true });
    setSaving(false);
    if (error) { setToast({ tone: "error", message: error.message }); return; }
    setToast({ tone: "success", message: "Fournisseur ajouté." });
    closeModal();
    void fetchAll();
  }

  async function savePurchase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const qty = parseInt(purchaseForm.quantity, 10);
    const unitPrice = parseFloat(purchaseForm.unit_price);
    if (!qty || !unitPrice) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const total = qty * unitPrice;
    await supabase.from("pharmacy_purchases").insert({
      supplier_id: purchaseForm.supplier_id || null,
      medication_id: purchaseForm.medication_id || null,
      quantity: qty, unit_price: unitPrice, total_price: total,
      purchase_date: purchaseForm.purchase_date,
      invoice_number: purchaseForm.invoice_number || null,
      created_by: user?.id ?? null,
    });
    if (purchaseForm.medication_id) {
      const med = medications.find((m) => m.id === purchaseForm.medication_id);
      if (med) {
        await supabase.from("medications").update({ stock: med.stock + qty }).eq("id", med.id);
        await supabase.from("pharmacy_stock_movements").insert({
          medication_id: med.id, type: "ENTREE", quantity: qty,
          reason: "Achat fournisseur", created_by: user?.id ?? null,
        });
      }
    }
    setSaving(false);
    setToast({ tone: "success", message: "Achat enregistré et stock mis à jour." });
    closeModal();
    void fetchAll();
  }

  const stockTone = (med: Medication) => med.stock === 0 ? "error" : med.stock <= med.threshold ? "warning" : "success";
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "stock", label: "Stock", icon: Pill },
    { id: "catalogue", label: "Catalogue", icon: BookOpen },
    { id: "prescriptions", label: "Prescriptions", icon: FileText },
    { id: "ventes", label: "Ventes", icon: ShoppingCart },
    { id: "fournisseurs", label: "Fournisseurs", icon: Truck },
    { id: "achats", label: "Achats", icon: PackagePlus },
    { id: "alertes", label: "Alertes", icon: AlertTriangle },
  ];


  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Gestion Pharmaceutique</p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Pharmacie</h2>
          <p className="mt-1 text-muted text-sm">Stock, ventes, fournisseurs, achats et alertes d'expiration.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void fetchAll()} className="btn-secondary"><RefreshCw size={16} /></button>
          {tab === "stock" && <button onClick={() => { setForm({ name: "", category: "Antibiotique", unit: "comprimés", price: "", stock: "", threshold: "20", expiry_date: "", batch_number: "" }); setModalMode("add"); }} className="btn-primary flex items-center gap-2"><Plus size={18} /> Médicament</button>}
          {tab === "ventes" && <button onClick={() => { setSaleForm({ medication_id: "", patient_id: "", quantity: "1" }); setModalMode("sale"); }} className="btn-primary flex items-center gap-2"><Plus size={18} /> Vente</button>}
          {tab === "fournisseurs" && <button onClick={() => { setSupplierForm({ name: "", contact: "", phone: "", email: "", address: "" }); setModalMode("supplier"); }} className="btn-primary flex items-center gap-2"><Plus size={18} /> Fournisseur</button>}
          {tab === "achats" && <button onClick={() => setModalMode("purchase")} className="btn-primary flex items-center gap-2"><Plus size={18} /> Achat</button>}
          {tab === "catalogue" && <div className="text-sm text-muted flex items-center gap-1"><BookOpen size={14} /> {catalogueProducts.length} produits réference</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Médicaments", value: medications.length },
          { label: "Stock faible", value: lowStock.length, tone: "warning" },
          { label: "Expire bientôt", value: expiringSoon.length + expired.length, tone: "error" },
          { label: "Ventes (50 dernières)", value: sales.length },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <p className="text-xs text-muted font-semibold">{s.label}</p>
            <p className={cn("text-2xl font-black mt-1", s.tone === "warning" && "text-warning")}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all", tab === t.id ? "bg-primary text-white" : "bg-surface-soft text-muted hover:text-primary")}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "stock" && (
        <section className="medical-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input className="input-field pl-10" placeholder="Rechercher..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          {loading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-12" />)}</div> : filteredMeds.length === 0 ? (
            <div className="p-12"><EmptyState title="Aucun médicament" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="premium-table w-full">
                <thead><tr><th>Médicament</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Expiration</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredMeds.map((med) => (
                    <tr key={med.id}>
                      <td className="font-bold">{med.name}</td>
                      <td><Badge tone="neutral">{med.category}</Badge></td>
                      <td>{formatMoney(med.price)}</td>
                      <td><Badge tone={stockTone(med)}>{med.stock} {med.unit}</Badge></td>
                      <td className="text-sm">{med.expiry_date ? formatDate(med.expiry_date) : "—"}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => { setSelected(med); setRestockQty(""); setModalMode("restock"); }} className="btn-secondary py-1 px-2 text-xs"><PackagePlus size={13} /></button>
                          <button onClick={() => { setSelected(med); setForm({ name: med.name, category: med.category, unit: med.unit, price: String(med.price), stock: String(med.stock), threshold: String(med.threshold), expiry_date: med.expiry_date ?? "", batch_number: med.batch_number ?? "" }); setModalMode("edit"); }} className="btn-secondary py-1 px-2 text-xs"><Edit3 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "catalogue" && (
        <section className="medical-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input className="input-field pl-10" placeholder="Rechercher un produit..." value={catalogueQuery} onChange={(e) => setCatalogueQuery(e.target.value)} />
              </div>
              <select className="input-field w-auto" value={catalogueCategory} onChange={(e) => setCatalogueCategory(e.target.value)}>
                {catalogueCategories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted mt-2">{filteredCatalogue.length} produit{filteredCatalogue.length > 1 ? "s" : ""} dans le catalogue</p>
          </div>
          {loading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-12" />)}</div> : filteredCatalogue.length === 0 ? (
            <div className="p-12"><EmptyState title="Aucun produit trouvé" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="premium-table w-full">
                <thead><tr><th>Produit</th><th>Catégorie</th><th>Forme</th><th>Prix</th><th>Stock init.</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredCatalogue.map((product) => {
                    const inStock = isInStock(product.nom_produit);
                    return (
                      <tr key={product.id}>
                        <td className="font-bold">{product.nom_produit}</td>
                        <td><Badge tone="neutral">{product.categorie}</Badge></td>
                        <td className="text-sm">{product.forme}</td>
                        <td>{formatMoney(product.prix_unitaire_fc)}</td>
                        <td className="text-sm">{product.stock_initial}</td>
                        <td>
                          {inStock ? (
                            <Badge tone="success">En stock</Badge>
                          ) : (
                            <Badge tone="warning">Non stocké</Badge>
                          )}
                        </td>
                        <td>
                          {!inStock && (
                            <button
                              onClick={() => quickAddFromCatalogue(product)}
                              disabled={saving}
                              className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
                            >
                              <Plus size={12} /> Ajouter au stock
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "prescriptions" && (
        <section className="medical-card overflow-hidden">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h3 className="font-bold text-text">Prescriptions en attente de délivrance</h3>
            <button onClick={() => void fetchAll()} className="btn-secondary"><RefreshCw size={16} /></button>
          </div>
          {loading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}</div> : pendingRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Pill size={48} className="mx-auto text-muted mb-4" />
              <p className="text-lg font-bold text-text">Aucune prescription en attente</p>
              <p className="text-sm text-muted mt-1">Les prescriptions payées apparaîtront ici.</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {groupPharmaByPatient(pendingRequests).map(dossier => {
                const isOpen = expandedPharmaDossiers.has(dossier.patientId);
                return (
                  <div key={dossier.patientId} className="rounded-xl border border-border bg-white overflow-hidden transition">
                    <button
                      onClick={() => togglePharmaDossier(dossier.patientId)}
                      className="w-full flex items-center justify-between gap-4 p-4 hover:border-primary/50 transition text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-surface-soft group-hover:bg-primary/10 transition-colors">
                          <FolderOpen size={20} className="text-muted group-hover:text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-text">{dossier.patient ? `${dossier.patient.prenom} ${dossier.patient.nom}` : "—"}</p>
                            <Badge tone="primary" className="text-[10px]">{dossier.patient?.numero_dossier}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge tone="warning" className="text-[10px]">{dossier.items.length} médicament{dossier.items.length > 1 ? "s" : ""}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-muted">
                        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border px-4 pb-4 space-y-2">
                        {dossier.items.map((req: any) => (
                          <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-soft hover:bg-surface-mid transition">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-white shadow-sm">
                                <Activity size={16} className="text-muted" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-text">{req.prescribed_item?.item_name ?? "—"}</p>
                                <p className="text-[11px] text-muted">{req.prescribed_item?.dosage} {req.prescribed_item?.posology}</p>
                                <span className="text-[11px] text-muted">Qté: {req.prescribed_item?.quantity ?? 0}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone="warning" className="text-[9px]">{req.status}</Badge>
                              <button
                                onClick={async () => {
                                  setSaving(true);
                                  try {
                                    await updatePharmacyRequestStatus(req.id, "EN_PREPARATION");
                                    setToast({ tone: "success", message: "Mise en préparation." });
                                  } catch (e: any) {
                                    setToast({ tone: "error", message: e.message });
                                  } finally {
                                    setSaving(false);
                                    void fetchAll();
                                  }
                                }}
                                disabled={saving}
                                className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                              >
                                <Activity size={12} /> Préparer
                              </button>
                              <button
                                onClick={async () => {
                                  setSaving(true);
                                  try {
                                    await updatePharmacyRequestStatus(req.id, "DELIVRE");
                                    setToast({ tone: "success", message: "Délivré et stock mis à jour." });
                                  } catch (e: any) {
                                    setToast({ tone: "error", message: e.message });
                                  } finally {
                                    setSaving(false);
                                    void fetchAll();
                                  }
                                }}
                                disabled={saving}
                                className="btn-primary py-1 px-2 text-xs flex items-center gap-1"
                                style={{ background: "var(--success)" }}
                              >
                                <CheckCircle size={12} /> Délivrer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "ventes" && (
        <section className="medical-card overflow-hidden">
          {sales.length === 0 ? <div className="p-12"><EmptyState title="Aucune vente" /></div> : (
            <table className="premium-table w-full">
              <thead><tr><th>Date</th><th>Médicament</th><th>Patient</th><th>Qté</th><th>Total</th><th>Paiement</th><th>Actions</th></tr></thead>
              <tbody>
                {sales.map((s) => {
                  const salePayments = getPaymentsForSale(s.id, s.patient_id);
                  const totalPaid = salePayments.reduce((sum, pay) => sum + (Number(pay.montant) || 0), 0);
                  const hasPaidPayments = salePayments.some(pay => pay.status === "COMPLETED");
                  return (
                    <tr key={s.id}>
                      <td className="text-sm">{formatDate(s.sold_at)}</td>
                      <td>{s.medications?.name ?? "—"}</td>
                      <td>{s.patients ? `${s.patients.prenom} ${s.patients.nom}` : "—"}</td>
                      <td>{s.quantity}</td>
                      <td className="font-bold">{formatMoney(s.total_price)}</td>
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
                      <td>
                        {s.patient_id && (
                          <Link href={`/perception/new?patientId=${s.patient_id}&type=Pharmacie&serviceId=${s.id}&serviceType=pharmacie`} className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition" title="Percevoir paiement">
                            <CreditCard size={15} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "fournisseurs" && (
        <section className="medical-card overflow-hidden">
          {suppliers.length === 0 ? <div className="p-12"><EmptyState title="Aucun fournisseur" /></div> : (
            <table className="premium-table w-full">
              <thead><tr><th>Nom</th><th>Contact</th><th>Téléphone</th><th>Email</th></tr></thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}><td className="font-bold">{s.name}</td><td>{s.contact ?? "—"}</td><td>{s.phone ?? "—"}</td><td>{s.email ?? "—"}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "achats" && (
        <section className="medical-card overflow-hidden">
          {purchases.length === 0 ? <div className="p-12"><EmptyState title="Aucun achat" /></div> : (
            <table className="premium-table w-full">
              <thead><tr><th>Date</th><th>Fournisseur</th><th>Médicament</th><th>Qté</th><th>Total</th><th>Facture</th></tr></thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.purchase_date)}</td>
                    <td>{p.pharmacy_suppliers?.name ?? "—"}</td>
                    <td>{p.medications?.name ?? "—"}</td>
                    <td>{p.quantity}</td>
                    <td className="font-bold">{formatMoney(p.total_price)}</td>
                    <td>{p.invoice_number ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "alertes" && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="glass-card p-6">
            <h3 className="font-bold flex items-center gap-2 mb-4"><AlertTriangle className="text-warning" size={18} /> Stock faible ({lowStock.length})</h3>
            {lowStock.length === 0 ? <p className="text-muted text-sm">Aucune alerte stock.</p> : lowStock.map(m => (
              <div key={m.id} className="flex justify-between py-2 border-b border-border/40 text-sm">
                <span>{m.name}</span><Badge tone="warning">{m.stock}/{m.threshold}</Badge>
              </div>
            ))}
          </section>
          <section className="glass-card p-6">
            <h3 className="font-bold flex items-center gap-2 mb-4"><CalendarClock className="text-error" size={18} /> Expiration ({expiringSoon.length + expired.length})</h3>
            {[...expired, ...expiringSoon].length === 0 ? <p className="text-muted text-sm">Aucune alerte expiration.</p> : [...expired, ...expiringSoon].map(m => (
              <div key={m.id} className="flex justify-between py-2 border-b border-border/40 text-sm">
                <span>{m.name}</span><Badge tone={expired.includes(m) ? "error" : "warning"}>{m.expiry_date ? formatDate(m.expiry_date) : "—"}</Badge>
              </div>
            ))}
          </section>
        </div>
      )}

      {(modalMode === "add" || modalMode === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4"><h3 className="text-lg font-bold">{modalMode === "add" ? "Nouveau médicament" : "Modifier"}</h3><button onClick={closeModal}><X size={20} /></button></div>
            <form onSubmit={saveForm} className="space-y-3">
              <input className="input-field" placeholder="Nom *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <select className="input-field" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                <select className="input-field" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
                <input className="input-field" type="number" step="0.01" placeholder="Prix" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
                <input className="input-field" type="number" placeholder="Stock" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
                <input className="input-field" type="number" placeholder="Seuil" value={form.threshold} onChange={e => setForm({...form, threshold: e.target.value})} required />
                <input className="input-field" type="date" placeholder="Expiration" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
                <input className="input-field col-span-2" placeholder="N° lot" value={form.batch_number} onChange={e => setForm({...form, batch_number: e.target.value})} />
              </div>
              <button className="btn-primary w-full" disabled={saving}>{saving ? "..." : "Enregistrer"}</button>
            </form>
          </div>
        </div>
      )}

      {modalMode === "restock" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-sm p-6">
            <h3 className="font-bold mb-4">Réapprovisionner — {selected.name}</h3>
            <form onSubmit={saveRestock} className="space-y-3">
              <input className="input-field" type="number" min="1" value={restockQty} onChange={e => setRestockQty(e.target.value)} required />
              <button className="btn-primary w-full" disabled={saving}>Ajouter au stock</button>
            </form>
          </div>
        </div>
      )}

      {modalMode === "sale" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6">
            <h3 className="font-bold mb-4">Nouvelle vente</h3>
            <form onSubmit={saveSale} className="space-y-3">
              <select className="input-field" value={saleForm.medication_id} onChange={e => setSaleForm({...saleForm, medication_id: e.target.value})} required>
                <option value="">Médicament *</option>
                {medications.filter(m => m.stock > 0).map(m => <option key={m.id} value={m.id}>{m.name} (stock: {m.stock})</option>)}
              </select>
              <select className="input-field" value={saleForm.patient_id} onChange={e => setSaleForm({...saleForm, patient_id: e.target.value})}>
                <option value="">Patient (optionnel)</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
              </select>
              <input className="input-field" type="number" min="1" value={saleForm.quantity} onChange={e => setSaleForm({...saleForm, quantity: e.target.value})} required />
              <button className="btn-primary w-full" disabled={saving}>Enregistrer la vente</button>
            </form>
          </div>
        </div>
      )}

      {modalMode === "supplier" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6">
            <h3 className="font-bold mb-4">Nouveau fournisseur</h3>
            <form onSubmit={saveSupplier} className="space-y-3">
              <input className="input-field" placeholder="Nom *" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} required />
              <input className="input-field" placeholder="Contact" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} />
              <input className="input-field" placeholder="Téléphone" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} />
              <input className="input-field" placeholder="Email" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} />
              <button className="btn-primary w-full" disabled={saving}>Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      {modalMode === "purchase" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6">
            <h3 className="font-bold mb-4">Nouvel achat</h3>
            <form onSubmit={savePurchase} className="space-y-3">
              <select className="input-field" value={purchaseForm.supplier_id} onChange={e => setPurchaseForm({...purchaseForm, supplier_id: e.target.value})}>
                <option value="">Fournisseur</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select className="input-field" value={purchaseForm.medication_id} onChange={e => setPurchaseForm({...purchaseForm, medication_id: e.target.value})} required>
                <option value="">Médicament *</option>
                {medications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input className="input-field" type="number" min="1" placeholder="Quantité" value={purchaseForm.quantity} onChange={e => setPurchaseForm({...purchaseForm, quantity: e.target.value})} required />
              <input className="input-field" type="number" step="0.01" placeholder="Prix unitaire" value={purchaseForm.unit_price} onChange={e => setPurchaseForm({...purchaseForm, unit_price: e.target.value})} required />
              <input className="input-field" type="date" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm({...purchaseForm, purchase_date: e.target.value})} />
              <input className="input-field" placeholder="N° facture" value={purchaseForm.invoice_number} onChange={e => setPurchaseForm({...purchaseForm, invoice_number: e.target.value})} />
              <button className="btn-primary w-full" disabled={saving}>Enregistrer l'achat</button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
