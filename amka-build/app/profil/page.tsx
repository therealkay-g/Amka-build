"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { User, Lock, Camera, History, Activity, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Profile, UserActivity, AuditLog, UserRole } from "@/lib/types";
import { displayRole, formatDate, formatTime, initials } from "@/lib/utils";
import { toggleTheme, getTheme } from "@/components/providers/ThemeProvider";
import { logActivity } from "@/lib/audit";
import { VocalSettingsPanel } from "@/components/settings/VocalSettingsPanel";

export default function ProfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [history, setHistory] = useState<AuditLog[]>([]);
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", email: "" });
  const [pwForm, setPwForm] = useState({ next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setThemeState(getTheme());
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const meta = user.user_metadata ?? {};
      
      // On charge l'avatar depuis localStorage
      let avatarUrl: string | null = null;
      try {
        const savedAvatar = localStorage.getItem(`avatar-${user.id}`);
        if (savedAvatar) {
          avatarUrl = savedAvatar;
        }
      } catch (e) {
        console.error("Erreur lors du chargement de l'avatar depuis localStorage:", e);
      }
      
      const { data: dbProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const prof: Profile = dbProfile
        ? { ...(dbProfile as Profile), avatar_url: avatarUrl ?? (dbProfile as Profile).avatar_url ?? null }
        : {
            id: user.id,
            email: user.email ?? "",
            first_name: (meta.first_name as string) || "Utilisateur",
            last_name: (meta.last_name as string) || "AMKA",
            role: (meta.role as UserRole) || "RECEPTIONIST",
            is_active: true,
            created_at: user.created_at ?? new Date().toISOString(),
            phone: (meta.phone as string) || null,
            avatar_url: avatarUrl,
            theme_preference: null,
          };
      
      setProfile(prof);
      setForm({ 
        first_name: prof.first_name, 
        last_name: prof.last_name, 
        phone: prof.phone ?? "",
        email: prof.email
      });

      // Charger les activités et l'historique
      const [{ data: acts }, { data: logs }] = await Promise.all([
        supabase.from("user_activities").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("audit_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      setActivities((acts ?? []) as UserActivity[]);
      setHistory((logs ?? []) as AuditLog[]);
    }
    void load();
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    
    const { error: updateError } = await supabase.auth.updateUser({
      email: form.email.trim(),
      data: {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
        role: profile.role,
        is_active: true,
      },
    });

    if (updateError) {
      setSaving(false);
      setToast({ tone: "error", message: updateError.message });
      return;
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
      })
      .eq("id", profile.id);

    setSaving(false);
    if (dbError) {
      console.warn("Erreur mise à jour profiles table:", dbError.message);
    }

    setProfile({
      ...profile,
      email: form.email.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim() || null,
    });

    setToast({ tone: "success", message: "Profil mis à jour." });
    await logActivity({ action: "Mise à jour profil", module: "profil" });
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setToast({ tone: "error", message: "Les mots de passe ne correspondent pas." });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    if (error) setToast({ tone: "error", message: error.message });
    else {
      setToast({ tone: "success", message: "Mot de passe modifié." });
      setPwForm({ next: "", confirm: "" });
    }
  }

  function handleThemeToggle() {
    const next = toggleTheme();
    setThemeState(next);
  }

  async function uploadAvatar(file: File) {
    if (!profile) return;
    console.log("📸 Début de l'upload de l'avatar...");
    setUploading(true);
    
    // Vérifier la taille du fichier (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploading(false);
      setToast({ tone: "error", message: "La photo ne doit pas dépasser 2MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      console.log("✅ Photo chargée en data URL");
      
      // On stocke l'avatar dans localStorage au lieu de user_metadata pour éviter l'erreur 431
      localStorage.setItem(`avatar-${profile.id}`, dataUrl);
      
      // Mettre à jour l'état local immédiatement
      setProfile({
        ...profile,
        avatar_url: dataUrl,
      });
      
      setUploading(false);
      setToast({ tone: "success", message: "Photo de profil mise à jour !" });
    };
    
    reader.onerror = (error) => {
      console.error("❌ Erreur lors de la lecture du fichier:", error);
      setUploading(false);
      setToast({ tone: "error", message: "Erreur lors de la lecture de la photo." });
    };
    
    reader.readAsDataURL(file);
  }

  return (
    <AppShell>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      <PageHeader title="Mon Profil" subtitle="Photo, mot de passe, activités et préférences" icon={User} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-6 text-center animate-fade-in">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/10 text-2xl font-black text-primary">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-full object-cover" />
            ) : (
              initials(profile?.first_name ?? "", profile?.last_name ?? "")
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary mt-4 mx-auto text-xs">
            <Camera size={14} /> {uploading ? "Envoi..." : "Changer la photo"}
          </button>
          <h2 className="mt-4 text-xl font-bold">{profile?.first_name} {profile?.last_name}</h2>
          <p className="text-sm text-muted">{displayRole(profile?.role)}</p>
          <p className="text-xs text-muted mt-1">{profile?.email}</p>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={(e) => void saveProfile(e)} className="glass-card p-6 space-y-4">
            <h3 className="font-bold flex items-center gap-2"><User size={18} className="text-primary" /> Informations</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block"><span className="label">Prénom</span><input className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></label>
              <label className="block"><span className="label">Nom</span><input className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></label>
              <label className="block"><span className="label">Téléphone</span><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+243..." /></label>
              <label className="block"><span className="label">Email</span><input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "..." : "Sauvegarder"}</button>
          </form>

          <form onSubmit={(e) => void changePassword(e)} className="glass-card p-6 space-y-4">
            <h3 className="font-bold flex items-center gap-2"><Lock size={18} className="text-primary" /> Mot de passe</h3>
            <input className="input-field" type="password" placeholder="Nouveau mot de passe" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} minLength={8} required />
            <input className="input-field" type="password" placeholder="Confirmer" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required />
            <button type="submit" className="btn-primary">Modifier le mot de passe</button>
          </form>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
                Préférences de thème
              </h3>
              <button onClick={handleThemeToggle} className="btn-secondary">
                Mode {theme === "dark" ? "clair" : "sombre"}
              </button>
            </div>

            {profile && <VocalSettingsPanel userId={profile.id} />}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="font-bold flex items-center gap-2 mb-4"><Activity size={18} className="text-primary" /> Activités récentes</h3>
          <div className="space-y-3">
            {activities.length === 0 ? <p className="text-sm text-muted">Aucune activité.</p> : activities.map((a) => (
              <div key={a.id} className="rounded-xl bg-surface-soft p-3 text-sm">
                <p className="font-semibold">{a.action}</p>
                <p className="text-xs text-muted">{a.module} — {formatDate(a.created_at)} {formatTime(a.created_at)}</p>
              </div>
            ))}
          </div>
          <Link href="/activites" className="text-sm text-primary font-semibold mt-4 inline-block">Voir tout →</Link>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold flex items-center gap-2 mb-4"><History size={18} className="text-primary" /> Historique</h3>
          <div className="space-y-3">
            {history.length === 0 ? <p className="text-sm text-muted">Aucun historique.</p> : history.map((h) => (
              <div key={h.id} className="rounded-xl bg-surface-soft p-3 text-sm">
                <p className="font-semibold">{h.action} — {h.module}</p>
                <p className="text-xs text-muted">{formatDate(h.created_at)} {formatTime(h.created_at)}</p>
              </div>
            ))}
          </div>
          <Link href="/historique" className="text-sm text-primary font-semibold mt-4 inline-block">Voir tout →</Link>
        </div>
      </div>
    </AppShell>
  );
}
