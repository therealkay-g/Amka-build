"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { useRouter } from "next/navigation";

export default function CleanMePage() {
  const [status, setStatus] = useState("");
  const router = useRouter();

  async function cleanProfile() {
    setStatus("Nettoyage en cours...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus("❌ Pas connecté !");
        return;
      }

      // 1. Mettre à jour le user_metadata (supprimer avatar, mettre role ADMIN
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          role: "ADMIN",
          first_name: "Dr.",
          last_name: "Admin",
          avatar_url: null,
        }
      });

      if (updateError) {
        console.error("Erreur update user:", updateError);
        setStatus(`❌ Erreur: ${updateError.message}`);
        return;
      }

      setStatus("✅ Profil nettoyé ! Déconnexion en cours...");

      // Déconnexion et redirection
      await supabase.auth.signOut();
      
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (e) {
      console.error(e);
      setStatus("❌ Erreur inattendue !");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-4">Nettoyer mon profil</h1>
      <p className="mb-6 text-muted">Cela supprime les données corrompues et définit votre rôle à ADMIN</p>
      <button
        onClick={() => void cleanProfile()}
        className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90"
      >
        Nettoyer mon compte
      </button>
      {status && <p className="mt-4">{status}</p>}
    </div>
  );
}
