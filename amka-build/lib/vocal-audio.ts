import type { VocalNotificationPrefs } from "./vocal-preferences";

/**
 * Joue un carillon sonore doux et professionnel avec la Web Audio API.
 * Pas besoin de fichier MP3 externe.
 */
export function playNotificationChime(volume = 1) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(Math.min(Math.max(volume, 0), 1) * 0.15, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    gainNode.connect(ctx.destination);

    // Première note (Do5 / 523.25 Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.connect(gainNode);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Deuxième note (Mi5 / 659.25 Hz)
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.12);
    osc2.connect(gainNode);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);

    setTimeout(() => {
      void ctx.close();
    }, 700);
  } catch (e) {
    console.warn("Erreur lors de la lecture du carillon sonore:", e);
  }
}

/**
 * Génère le texte de l'annonce vocale selon le sexe et l'identité du patient.
 */
export function buildVocalText(patient: { nom: string; prenom: string; sexe: string }): string {
  const isFemale = (patient.sexe || "").toUpperCase() === "FEMININ";
  const fullName = `${patient.prenom} ${patient.nom}`.trim();

  if (isFemale) {
    return `Bonjour Docteur. Une nouvelle patiente vous est attribuée. Madame ${fullName} vient d'être enregistrée à la réception.`;
  }
  return `Bonjour Docteur. Un nouveau patient vous est attribué. Monsieur ${fullName} vient d'être enregistré à la réception.`;
}

/**
 * Génère le texte de l'annonce vocale pour un résultat d'examen.
 */
export function buildExamResultVocalText(patient: { nom: string; prenom: string; sexe: string }, service: string): string {
  const isFemale = (patient.sexe || "").toUpperCase() === "FEMININ";
  const fullName = `${patient.prenom} ${patient.nom}`.trim();
  const title = isFemale ? "Madame" : "Monsieur";

  return `Bonjour Docteur. Les résultats de l'examen ${service} pour ${title} ${fullName} sont arrivés.`;
}

/**
 * Lance la synthèse vocale via la Web Speech API.
 */
export function speakVocalAnnouncement(
  patient: { nom: string; prenom: string; sexe: string },
  prefs?: VocalNotificationPrefs,
  type: "registration" | "exam_result" = "registration",
  service?: string
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Web Speech API non supportée dans ce navigateur.");
    return;
  }

  const settings = prefs ?? { enabled: true, volume: 1, rate: 1, pitch: 1, voiceURI: null };

  if (!settings.enabled) return;

  try {
    const synth = window.speechSynthesis;
    synth.cancel(); // Annule tout discours en cours pour éviter les chevauchements

    const text = type === "registration"
      ? buildVocalText(patient)
      : buildExamResultVocalText(patient, service ?? "médical");

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.volume = Math.min(Math.max(settings.volume, 0), 1);
    utterance.rate = Math.min(Math.max(settings.rate, 0.5), 2);
    utterance.pitch = Math.min(Math.max(settings.pitch, 0.5), 1.5);

    const voices = synth.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (settings.voiceURI) {
      selectedVoice = voices.find((v) => v.voiceURI === settings.voiceURI);
    }

    if (!selectedVoice) {
      selectedVoice = voices.find((v) => v.lang.startsWith("fr") || v.lang.startsWith("FR"));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    synth.speak(utterance);
  } catch (e) {
    console.error("Erreur lors de l'annonce vocale:", e);
  }
}
