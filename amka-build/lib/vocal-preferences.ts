export type VocalNotificationPrefs = {
  enabled: boolean;
  volume: number; // 0 to 1
  rate: number;   // 0.5 to 2
  pitch: number;  // 0.5 to 1.5
  voiceURI: string | null;
};

export const DEFAULT_VOCAL_PREFS: VocalNotificationPrefs = {
  enabled: true,
  volume: 1,
  rate: 1,
  pitch: 1,
  voiceURI: null,
};

function vocalStorageKey(userId: string) {
  return `amka_vocal_prefs_${userId}`;
}

export function loadVocalPrefs(userId: string): VocalNotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_VOCAL_PREFS;
  try {
    const raw = localStorage.getItem(vocalStorageKey(userId));
    if (!raw) return DEFAULT_VOCAL_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_VOCAL_PREFS, ...parsed };
  } catch {
    return DEFAULT_VOCAL_PREFS;
  }
}

export function saveVocalPrefs(userId: string, prefs: VocalNotificationPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(vocalStorageKey(userId), JSON.stringify(prefs));
  } catch (e) {
    console.error("Erreur lors de la sauvegarde des préférences vocales:", e);
  }
}
