"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Search, CheckCircle, X, User, Banknote, Smartphone,
  Building2, Shield, ArrowLeft, Receipt, RefreshCw, Printer,
  LogOut, Bluetooth, BluetoothOff, ChevronDown, Check,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { logAudit, logActivity, createNotification } from "@/lib/audit";
import { processPaymentCompleted } from "@/lib/payment-sync";
import { formatMoney, formatDate } from "@/lib/utils";
import { printThermalReceipt, listPrinters, connectPrinter } from "@/lib/thermal-print";
import { Capacitor } from "@capacitor/core";
import type { Patient } from "@/lib/types";

const PAYMENT_TYPES = [
  { key: "Consultation", label: "Consultation" },
  { key: "Laboratoire", label: "Laboratoire" },
  { key: "Kinésithérapie", label: "Kinésithérapie" },
  { key: "ECG", label: "ECG" },
  { key: "EG", label: "EEG" },
  { key: "Radiologie", label: "Radiologie" },
  { key: "Chirurgie", label: "Chirurgie" },
  { key: "Hospitalisation", label: "Hospit." },
  { key: "Pharmacie", label: "Pharmacie" },
  { key: "Soins infirmiers", label: "Soins" },
  { key: "Pansement", label: "Pansement" },
  { key: "Plâtre", label: "Plâtre" },
  { key: "Forfait réadaptation", label: "Réadapt." },
];

const PAYMENT_MODES = [
  { key: "CASH", label: "Cash", icon: Banknote },
  { key: "MOBILE_MONEY", label: "Mobile $", icon: Smartphone },
  { key: "BANK_TRANSFER", label: "Virement", icon: Building2 },
  { key: "INSURANCE", label: "Assurance", icon: Shield },
];

type Screen = "search" | "payment" | "success";

export default function MobilePerceptionPage() {
  const [screen, setScreen] = useState<Screen>("search");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searching, setSearching] = useState(false);

  const [paymentType, setPaymentType] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [notes, setNotes] = useState("");

  const [todayPayments, setTodayPayments] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [showPrinterSelect, setShowPrinterSelect] = useState(false);
  const [printers, setPrinters] = useState<{ name: string; address: string }[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  const searchPatients = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setPatients([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("patients")
      .select("id, nom, prenom, numero_dossier, telephone")
      .eq("is_active", true)
      .or(`nom.ilike.%${term}%,prenom.ilike.%${term}%,numero_dossier.ilike.%${term}%`)
      .order("nom")
      .limit(10);
    setPatients((data ?? []) as Patient[]);
    setSearching(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => { if (patientQuery.trim().length >= 2) void searchPatients(patientQuery); }, 300);
    return () => window.clearTimeout(id);
  }, [patientQuery, searchPatients]);

  const loadTodayPayments = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("payments")
      .select("id, montant, type, mode_paiement, status, created_at, patients(nom, prenom, numero_dossier)")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);
    setTodayPayments(data ?? []);
  }, []);

  useEffect(() => { void loadTodayPayments(); }, [loadTodayPayments]);

  async function scanPrinters() {
    setLoadingPrinters(true);
    try {
      const devs = await listPrinters();
      setPrinters(devs);
      if (devs.length === 0) {
        setToast({ tone: "error", message: "Aucune imprimante Bluetooth appairée. Appairez-la dans les paramètres Android." });
      }
    } catch (e: any) {
      setToast({ tone: "error", message: e?.message ?? "Erreur scan imprs" });
    }
    setLoadingPrinters(false);
  }

  async function selectPrinter(address: string, name: string) {
    setLoadingPrinters(true);
    try {
      const ok = await connectPrinter(address);
      if (ok) {
        setPrinterConnected(true);
        setPrinterName(name);
        setShowPrinterSelect(false);
        setToast({ tone: "success", message: `Connecté: ${name}` });
      } else {
        setToast({ tone: "error", message: "Connexion échouée" });
      }
    } catch (e: any) {
      setToast({ tone: "error", message: e?.message ?? "Erreur connexion" });
    }
    setLoadingPrinters(false);
  }

  function selectPatient(p: Patient) {
    setSelectedPatient(p);
    setPatientQuery("");
    setPatients([]);
    setScreen("payment");
  }

  function goBack() {
    if (screen === "payment") {
      setScreen("search");
      setPaymentType("");
      setAmount("");
      setNotes("");
    } else if (screen === "success") {
      setScreen("search");
      setSelectedPatient(null);
      setPaymentType("");
      setAmount("");
      setNotes("");
      setLastPaymentId(null);
    }
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !paymentType || !amount) {
      setToast({ tone: "error", message: "Remplissez tous les champs." });
      return;
    }
    const montant = parseFloat(amount);
    if (isNaN(montant) || montant <= 0) {
      setToast({ tone: "error", message: "Montant invalide." });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.from("payments").insert({
      patient_id: selectedPatient.id,
      collected_by: user?.id ?? null,
      montant,
      type: paymentType,
      mode_paiement: paymentMode,
      status: "COMPLETED",
      notes: notes.trim() || null,
    }).select("id").single();

    if (error) {
      setSaving(false);
      setToast({ tone: "error", message: error.message });
      return;
    }

    await logAudit({ action: "CREATE", module: "perception", entityType: "payments", entityId: data?.id, details: { montant, type: paymentType } });
    await logActivity({ action: "Paiement mobile", module: "perception", details: `${selectedPatient.prenom} ${selectedPatient.nom} — ${formatMoney(montant)}` });
    await createNotification({
      type: "payment",
      title: "Paiement reçu",
      message: `${selectedPatient.prenom} ${selectedPatient.nom} — ${paymentType} — ${formatMoney(montant)}`,
      module: "perception",
      entityId: data?.id,
    });

    if (data?.id) {
      await processPaymentCompleted({ paymentId: data.id, patientId: selectedPatient.id, montant, type: paymentType });
    }

    setSaving(false);
    if (data?.id) setLastPaymentId(data.id);
    setScreen("success");
    void loadTodayPayments();
  }

  async function handlePrintReceipt() {
    if (!selectedPatient) return;
    setPrinting(true);

    try {
      const now = new Date();
      const result = await printThermalReceipt({
        receiptNumber: (lastPaymentId ?? "N/A").slice(0, 8).toUpperCase(),
        patientName: `${selectedPatient.prenom} ${selectedPatient.nom}`,
        patientDossier: selectedPatient.numero_dossier ?? "—",
        type: paymentType,
        mode: PAYMENT_MODES.find(m => m.key === paymentMode)?.label ?? paymentMode,
        amount: parseFloat(amount) || 0,
        date: formatDate(now.toISOString()),
        time: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        setToast({ tone: "success", message: "Reçu imprimé ✓" });
        void createNotification({
          type: "print",
          title: "Reçu imprimé",
          message: `Reçu ${paymentType}`,
          module: "perception",
          entityId: lastPaymentId ?? undefined,
        });
      } else {
        if (!printerConnected && isNative) {
          setShowPrinterSelect(true);
          await scanPrinters();
        } else {
          setToast({ tone: "error", message: "Impression échouée. Vérifiez l'imprimante." });
        }
      }
    } catch (err) {
      setToast({ tone: "error", message: "Erreur d'impression" });
    }

    setPrinting(false);
  }

  const totalToday = todayPayments
    .filter(p => p.status === "COMPLETED")
    .reduce((sum, p) => sum + (Number(p.montant) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col select-none">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Printer selector modal */}
      {showPrinterSelect && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowPrinterSelect(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Bluetooth size={16} className="text-primary" /> Imprimante
              </h3>
              <button onClick={() => setShowPrinterSelect(false)} className="p-1"><X size={18} /></button>
            </div>

            {printerConnected && (
              <div className="flex items-center gap-2 p-3 mb-3 rounded-xl bg-green-50 border border-green-200">
                <Check size={16} className="text-green-600" />
                <span className="text-xs font-bold text-green-700">{printerName}</span>
              </div>
            )}

            <button
              onClick={() => void scanPrinters()}
              disabled={loadingPrinters}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-2 mb-3"
            >
              <RefreshCw size={14} className={loadingPrinters ? "animate-spin" : ""} />
              {loadingPrinters ? "Recherche..." : "Scanner les imprimantes"}
            </button>

            {printers.length > 0 && (
              <div className="space-y-1.5 max-h-[30vh] overflow-y-auto">
                {printers.map(d => (
                  <button
                    key={d.address}
                    onClick={() => void selectPrinter(d.address, d.name)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-gray-100 hover:border-primary active:scale-[0.98] transition-all text-left"
                    disabled={loadingPrinters}
                  >
                    <div className="flex items-center gap-2">
                      <Printer size={16} className="text-primary" />
                      <div>
                        <p className="text-xs font-bold">{d.name}</p>
                        <p className="text-[10px] text-gray-400">{d.address}</p>
                      </div>
                    </div>
                    {printerConnected && d.name === printerName && <Check size={14} className="text-green-500" />}
                  </button>
                ))}
              </div>
            )}

            {!loadingPrinters && printers.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">
                Appuyez sur "Scanner" pour trouver les imprimantes appairées.
              </p>
            )}

            <p className="text-[10px] text-gray-400 text-center mt-3">
              Si aucune imprimante n'apparaît, appairez-la dans Paramètres Bluetooth du FlexyPOS.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-primary text-white px-3 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          {screen !== "search" && (
            <button onClick={goBack} className="p-1.5 rounded-full hover:bg-white/20 active:scale-95">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-sm font-black leading-tight">AMKA Perception</h1>
            <p className="text-[10px] text-white/70">Encaissement</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isNative && (
            <button
              onClick={() => { setShowPrinterSelect(true); void scanPrinters(); }}
              className="p-1.5 rounded-full hover:bg-white/20"
              title={printerConnected ? `Imprimante: ${printerName}` : "Connecter imprimante"}
            >
              {printerConnected ? <Bluetooth size={16} className="text-green-300" /> : <BluetoothOff size={16} />}
            </button>
          )}
          <button
            onClick={() => { setShowHistory(!showHistory); void loadTodayPayments(); }}
            className="p-1.5 rounded-full hover:bg-white/20 relative"
          >
            <Receipt size={18} />
            {todayPayments.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {todayPayments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-primary/10 px-3 py-1.5 flex justify-between text-xs">
        <span className="text-muted font-medium">Aujourd&apos;hui</span>
        <span className="text-primary font-bold">{formatMoney(totalToday)} · {todayPayments.length}</span>
      </div>

      {/* History drawer */}
      {showHistory && (
        <div className="bg-white border-b border-border p-3 max-h-[40vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-xs">Historique</h3>
            <button onClick={() => setShowHistory(false)} className="p-0.5"><X size={14} /></button>
          </div>
          {todayPayments.length === 0 ? (
            <p className="text-xs text-muted text-center py-3">Aucun paiement</p>
          ) : (
            <div className="space-y-1.5">
              {todayPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-xs font-bold">{(p.patients as any)?.prenom} {(p.patients as any)?.nom}</p>
                    <p className="text-[10px] text-muted">{p.type} · {new Date(p.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{formatMoney(Number(p.montant))}</p>
                    <Badge tone={p.status === "COMPLETED" ? "success" : "warning"} className="text-[8px]">
                      {p.status === "COMPLETED" ? "Payé" : "Attente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Screens */}
      <div className="flex-1 p-3 overflow-y-auto">

        {/* SEARCH SCREEN */}
        {screen === "search" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-muted" size={18} />
              <input
                className="w-full pl-10 pr-3 py-3 text-base rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none bg-white shadow-sm"
                placeholder="Rechercher patient..."
                value={patientQuery}
                onChange={e => setPatientQuery(e.target.value)}
                autoFocus
              />
            </div>

            {searching && <p className="text-center text-xs text-muted py-3">Recherche...</p>}

            {patients.length > 0 && (
              <div className="space-y-1.5">
                {patients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white border-2 border-gray-100 hover:border-primary active:scale-[0.98] transition-all shadow-sm text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{p.prenom} {p.nom}</p>
                        <p className="text-[11px] text-muted">{p.numero_dossier}</p>
                      </div>
                    </div>
                    <Badge tone="primary" className="text-[10px]">Choisir</Badge>
                  </button>
                ))}
              </div>
            )}

            {patientQuery.trim().length >= 2 && !searching && patients.length === 0 && (
              <div className="text-center py-8">
                <User size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-muted font-medium text-sm">Aucun patient trouvé</p>
              </div>
            )}
          </div>
        )}

        {/* PAYMENT SCREEN */}
        {screen === "payment" && selectedPatient && (
          <form onSubmit={e => void submitPayment(e)} className="space-y-3">
            <div className="bg-white rounded-xl p-3 border-2 border-primary/20 shadow-sm flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{selectedPatient.prenom} {selectedPatient.nom}</p>
                <p className="text-[11px] text-muted">{selectedPatient.numero_dossier}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-muted mb-1.5">Type *</p>
              <div className="grid grid-cols-3 gap-1.5">
                {PAYMENT_TYPES.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setPaymentType(t.key)}
                    className={`p-2 rounded-lg text-[11px] font-bold text-center border-2 transition-all active:scale-95 ${
                      paymentType === t.key
                        ? "border-primary bg-primary text-white"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-muted mb-1.5">Montant (CDF) *</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-muted">FC</span>
                <input
                  type="number"
                  className="w-full pl-10 pr-3 py-3.5 text-xl font-black rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none bg-white shadow-sm"
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  min="0"
                  step="100"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-muted mb-1.5">Mode *</p>
              <div className="grid grid-cols-2 gap-1.5">
                {PAYMENT_MODES.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setPaymentMode(m.key)}
                      className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 ${
                        paymentMode === m.key
                          ? "border-primary bg-primary text-white shadow-md"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="font-bold text-xs">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-muted mb-1.5">Notes</p>
              <input
                className="w-full p-2.5 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none bg-white text-xs"
                placeholder="Optionnel..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={saving || !paymentType || !amount}
              className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-black text-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <RefreshCw size={22} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle size={22} />
                  Encaisser {amount ? formatMoney(parseFloat(amount)) : ""}
                </>
              )}
            </button>
          </form>
        )}

        {/* SUCCESS SCREEN */}
        {screen === "success" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black text-green-600">Paiement reçu !</h2>
              <p className="text-sm text-muted mt-1">{selectedPatient?.prenom} {selectedPatient?.nom}</p>
              <p className="text-2xl font-black mt-1">{amount ? formatMoney(parseFloat(amount)) : ""}</p>
              <p className="text-xs text-muted mt-1">{paymentType} · {PAYMENT_MODES.find(m => m.key === paymentMode)?.label}</p>
            </div>

            {/* Print receipt */}
            <button
              onClick={() => void handlePrintReceipt()}
              disabled={printing}
              className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {printing ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <>
                  <Printer size={18} />
                  {printerConnected ? `Imprimer (${printerName})` : "Imprimer le reçu"}
                </>
              )}
            </button>

            {/* New payment */}
            <button
              onClick={() => { setScreen("search"); setSelectedPatient(null); setPaymentType(""); setAmount(""); setNotes(""); setLastPaymentId(null); }}
              className="w-full py-3.5 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Receipt size={16} />
              Nouveau paiement
            </button>

            <button
              onClick={() => {
                if (isNative) {
                  const App = (window as any).Capacitor?.Plugins?.App;
                  App?.exitApp?.();
                } else {
                  window.location.href = "/";
                }
              }}
              className="w-full py-3 rounded-xl border border-gray-200 bg-white text-muted font-medium text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut size={14} />
              Quitter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
