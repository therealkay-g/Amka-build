"use client";

import { useState } from "react";

export default function FixRolePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function fixMyRole() {
    setLoading(true);
    setResult("");

    try {
      // Appelle la route API pour mettre à jour le rôle ET nettoyer le user_metadata
      const res = await fetch("/api/fix-my-role");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur inconnue");
      }

      console.log("Réponse API :", data);
      setResult("✅ C'est bon ! Suis ces étapes :\n1. Supprime TOUS les cookies pour localhost\n2. Ferme et rouvre le navigateur (ou ouvre un onglet incognito)\n3. Reconnecte-toi !");
    } catch (e) {
      console.error("Erreur :", e);
      setResult("❌ Erreur : " + (e as Error).message);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full glass-card p-8 space-y-6">
        <h1 className="text-2xl font-black text-text">Nettoyer & Réparer mon compte</h1>
        <p className="text-muted text-sm">Clique sur le bouton pour nettoyer les données qui causent l'erreur 431 et remettre ton rôle en ADMIN</p>
        <button
          onClick={fixMyRole}
          disabled={loading}
          className="w-full bg-primary hover:bg-[#3839aa] text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {loading ? "Nettoyage en cours..." : "Nettoyer mon compte"}
        </button>
        {result && (
          <div className="bg-success/10 text-success rounded-xl px-4 py-3 text-xs font-semibold border border-success/20 whitespace-pre-line">
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
