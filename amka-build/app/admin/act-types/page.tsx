"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Save, RefreshCw, Search, Activity, X, AlertCircle } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/utils";

interface MedicalActType {
  id: string;
  name: string;
  category: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

export default function ActTypesPage() {
  const [acts, setActs] = useState<MedicalActType[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newAct, setNewAct] = useState({
    name: "",
    category: "CONSULTATION",
    price: 0,
    is_active: true
  });

  const loadActs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("medical_act_types")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setActs(data || []);
    } catch (e: any) {
      setToast({ tone: "error", message: "Erreur chargement des actes: " + e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadActs(); }, [loadActs]);

  async function handleAddAct() {
    try {
      const { error } = await supabase
        .from("medical_act_types")
        .insert([newAct]);

      if (error) throw error;
      setToast({ tone: "success", message: "Acte ajouté avec succès !" });
      setIsAdding(false);
      setNewAct({ name: "", category: "CONSULTATION", price: 0, is_active: true });
      void loadActs();
    } catch (e: any) {
      setToast({ tone: "error", message: "Erreur lors de l'ajout: " + e.message });
    }
  }

  async function toggleActStatus(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from("medical_act_types")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      setToast({ tone: "success", message: "Statut mis à jour." });
      void loadActs();
    } catch (e: any) {
      setToast({ tone: "error", message: e.message });
    }
  }

  async function deleteAct(id: string) {
    if (!confirm("Voulez-vous vraiment supprimer cet acte ?")) return;
    try {
      const { error } = await supabase
        .from("medical_act_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setToast({ tone: "success", message: "Acte supprimé." });
      void loadActs();
    } catch (e: any) {
      setToast({ tone: "error", message: e.message });
    }
  }

  const filteredActs = acts.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppShell>
      <div className="p-6 animate-fade-in space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text">Catalogue des Actes Médicaux</h1>
            <p className="text-sm text-muted">Définissez les prix et les catégories des actes pour le workflow de prescription</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Ajouter un acte
          </button>
        </div>

        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

        {isAdding && (
          <div className="medical-card p-6 border-primary/30 bg-primary/5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text flex items-center gap-2">
                <Plus size={18} className="text-primary" /> Nouvel Acte
              </h3>
              <button onClick={() => setIsAdding(false)} className="text-muted hover:text-error">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="label">Nom de l'acte</span>
                <input
                  className="input-field"
                  value={newAct.name}
                  onChange={e => setNewAct({...newAct, name: e.target.value})}
                  placeholder="ex: Infiltration Gênou"
                />
              </label>
              <label className="block">
                <span className="label">Catégorie (MAJUSCULES)</span>
                <input
                  className="input-field"
                  value={newAct.category}
                  onChange={e => setNewAct({...newAct, category: e.target.value.toUpperCase()})}
                  placeholder="ex: INFILTRATION"
                />
              </label>
              <label className="block">
                <span className="label">Prix (CFA)</span>
                <input
                  className="input-field"
                  type="number"
                  value={newAct.price}
                  onChange={e => setNewAct({...newAct, price: Number(e.target.value)})}
                />
              </label>
              <div className="flex justify-end gap-3 md:col-span-3 mt-2">
                <button onClick={() => setIsAdding(false)} className="btn-secondary">Annuler</button>
                <button onClick={handleAddAct} className="btn-primary flex items-center gap-2">
                  <Save size={16} /> Enregistrer l'acte
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="input-field pl-10 w-full"
              placeholder="Rechercher un acte ou une catégorie..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={loadActs} className="btn-secondary p-2" title="Actualiser">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredActs.map(act => (
              <div key={act.id} className="medical-card p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-surface-soft text-primary">
                    <Activity size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-text truncate">{act.name}</p>
                      <Badge tone={act.is_active ? "success" : "error"} className="text-[9px]">{act.is_active ? "Actif" : "Inactif"}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">{act.category}</span>
                      <span className="text-xs font-bold text-text">{formatMoney(act.price)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActStatus(act.id, act.is_active)}
                    className={`p-2 rounded-lg transition-colors ${act.is_active ? "text-muted hover:text-primary hover:bg-primary/10" : "text-error hover:bg-error/10"}`}
                    title={act.is_active ? "Désactiver" : "Activer"}
                  >
                    <Activity size={16} />
                  </button>
                  <button
                    onClick={() => deleteAct(act.id)}
                    className="p-2 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredActs.length === 0 && (
          <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-surface-soft">
            <AlertCircle size={32} className="mx-auto text-muted mb-2" />
            <p className="text-sm text-muted font-medium">Aucun acte trouvé correspondant à votre recherche.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
