"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile, Notification, Patient } from "@/lib/types";
import { loadVocalPrefs } from "@/lib/vocal-preferences";
import { playNotificationChime, speakVocalAnnouncement } from "@/lib/vocal-audio";
import { VocalNotificationCard, type VocalNotificationData } from "./VocalNotificationCard";

type VocalNotificationListenerProps = {
  profile: Profile | null;
};

// Clé sessionStorage pour le filtre anti-doublon
const PROCESSED_SESSION_KEY = "amka_processed_vocal_notifs";

function getProcessedIdsFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(PROCESSED_SESSION_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function addProcessedIdToStorage(id: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getProcessedIdsFromStorage();
    set.add(id);
    sessionStorage.setItem(PROCESSED_SESSION_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error("Erreur enregistrement anti-doublon vocal:", e);
  }
}

export function VocalNotificationListener({ profile }: VocalNotificationListenerProps) {
  const [activeCard, setActiveCard] = useState<VocalNotificationData | null>(null);
  const processedRef = useRef<Set<string>>(new Set());

  // Charger les IDs traités au montage
  useEffect(() => {
    processedRef.current = getProcessedIdsFromStorage();
  }, []);

  useEffect(() => {
    if (!profile?.id) return;

    // Abonnement aux notifications en temps réel uniquement
    const channel = supabase
      .channel(`vocal-notifications-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        async (payload: Record<string, unknown>) => {
          const n = payload.new as Notification;

          // 1. Vérification destinataire et type de notification
          if (!n || n.user_id !== profile.id) return;
          const isRegistration = n.type === "patient_registration_vocal";
          const isExamResult = n.type === "exam_result";
          if (!isRegistration && !isExamResult) return;

          // 2. Mécanisme anti-doublon (Mémoire + SessionStorage)
          if (processedRef.current.has(n.id)) {
            console.log("Annonce vocale ignorée (déjà traitée) :", n.id);
            return;
          }

          // Marquer immédiatement comme traité
          processedRef.current.add(n.id);
          addProcessedIdToStorage(n.id);

          // 3. Extraction / Récupération des données
          let patientData: VocalNotificationData | null = null;
          let serviceName: string | undefined = undefined;

          try {
            // Tenter le parsing JSON si le message contient les métadonnées
            if (n.message && n.message.startsWith("{")) {
              const parsed = JSON.parse(n.message);
              patientData = {
                notificationId: n.id,
                patientId: parsed.patientId || n.entity_id || "",
                numero_dossier: parsed.numero_dossier || "",
                nom: parsed.nom || "",
                prenom: parsed.prenom || "",
                sexe: parsed.sexe || "MASCULIN",
                heure: parsed.heure || new Date(n.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                type_handicap: parsed.type_handicap || null,
                niveau_autonomie: parsed.niveau_autonomie || null,
              };
              serviceName = parsed.service || undefined;
            }
          } catch (err) {
            console.warn("Parsing JSON du message échoué, fallback vers requête patients:", err);
          }

          // Fallback : requête directe vers la table patients et consultation_exams
          if (!patientData && n.entity_id) {
            const { data: p } = await supabase
              .from("patients")
              .select("*")
              .eq("id", n.entity_id)
              .maybeSingle();

            if (p) {
              const pat = p as Patient;
              patientData = {
                notificationId: n.id,
                patientId: pat.id,
                numero_dossier: pat.numero_dossier,
                nom: pat.nom,
                prenom: pat.prenom,
                sexe: pat.sexe,
                heure: new Date(pat.created_at || "").toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                type_handicap: pat.type_handicap,
                niveau_autonomie: pat.niveau_autonomie,
              };
            }
          }

          // Si c'est un résultat d'examen, essayer de trouver le nom du service
          if (isExamResult && !serviceName && n.entity_id) {
            const { data: ce } = await supabase
              .from("consultation_exams")
              .select("exams(exam_categories(name))")
              .eq("id", n.entity_id)
              .maybeSingle();
            serviceName = ce?.exams?.exam_categories?.name ?? "médical";
          }

          if (!patientData) {
            console.warn("Impossible de reconstruire les données pour l'annonce vocale.");
            return;
          }

          // 4. Charger les préférences vocales du médecin
          const prefs = loadVocalPrefs(profile.id);

          // 5. Déclenchement Audio + Voix + Carte UI
          playNotificationChime(prefs.volume);
          speakVocalAnnouncement(
            { nom: patientData.nom, prenom: patientData.prenom, sexe: patientData.sexe },
            prefs,
            isExamResult ? "exam_result" : "registration",
            serviceName
          );
          setActiveCard(patientData);
        }

      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  if (!activeCard) return null;

  return (
    <VocalNotificationCard
      data={activeCard}
      onClose={() => setActiveCard(null)}
    />
  );
}
