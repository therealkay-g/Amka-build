"use client";

import { FormEvent, useEffect, useState } from "react";
import { User, Lock, Bell, Save, LayoutGrid, ArrowUpRight, Building2, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { displayRole } from "@/lib/utils";
import { CENTER_INFO } from "@/lib/constants";
import { getTheme, toggleTheme } from "@/components/providers/ThemeProvider";
import { loadNotificationPrefs, saveNotificationPrefs, type NotificationPrefs } from "@/lib/preferences";
import { VocalSettingsPanel } from "@/components/settings/VocalSettingsPanel";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "" });
  const [pwForm, setPwForm] = useState({ next: "", confirm: "" });
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    stockAlerts: true,
    consultationAlerts: true,
    dailyFinance: false,
  });
  const [centerForm, setCenterForm] = useState<{ center_name: string; center_phone: string; center_address: string; center_email: string }>({
    center_name: CENTER_INFO.name,
    center_phone: CENTER_INFO.phone,
    center_address: CENTER_INFO.address,
    center_email: CENTER_INFO.email,
  });

  useEffect(() => {
    setThemeState(getTheme());
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setProfile(data as Profile);
        setForm({ email: data.email, first_name: data.first_name, last_name: data.last_name });
        setNotifPrefs(loadNotificationPrefs(data.id));
      }
      const { data: settings } = await supabase.from("center_settings").select("key, value").in("key", ["center_name", "center_phone", "center_address", "center_email"]);
      if (settings?.length) {
        const map = Object.fromEntries(settings.map((s: { key: string; value: string }) => [s.key, s.value]));
        setCenterForm((prev) => ({ ...prev, ...map }));
      }
    }
    void load();
  }, []);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);

    // Si l'email a changé, mettre à jour dans l'auth Supabase
    if (form.email !== profile.email) {
      const { error: authError } = await supabase.auth.updateUser({
        email: form.email.trim(),
      });
      if (authError) {
        setSaving(false);
        setToast({ tone: "error", message: authError.message });
        return;
      }
    }

    // Mettre à jour le profil dans la base de données
    const { error } = await supabase
      .from("profiles")
      .update({ 
        email: form.email.trim(), 
        first_name: form.first_name, 
        last_name: form.last_name 
      })
      .eq("id", profile.id);

    setSaving(false);
    setToast(
      error
        ? { tone: "error", message: error.message }
        : { tone: "success", message: "Profil mis à jour avec succès !" },
    );
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setToast({ tone: "error", message: "Les mots de passe ne correspondent pas." });
      return;
    }
    if (pwForm.next.length < 8) {
      setToast({
        tone: "error",
        message: "Le mot de passe doit contenir au moins 8 caractères.",
      });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    setChangingPassword(false);
    if (error) {
      setToast({ tone: "error", message: error.message });
      return;
    }
    setToast({ tone: "success", message: "Mot de passe modifié avec succès." });
    setPwForm({ next: "", confirm: "" });
  }

  const isAdmin = profile?.role === "ADMIN";

  async function saveCenterSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    for (const [key, value] of Object.entries(centerForm)) {
      await supabase.from("center_settings").upsert({ key, value, category: "general" }, { onConflict: "key" });
    }
    setSaving(false);
    setToast({ tone: "success", message: "Informations du centre mises à jour." });
  }

  function handleThemeToggle() {
    setThemeState(toggleTheme());
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Page header */}
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Mon Compte
        </p>
        <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Paramètres</h2>
        <p className="mt-1 text-muted text-sm">
          {CENTER_INFO.name} — {CENTER_INFO.phone}
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">

        {/* ── Informations personnelles ── */}
        <section className="medical-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <User size={18} className="text-primary" />
            Informations Personnelles
          </h3>
          {/* Current role badge */}
          {profile && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-soft px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Rôle :</span>
              <span className="text-xs font-bold text-text">{displayRole(profile.role)}</span>
            </div>
          )}
          <form onSubmit={saveProfile} className="space-y-4">
            <label className="block">
              <span className="label">Email</span>
              <input
                className="input-field"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Prénom</span>
                <input
                  className="input-field"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="label">Nom de Famille</span>
                <input
                  className="input-field"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                className="btn-primary flex items-center gap-2"
                type="submit"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? "Enregistrement..." : "Sauvegarder"}
              </button>
            </div>
          </form>
        </section>

        {/* ── Changer le mot de passe ── */}
        <section className="medical-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <Lock size={18} className="text-primary" />
            Changer le Mot de Passe
          </h3>
          <form onSubmit={changePassword} className="space-y-4">
            <label className="block">
              <span className="label">Nouveau Mot de Passe</span>
              <input
                className="input-field"
                type="password"
                value={pwForm.next}
                onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                placeholder="Minimum 8 caractères"
                required
                minLength={8}
              />
            </label>
            <label className="block">
              <span className="label">Confirmer le Mot de Passe</span>
              <input
                className="input-field"
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                placeholder="Répétez le nouveau mot de passe"
                required
              />
            </label>
            {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
              <p className="text-xs text-error font-semibold">
                ⚠ Les mots de passe ne correspondent pas.
              </p>
            )}
            {pwForm.next && pwForm.confirm && pwForm.next === pwForm.confirm && (
              <p className="text-xs text-success font-semibold">
                ✓ Les mots de passe correspondent.
              </p>
            )}
            <div className="flex justify-end">
              <button
                className="btn-primary flex items-center gap-2"
                type="submit"
                disabled={changingPassword}
              >
                <Lock size={16} />
                {changingPassword ? "Modification..." : "Changer le mot de passe"}
              </button>
            </div>
          </form>
        </section>

        <section className="glass-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            {theme === "dark" ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
            Apparence
          </h3>
          <button type="button" onClick={handleThemeToggle} className="btn-secondary">
            Activer le mode {theme === "dark" ? "clair" : "sombre"}
          </button>
        </section>

        {isAdmin && (
          <section className="glass-card p-6 border-primary/20">
            <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              Informations du Centre
            </h3>
            <form onSubmit={saveCenterSettings} className="space-y-4">
              <label className="block"><span className="label">Nom du centre</span><input className="input-field" value={centerForm.center_name} onChange={(e) => setCenterForm({ ...centerForm, center_name: e.target.value })} /></label>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block"><span className="label">Téléphone</span><input className="input-field" value={centerForm.center_phone} onChange={(e) => setCenterForm({ ...centerForm, center_phone: e.target.value })} /></label>
                <label className="block"><span className="label">Email</span><input className="input-field" type="email" value={centerForm.center_email} onChange={(e) => setCenterForm({ ...centerForm, center_email: e.target.value })} /></label>
              </div>
              <label className="block"><span className="label">Adresse</span><input className="input-field" value={centerForm.center_address} onChange={(e) => setCenterForm({ ...centerForm, center_address: e.target.value })} /></label>
              <button type="submit" className="btn-primary" disabled={saving}>Enregistrer le centre</button>
            </form>
          </section>
        )}

        {/* ── Préférences interface ── */}
        <section className="glass-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            Préférences (Interface)
          </h3>
          <div className="space-y-3">
            {([
              { key: "stockAlerts" as const, label: "Alertes de stock faible en pharmacie" },
              { key: "consultationAlerts" as const, label: "Notifications de nouvelles consultations" },
              { key: "dailyFinance" as const, label: "Résumé financier quotidien" },
            ]).map((pref) => (
              <label
                key={pref.key}
                className="flex items-center justify-between rounded-xl border border-border bg-surface-soft px-4 py-3 cursor-pointer hover:bg-surface-mid transition-colors"
              >
                <span className="text-sm font-semibold text-text">{pref.label}</span>
                <input
                  type="checkbox"
                  checked={notifPrefs[pref.key]}
                  onChange={(e) => {
                    const next = { ...notifPrefs, [pref.key]: e.target.checked };
                    setNotifPrefs(next);
                    if (profile) saveNotificationPrefs(profile.id, next);
                  }}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
          </div>
        </section>

        {/* ── Annonces vocales du médecin ── */}
        {profile && <VocalSettingsPanel userId={profile.id} />}

        {/* ── Section Admin — visible uniquement pour ADMIN ── */}
        {isAdmin && (
          <section className="medical-card p-6 border-primary/20">
            <h3 className="text-base font-bold text-text mb-1 flex items-center gap-2">
              <LayoutGrid size={18} className="text-primary" />
              Administration Système
            </h3>
            <p className="text-xs text-muted mb-5">
              Ces options sont réservées à l&apos;administrateur de la plateforme.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  href: "/admin",
                  label: "Tableau de Bord Admin",
                  desc: "Statistiques globales, audit et santé du système",
                },
                {
                  href: "/users",
                  label: "Gestion des Utilisateurs",
                  desc: "Créer, modifier et gérer les comptes et rôles",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 hover:bg-primary/10 transition-all group"
                >
                  <div>
                    <p className="text-sm font-bold text-text group-hover:text-primary transition-colors">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="shrink-0 mt-0.5 text-muted group-hover:text-primary transition-colors"
                  />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
