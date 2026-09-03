"use client";

import { FormEvent, useCallback, useEffect, useState, useMemo } from "react";
import { Plus, RefreshCw, TrendingUp, TrendingDown, Wallet, Download, X, AlertTriangle } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Expense, Payment } from "@/lib/types";
import { formatMoney, formatDate, todayIsoDate } from "@/lib/utils";

const EXPENSE_CATEGORIES = [
  "Salaires", "Équipements médicaux", "Consommables", "Électricité/Eau",
  "Maintenance", "Loyer", "Transport", "Formation", "Autre",
];

const SERVICE_CATEGORIES = [
  "Administration", "Maintenance et Entretien", "Investissement et Achat Appareils médicaux",
  "Pharmacie", "Radiologie", "EEG", "Laboratoire", "Infirmerie", "Construction Clôture",
  "Appareillage", "Chapelle", "Kiné", "Carburant", "Formation", "Ponseti", "Chirurgie",
  "Prime Agent", "Service social", "Autres", "Contribution du Diocèse", "Versement à la TMB",
  "Hospitalisation", "Soins Médicaux personnel",
];

const CHART_COLORS = ["#4648d4", "#00687a", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function exportCSV(data: Expense[]) {
  const header = "Description,Catégorie,Montant,Date";
  const rows = data.map((e) => `"${e.description}","${e.category}",${e.amount},"${e.date}"`);
  const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `depenses_${todayIsoDate()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AccountingPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "Salaires", service: "Autre", date: todayIsoDate() });
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [accountTab, setAccountTab] = useState<"tresorerie" | "journal" | "grand_livre" | "bilan" | "resultat">("tresorerie");

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balance, setBalance] = useState(0);
  const [chartData, setChartData] = useState<{ date: string; revenue: number; expenses: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    void fetchData();
  }, [period]);

  type JournalEntry = { id: string; date: string; label: string; debit: number; credit: number; category: string };

  const journalEntries = useMemo(() => {
    const entries: JournalEntry[] = [];

    payments.forEach(p => {
      entries.push({
        id: `pay-${p.id}`,
        date: p.created_at,
        label: `Paiement Patient`,
        category: 'Recettes',
        debit: 0,
        credit: p.montant || 0
      });
    });

    expenses.forEach(e => {
      entries.push({
        id: `exp-${e.id}`,
        date: e.date,
        label: e.description,
        category: e.category,
        debit: e.amount || 0,
        credit: 0
      });
    });

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [payments, expenses]);

  const ledgerByCategory = useMemo(() => {
    const ledger: Record<string, { debit: number; credit: number }> = {};

    payments.forEach(p => {
      const cat = 'Recettes';
      if (!ledger[cat]) ledger[cat] = { debit: 0, credit: 0 };
      ledger[cat].credit += p.montant || 0;
    });

    expenses.forEach(e => {
      const cat = e.category;
      if (!ledger[cat]) ledger[cat] = { debit: 0, credit: 0 };
      ledger[cat].debit += e.amount || 0;
    });

    return ledger;
  }, [payments, expenses]);

  const totalAssets = useMemo(() => {
    // Total Assets = Total Revenue - Total Expenses (Cash on hand)
    return totalRevenue - totalExpenses;
  }, [totalRevenue, totalExpenses]);

  const totalLiabilities = 0; // In this simplified system, we assume no loans/debts


  async function fetchData() {
    setLoading(true);
    try {
      const daysAgo = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startIso = startDate.toISOString();

      // 1. Fetch Payments (Revenue)
      const { data: paymentsData, error: payErr } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "COMPLETED")
        .gte("created_at", startIso)
        .order("created_at", { ascending: true });

      if (payErr) throw payErr;

      // 2. Fetch Expenses
      const { data: expensesData, error: expErr } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", startIso.split("T")[0])
        .order("date", { ascending: true });

      if (expErr) throw expErr;

      // 3. Fetch Pharmacy Purchases (Additional Expenses)
      const { data: purchaseData, error: purErr } = await supabase
        .from("pharmacy_purchases")
        .select("*")
        .gte("purchase_date", startIso.split("T")[0])
        .order("purchase_date", { ascending: true });

      if (purErr) throw purErr;

      // Combine all expenses
      const combinedExpenses = [
        ...(expensesData || []).map((e: any) => ({ ...e, isPurchase: false })),
        ...(purchaseData || []).map((p: any) => ({
          id: p.id,
          description: `Achat Pharmacie: ${p.invoice_number || 'N/A'}`,
          amount: p.total_price,
          category: 'Approvisionnement',
          date: p.purchase_date,
          isPurchase: true
        }))
      ];

      // --- Calculations ---
      const rev = (paymentsData || []).reduce((acc: number, p: any) => acc + (p.montant || 0), 0);
      const exp = combinedExpenses.reduce((acc: number, e: any) => acc + (e.amount || 0), 0);

      setTotalRevenue(rev);
      setTotalExpenses(exp);
      setBalance(rev - exp);
      setPayments(paymentsData || []);
      setExpenses(combinedExpenses as Expense[]);

      // --- Chart Data (Daily Evolution) ---
      const evolutionMap: Record<string, { revenue: number; expenses: number }> = {};
      (paymentsData || []).forEach((p: any) => {
        const date = p.created_at.split("T")[0];
        if (!evolutionMap[date]) evolutionMap[date] = { revenue: 0, expenses: 0 };
        evolutionMap[date].revenue += p.montant || 0;
      });
      combinedExpenses.forEach((e: any) => {
        const date = e.date;
        if (!evolutionMap[date]) evolutionMap[date] = { revenue: 0, expenses: 0 };
        evolutionMap[date].expenses += e.amount || 0;
      });

      setChartData(
        Object.entries(evolutionMap)
          .map(([date, values]) => ({ date, ...values }))
          .sort((a, b) => a.date.localeCompare(b.date))
      );

      // --- Pie Chart (Expense Distribution) ---
      const categoryMap: Record<string, number> = {};
      combinedExpenses.forEach((e: any) => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + (e.amount || 0);
      });
      setPieData(
        Object.entries(categoryMap).map(([name, value]) => ({ name, value }))
      );

    } catch (error: any) {
      console.error("Fetch error:", error);
      setToast({ tone: "error", message: `Erreur de chargement: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function saveExpense(evt: FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setToast({ tone: "error", message: "Montant invalide." }); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("expenses").insert({
      description: `[${form.service}] ${form.description}`, amount, category: form.category, date: form.date,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { setToast({ tone: "error", message: error.message }); return; }
    setToast({ tone: "success", message: "Dépense enregistrée." });
    setShowModal(false);
    setForm({ description: "", amount: "", category: "Salaires", service: "Autre", date: todayIsoDate() });
    void fetchData();
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Comptabilité</p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Comptabilité</h2>
          <p className="mt-1 text-muted text-sm">Trésorerie, journal, grand livre, bilan et compte de résultat.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(expenses)} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Dépense
          </button>
        </div>
      </div>

      {/* Accounting Tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          ["tresorerie", "Trésorerie"],
          ["journal", "Journal"],
          ["grand_livre", "Grand Livre"],
          ["bilan", "Bilan"],
          ["resultat", "Compte de Résultat"],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAccountTab(id)} className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-all ${accountTab === id ? "border-primary bg-primary text-white" : "border-border text-muted hover:border-primary"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(["7", "30", "90"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-all ${
              period === p ? "border-primary bg-primary text-white" : "border-border text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {p === "7" ? "7 jours" : p === "30" ? "30 jours" : "90 jours"}
          </button>
        ))}
        <button onClick={() => void fetchData()} className="ml-auto btn-secondary flex items-center gap-2 text-xs">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="medical-card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <TrendingUp className="text-success" size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Revenus</p>
            <p className="text-2xl font-black text-success mt-0.5">{formatMoney(totalRevenue)}</p>
          </div>
        </div>
        <div className="medical-card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
            <TrendingDown className="text-error" size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Dépenses</p>
            <p className="text-2xl font-black text-error mt-0.5">{formatMoney(totalExpenses)}</p>
          </div>
        </div>
        <div className={`medical-card p-5 flex items-center gap-4 ${balance < 0 ? "border-error/20" : "border-success/20"}`}>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${balance < 0 ? "bg-error/10" : "bg-primary/10"}`}>
            <Wallet className={balance < 0 ? "text-error" : "text-primary"} size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Solde Net</p>
            <p className={`text-2xl font-black mt-0.5 ${balance < 0 ? "text-error" : "text-primary"}`}>
              {formatMoney(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Charts — Trésorerie */}
      {accountTab === "tresorerie" && !loading && chartData.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="medical-card p-6 lg:col-span-2">
            <h3 className="text-base font-bold text-text mb-4">Évolution Revenus / Dépenses</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e1f5" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8b7cad" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8b7cad" }} tickFormatter={(v) => formatMoney(Number(v))} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Area type="monotone" dataKey="revenue" name="Revenus" stroke="#10b981" fill="url(#gRev)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" name="Dépenses" stroke="#ef4444" fill="url(#gExp)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {pieData.length > 0 && (
            <div className="medical-card p-6">
              <h3 className="text-base font-bold text-text mb-4">Répartition Dépenses</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3}>
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {accountTab === "journal" && (
        <section className="medical-card overflow-hidden">
          <div className="border-b border-border px-6 py-4"><h3 className="font-bold">Journal comptable ({journalEntries.length} écritures)</h3></div>
          <div className="overflow-x-auto">
            <table className="premium-table w-full">
              <thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Débit</th><th>Crédit</th></tr></thead>
              <tbody>
                {journalEntries.map((e) => (
                  <tr key={e.id}>
                    <td className="text-sm">{formatDate(e.date)}</td>
                    <td>{e.label}</td>
                    <td><span className="text-xs font-bold text-muted">{e.category}</span></td>
                    <td className="text-error font-bold">{e.debit > 0 ? formatMoney(e.debit) : "—"}</td>
                    <td className="text-success font-bold">{e.credit > 0 ? formatMoney(e.credit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {accountTab === "grand_livre" && (
        <section className="medical-card overflow-hidden">
          <div className="border-b border-border px-6 py-4"><h3 className="font-bold">Grand Livre par catégorie</h3></div>
          <div className="overflow-x-auto">
            <table className="premium-table w-full">
              <thead><tr><th>Compte / Catégorie</th><th>Total Débit</th><th>Total Crédit</th><th>Solde</th></tr></thead>
              <tbody>
                {Object.entries(ledgerByCategory).map(([cat, vals]) => (
                  <tr key={cat}>
                    <td className="font-bold">{cat}</td>
                    <td className="text-error">{formatMoney(vals.debit)}</td>
                    <td className="text-success">{formatMoney(vals.credit)}</td>
                    <td className="font-black">{formatMoney(vals.credit - vals.debit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {accountTab === "bilan" && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="glass-card p-6">
            <h3 className="font-bold text-success mb-4">Actif</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Trésorerie (caisse)</span><span className="font-bold">{formatMoney(totalAssets)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-black"><span>Total Actif</span><span>{formatMoney(totalAssets)}</span></div>
            </div>
          </section>
          <section className="glass-card p-6">
            <h3 className="font-bold text-error mb-4">Passif</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Dettes / Déficit</span><span className="font-bold">{formatMoney(totalLiabilities)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-black"><span>Total Passif</span><span>{formatMoney(totalLiabilities)}</span></div>
            </div>
          </section>
        </div>
      )}

      {accountTab === "resultat" && (
        <section className="glass-card p-6">
          <h3 className="font-bold mb-6">Compte de Résultat — Période sélectionnée</h3>
          <div className="space-y-3 max-w-lg">
            <div className="flex justify-between text-sm"><span className="text-muted">Produits (recettes)</span><span className="font-bold text-success">{formatMoney(totalRevenue)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted">Charges (dépenses)</span><span className="font-bold text-error">({formatMoney(totalExpenses)})</span></div>
            <div className="flex justify-between border-t-2 border-border pt-3 text-lg font-black">
              <span>Résultat net</span>
              <span className={balance >= 0 ? "text-success" : "text-error"}>{formatMoney(balance)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Expenses Table — Trésorerie only */}
      {accountTab === "tresorerie" && (
      <section className="medical-card overflow-hidden">
        <div className="border-b border-border bg-surface px-6 py-4">
          <h3 className="font-bold text-text">Dépenses enregistrées ({expenses.length})</h3>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">{Array.from({ length: 4 }).map((_, i) => <div className="skeleton h-14" key={i} />)}</div>
        ) : expenses.length === 0 ? (
          <div className="p-12"><EmptyState title="Aucune dépense sur la période" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Montant</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-soft transition-colors">
                    <td className="px-6 py-3.5 text-text font-medium">{e.description}</td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-bold text-muted">{e.category}</span>
                    </td>
                    <td className="px-6 py-3.5 font-black text-error">{formatMoney(e.amount)}</td>
                    <td className="px-6 py-3.5 text-sm text-muted">{formatDate(e.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="medical-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-text">Enregistrer une Dépense</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-text"><X size={20} /></button>
            </div>
            <form onSubmit={saveExpense} className="space-y-4">
              <label className="block">
                <span className="label">Description *</span>
                <input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Achat de seringues 5ml" required />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">Catégorie</span>
                  <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Service</span>
                  <select className="input-field" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                    {SERVICE_CATEGORIES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Montant (CDF) *</span>
                  <input className="input-field" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </label>
                <label className="block">
                  <span className="label">Date</span>
                  <input className="input-field" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </label>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer la Dépense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
