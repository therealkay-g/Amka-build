"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, Play, Save, Check, Settings2 } from "lucide-react";
import {
  loadVocalPrefs,
  saveVocalPrefs,
  type VocalNotificationPrefs,
  DEFAULT_VOCAL_PREFS,
} from "@/lib/vocal-preferences";
import { playNotificationChime, speakVocalAnnouncement } from "@/lib/vocal-audio";

type VocalSettingsProps = {
  userId: string;
  onSaved?: () => void;
};

export function VocalSettingsPanel({ userId, onSaved }: VocalSettingsProps) {
  const [prefs, setPrefs] = useState<VocalNotificationPrefs>(DEFAULT_VOCAL_PREFS);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testing, setTesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Charger les préférences de l'utilisateur
  useEffect(() => {
    if (userId) {
      setPrefs(loadVocalPrefs(userId));
    }
  }, [userId]);

  // Obtenir la liste des voix du navigateur
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prioriser les voix françaises
      const sorted = [...voices].sort((a, b) => {
        const aFr = a.lang.startsWith("fr");
        const bFr = b.lang.startsWith("fr");
        if (aFr && !bFr) return -1;
        if (!aFr && bFr) return 1;
        return a.name.localeCompare(b.name);
      });
      setAvailableVoices(sorted);
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  function handleSave(updated: VocalNotificationPrefs) {
    setPrefs(updated);
    if (userId) {
      saveVocalPrefs(userId, updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
      if (onSaved) onSaved();
    }
  }

  function handleTest() {
    setTesting(true);
    playNotificationChime(prefs.volume);
    setTimeout(() => {
      speakVocalAnnouncement(
        { nom: "MUKENDI", prenom: "Jean-Pierre", sexe: "MASCULIN" },
        prefs
      );
      setTesting(false);
    }, 400);
  }

  return (
    <div className="space-y-6 medical-card p-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Volume2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-text">Annonces vocales du médecin</h3>
            <p className="text-xs text-muted">
              Configurez les alertes vocales automatiques lors de l'attribution de nouveaux patients.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500 animate-in fade-in">
            <Check size={14} /> Enregistré
          </span>
        )}
      </div>

      <div className="space-y-5">
        {/* Toggle On/Off */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-soft border border-border/60">
          <div className="space-y-0.5">
            <span className="font-semibold text-sm text-text block">
              Activer les annonces vocales
            </span>
            <span className="text-xs text-muted block">
              Diffusion audio en temps réel lorsqu'un patient vous est attribué.
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.enabled}
              onChange={(e) => handleSave({ ...prefs, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Dynamic Controls if Enabled */}
        {prefs.enabled && (
          <div className="space-y-4 pt-1 animate-in fade-in">
            {/* Choix de la voix */}
            <label className="block space-y-1.5">
              <span className="label font-semibold text-xs uppercase">
                Voix du navigateur
              </span>
              <select
                className="input-field"
                value={prefs.voiceURI ?? ""}
                onChange={(e) =>
                  handleSave({ ...prefs, voiceURI: e.target.value || null })
                }
              >
                <option value="">— Voix française par défaut —</option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang}) {v.default ? "[Défaut]" : ""}
                  </option>
                ))}
              </select>
            </label>

            {/* Volume */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="label uppercase">Volume</span>
                <span>{Math.round(prefs.volume * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <VolumeX size={16} className="text-muted shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={prefs.volume}
                  onChange={(e) =>
                    handleSave({ ...prefs, volume: parseFloat(e.target.value) })
                  }
                  className="w-full h-2 bg-surface-soft rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <Volume2 size={16} className="text-primary shrink-0" />
              </div>
            </div>

            {/* Vitesse de lecture */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="label uppercase">Vitesse de lecture</span>
                <span>{prefs.rate}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={prefs.rate}
                onChange={(e) =>
                  handleSave({ ...prefs, rate: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-surface-soft rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Test Button */}
      {prefs.enabled && (
        <div className="pt-2 border-t border-border/60 flex justify-end">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="btn-secondary flex items-center gap-2 text-xs font-bold py-2 px-4"
          >
            <Play size={14} className="text-primary fill-primary/20" /> Tester la voix
          </button>
        </div>
      )}
    </div>
  );
}
