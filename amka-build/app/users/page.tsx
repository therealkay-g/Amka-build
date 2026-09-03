"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, Search, RefreshCw, Edit3, Shield,
  ShieldOff, UserCheck, X, Users, Lock, Trash2, AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { ALL_ROLES } from "@/lib/roles";
import type { Profile, UserRole } from "@/lib/types";
import { displayRole, initials, formatDate } from "@/lib/utils";

const ROLE_TONE: Record<UserRole, "primary" | "success" | "warning" | "neutral" | "error" | "secondary"> = {
  ADMIN: "error",
  RECEPTIONIST: "success",
  PERCEPTEUR: "warning",
  MEDECIN_DIRECTEUR: "primary",
  MEDECIN_1: "primary",
  MEDECIN_2: "primary",
  MEDECIN_3: "primary",
  MEDECIN_4: "primary",
  ORTHOPEDISTE: "primary",
  PSYCHIATRE: "secondary",
  LABORANTIN: "neutral",
  TECHNICIEN_EG: "neutral",
  TECHNICIEN_ECG: "neutral",
  RADIOLOGUE: "neutral",
  KINESITHERAPEUTE: "success",
  CHIRURGIEN: "primary",
  INFIRMIER: "success",
  PHARMACIEN: "neutral",
  COMPTABLE: "neutral",
  CAISSIER: "warning",
};

type ModalMode = "edit" | "create" | "delete" | null;

const emptyCreateForm = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: "RECEPTIONIST" as UserRole,
};

export default function UsersPage() {
  const [accessDenied, setAccessDenied] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "", role: "RECEPTIONIST" as UserRole });
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccessDenied(true); setLoading(false); return; }
      // Vérifier le rôle depuis le user_metadata
      const role = user.user_metadata?.role || "RECEPTIONIST";
      if (role !== "ADMIN") { setAccessDenied(true); setLoading(false); }
    }
    void checkAccess();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/users", {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`
      }
    });
    if (!res.ok) {
      const payload = await res.json();
      setToast({ tone: "error", message: payload.error ?? "Erreur lors du chargement des utilisateurs" });
      setLoading(false);
      return;
    }
    const data = await res.json();
    // Filtrer les utilisateurs en fonction de la query
    const filtered = debouncedQuery.trim() 
      ? data.filter((user: Profile) => 
        user.first_name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        user.last_name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedQuery.toLowerCase()))
      : data;
    setUsers(filtered);
    setLoading(false);
  }, [debouncedQuery]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  function openCreate() {
    setCreateForm(emptyCreateForm);
    setModalMode("create");
  }

  function openEdit(user: Profile) {
    setSelected(user);
    setForm({ email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role });
    setModalMode("edit");
  }
  function closeModal() { setModalMode(null); setSelected(null); }

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/users?userId=${encodeURIComponent(selected.id)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(form),
    });
    const payload = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setToast({ tone: "error", message: payload.error ?? "Mise à jour impossible" });
      return;
    }
    setToast({ tone: "success", message: "Profil mis à jour avec succès." });
    closeModal();
    void fetchUsers();
  }

  async function saveCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(createForm),
    });
    const payload = (await res.json()) as { error?: string; ok?: boolean };
    setSaving(false);
    if (!res.ok) {
      setToast({ tone: "error", message: payload.error ?? "Création impossible" });
      return;
    }
    setToast({ tone: "success", message: "Compte créé avec succès." });
    closeModal();
    void fetchUsers();
  }

  async function toggleActive(user: Profile) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/users?userId=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`
      },
      body: JSON.stringify({ is_active: !user.is_active })
    });
    const payload = await res.json();
    if (!res.ok) {
      setToast({ tone: "error", message: payload.error ?? "Erreur lors du changement de statut" });
      return;
    }
    setToast({ tone: "success", message: user.is_active ? "Compte désactivé." : "Compte réactivé." });
    void fetchUsers();
  }

  function openDelete(user: Profile) {
    setSelected(user);
    setModalMode("delete");
  }

  async function deleteUser() {
    if (!selected) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    console.log("[deleteUser] session:", session, "access_token:", session?.access_token);
    const res = await fetch(`/api/users?userId=${encodeURIComponent(selected.id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
    });
    const payload = (await res.json()) as { error?: string; ok?: boolean };
    setSaving(false);
    if (!res.ok) {
      setToast({ tone: "error", message: payload.error ?? "Suppression impossible" });
      return;
    }
    setToast({ tone: "success", message: "Utilisateur supprimé avec succès." });
    closeModal();
    void fetchUsers();
  }

  const activeCount = users.filter((u) => u.is_active).length;

  if (accessDenied) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-error/10 text-error">
            <Lock size={40} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-text">Accès Refusé</h2>
            <p className="text-muted max-w-md">
              La gestion des utilisateurs est réservée exclusivement aux administrateurs.
            </p>
          </div>
          <Link href="/dashboard" className="btn-primary">
            Retour au tableau de bord
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Administration</p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Gestion des Utilisateurs</h2>
          <p className="mt-1 text-muted text-sm">Créez des comptes, gérez les rôles et les droits d&apos;accès aux modules.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Créer un compte
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="medical-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Users className="text-primary" size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Total</p>
            <p className="text-xl font-black text-text">{users.length}</p>
          </div>
        </div>
        <div className="medical-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
            <UserCheck className="text-success" size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Actifs</p>
            <p className="text-xl font-black text-text">{activeCount}</p>
          </div>
        </div>
        <div className="medical-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
            <ShieldOff className="text-error" size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Inactifs</p>
            <p className="text-xl font-black text-text">{users.length - activeCount}</p>
          </div>
        </div>
      </div>

      <section className="medical-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border bg-surface p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-surface-soft border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition text-sm text-text placeholder:text-muted/70"
              placeholder="Rechercher par nom ou email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button onClick={() => void fetchUsers()} className="btn-secondary flex items-center gap-2 text-xs">
            <RefreshCw size={13} /> Actualiser
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">{Array.from({ length: 6 }).map((_, i) => <div className="skeleton h-16" key={i} />)}</div>
        ) : users.length === 0 ? (
          <div className="p-12"><EmptyState title="Aucun utilisateur trouvé" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-4">Utilisateur</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Rôle</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Inscrit le</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-surface-soft transition-colors ${!user.is_active ? "opacity-50" : ""}`}>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xs font-black">
                          {initials(user.first_name, user.last_name)}
                        </div>
                        <div>
                          <p className="font-bold text-text">{user.first_name} {user.last_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted">{user.email}</td>
                    <td className="px-6 py-3.5">
                      <Badge tone={ROLE_TONE[user.role]}>{displayRole(user.role)}</Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tone={user.is_active ? "success" : "error"}>
                        {user.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted">{formatDate(user.created_at)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted hover:border-primary hover:text-primary transition-all"
                          title="Modifier le rôle"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => void toggleActive(user)}
                          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                            user.is_active
                              ? "border-border text-muted hover:border-error hover:text-error"
                              : "border-border text-muted hover:border-success hover:text-success"
                          }`}
                          title={user.is_active ? "Désactiver" : "Réactiver"}
                        >
                          {user.is_active ? <ShieldOff size={13} /> : <Shield size={13} />}
                        </button>
                        <button
                          onClick={() => openDelete(user)}
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted hover:border-error hover:text-error transition-all"
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-border bg-surface-soft px-6 py-3">
          <p className="text-xs text-muted font-semibold">{users.length} utilisateur(s) · {activeCount} actifs</p>
        </div>
      </section>

      {modalMode === "edit" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="medical-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-text">Modifier le Profil</h3>
              <button onClick={closeModal} className="text-muted hover:text-text"><X size={20} /></button>
            </div>
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-surface-soft border border-border">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xl font-black">
                {initials(selected.first_name, selected.last_name)}
              </div>
              <div>
                <p className="font-bold text-text">{selected.email}</p>
                <p className="text-xs text-muted mt-0.5">{displayRole(selected.role)}</p>
              </div>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <label className="block">
                <span className="label">Adresse email</span>
                <input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">Prénom</span>
                  <input className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                </label>
                <label className="block">
                  <span className="label">Nom</span>
                  <input className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                </label>
              </div>
              <label className="block">
                <span className="label">Rôle</span>
                <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                  {ALL_ROLES.map((r) => <option key={r} value={r}>{displayRole(r)}</option>)}
                </select>
              </label>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : "Mettre à Jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalMode === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="medical-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-text">Créer un compte</h3>
              <button onClick={closeModal} className="text-muted hover:text-text"><X size={20} /></button>
            </div>
            <form onSubmit={saveCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">Prénom</span>
                  <input className="input-field" value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} required />
                </label>
                <label className="block">
                  <span className="label">Nom</span>
                  <input className="input-field" value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} required />
                </label>
              </div>
              <label className="block">
                <span className="label">Email</span>
                <input className="input-field" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
              </label>
              <label className="block">
                <span className="label">Mot de passe</span>
                <input className="input-field" type="password" minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required />
              </label>
              <label className="block">
                <span className="label">Rôle</span>
                <select className="input-field" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}>
                  {ALL_ROLES.map((r) => <option key={r} value={r}>{displayRole(r)}</option>)}
                </select>
              </label>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? "Création..." : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalMode === "delete" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="medical-card w-full max-w-md p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-text">Supprimer l'utilisateur ?</h3>
                <p className="text-sm text-muted">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-surface-soft border border-border">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xl font-black">
                {initials(selected.first_name, selected.last_name)}
              </div>
              <div>
                <p className="font-bold text-text">{selected.first_name} {selected.last_name}</p>
                <p className="text-xs text-muted">{selected.email}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
              <button 
                className="btn-primary bg-error hover:bg-error/90 border-error" 
                onClick={() => void deleteUser()} 
                disabled={saving}
              >
                {saving ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
