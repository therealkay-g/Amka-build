export type NotificationPrefs = {
  stockAlerts: boolean;
  consultationAlerts: boolean;
  dailyFinance: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  stockAlerts: true,
  consultationAlerts: true,
  dailyFinance: false,
};

function storageKey(userId: string) {
  return `amka_prefs_${userId}`;
}

export function loadNotificationPrefs(userId: string): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveNotificationPrefs(userId: string, prefs: NotificationPrefs) {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}
