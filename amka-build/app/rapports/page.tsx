"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Calendar, RefreshCw } from "lucide-react";
import {
  Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate, todayIsoDate } from "@/lib/utils";
import { exportToCsv, exportToPdf, exportToExcel } from "@/lib/export";
import { logAudit } from "@/lib/audit";
import { CENTER_INFO } from "@/lib/constants";
import { useRealtimeTables } from "@/lib/hooks/useRealtimeTable";

type Period = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export default function RapportsPage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(todayIsoDate());
  const [payments, setPayments] = useState<Array<{ montant: number; type: string; created_at: string; status: string }>>([]);
  const [expenses, setExpenses] = useState<Array<{ amount: number; category: string; date: string }>>([]);
  const [consultations, setConsultations] = useState<Array<{ id: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const range = useMemo(() => {
    const end = endDate ? new Date(`${endDate}T23:59:59`) : new Date();
    const start = new Date(end);
    if (period === "daily") start.setHours(0, 0, 0, 0);
    else if (period === "weekly") start.setDate(start.getDate() - 6);
    else if (period === "monthly") start.setMonth(start.getMonth() - 1);
    else if (period === "yearly") start.setFullYear(start.getFullYear() - 1);
    else if (period === "custom" && startDate) return { start: new Date(`${startDate}T00:00:00`), end };
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, [period, startDate, endDate]);

  const [revenue, setRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balance, setBalance] = useState(0);
  const [chartData, setChartData] = useState<{ day: string; value: number }[]>([]);

  useEffect(() => {
    void fetchData();
  }, [period, startDate, endDate]);


  async function fetchData() {
    setLoading(true);
    try {
      const { start, end } = range;
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      // 1. Fetch Payments (Recettes)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("montant, created_at, status")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .eq("status", "COMPLETED");

      if (paymentsError) throw paymentsError;

      // 2. Fetch Expenses (Dépenses)
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("amount, category, date")
        .gte("date", start.toISOString().split("T")[0])
        .lte("date", end.toISOString().split("T")[0]);

      if (expensesError) throw expensesError;

      // 3. Fetch Consultations Count
      const { count: consultationsCount, error: consultError } = await supabase
        .from("consultations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startIso)
        .lte("created_at", endIso);

      if (consultError) throw consultError;

      // Calculations
      const rev = paymentsData.reduce((acc: number, p: any) => acc + (p.montant || 0), 0);
      const exp = expensesData.reduce((acc: number, e: any) => acc + (e.amount || 0), 0);

      // Chart Data: Group payments by day
      const groupedPayments: Record<string, number> = {};
      paymentsData.forEach((p: any) => {
        const day = p.created_at.split("T")[0];
        groupedPayments[day] = (groupedPayments[day] || 0) + (p.montant || 0);
      });

      const sortedChartData = Object.entries(groupedPayments)
        .map(([day, value]) => ({ day, value }))
        .sort((a, b) => a.day.localeCompare(b.day));

      setPayments(paymentsData);
      setExpenses(expensesData);
      setConsultations(new Array(consultationsCount || 0).fill({})); // Maintain state type if needed
      setRevenue(rev);
      setTotalExpenses(exp);
      setBalance(rev - exp);
      setChartData(sortedChartData);


    } catch (err: any) {
      console.error("Fetch error:", err);
      setToast({ tone: "error", message: `Erreur lors du chargement: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  const reportRows = [
    ["Recettes", formatMoney(revenue)],
    ["Dépenses", formatMoney(totalExpenses)],
    ["Solde", formatMoney(balance)],
    ["Consultations", String(consultations.length)],
    ["Paiements", String(payments.length)],
    ["Période", `${formatDate(range.start.toISOString())} — ${formatDate(range.end.toISOString())}`],
  ];

  async function exportReport(format: "csv" | "pdf" | "excel") {
    const headers = ["Indicateur", "Valeur"];
    if (format === "csv") exportToCsv(`rapport_${period}`, headers, reportRows);
    else if (format === "pdf") await exportToPdf(`Rapport ${period}`, headers, reportRows, CENTER_INFO.name);
    else await exportToExcel(`rapport_${period}`, "Rapport", headers, reportRows);
    await logAudit({ action: "EXPORT", module: "rapports", details: { format, period } });
    setToast({ tone: "success", message: `Rapport exporté (${format.toUpperCase()}).` });
  }

  return (
    <AppShell>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      <PageHeader
        title="Rapports"
        subtitle="Rapports journaliers, hebdomadaires, mensuels, annuels et personnalisés"
        icon={FileText}
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void exportReport("csv")} className="btn-secondary"><Download size={16} /> CSV</button>
            <button onClick={() => void exportReport("pdf")} className="btn-secondary"><Download size={16} /> PDF</button>
            <button onClick={() => void exportReport("excel")} className="btn-secondary"><Download size={16} /> Excel</button>
            <button onClick={() => void fetchData()} className="btn-secondary"><RefreshCw size={16} /></button>
          </div>
        }
      />

      <div className="glass-card p-4 flex flex-wrap gap-3 items-end">
        {(["daily", "weekly", "monthly", "yearly", "custom"] as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${period === p ? "bg-primary text-white" : "bg-surface-soft text-muted hover:text-text"}`}>
            {p === "daily" ? "Journalier" : p === "weekly" ? "Hebdomadaire" : p === "monthly" ? "Mensuel" : p === "yearly" ? "Annuel" : "Personnalisé"}
          </button>
        ))}
        {period === "custom" && (
          <>
            <input type="date" className="input-field w-auto" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" className="input-field w-auto" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Recettes", value: formatMoney(revenue), tone: "text-success" },
          { label: "Dépenses", value: formatMoney(totalExpenses), tone: "text-error" },
          { label: "Solde", value: formatMoney(balance), tone: "text-primary" },
          { label: "Consultations", value: consultations.length, tone: "text-secondary" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-5 animate-fade-in">
            <p className="text-xs font-bold uppercase text-muted">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Calendar size={18} className="text-primary" /> Tendances des recettes</h3>
        {loading ? <div className="skeleton h-64" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <table className="premium-table w-full">
          <thead><tr><th>Indicateur</th><th>Valeur</th></tr></thead>
          <tbody>
            {reportRows.map(([k, v]) => (
              <tr key={k}><td className="font-semibold">{k}</td><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
