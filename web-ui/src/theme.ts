// Theme profiles as signals — @preact/signals drives reactivity.
// heart = pure white & grey (default), heart-dark = inverted,
// station = rail blue legacy. Add a profile here and the switcher
// picks it up automatically.
import { signal, effect } from "@preact/signals";

export interface Profile {
  id: string;
  label: string;
  dark: boolean;
  tokens: Record<string, string>;
}

export const profiles: Profile[] = [
  {
    id: "heart",
    label: "Heart",
    dark: false,
    tokens: {
      "--surface": "#ffffff",
      "--surface-dim": "#fafafa",
      "--surface-variant": "#f2f2f2",
      "--surface-container": "#ececec",
      "--outline": "#d9d9d9",
      "--on-surface": "#111111",
      "--on-surface-variant": "#4d4d4d",
    },
  },
  {
    id: "heart-dark",
    label: "Heart Dark",
    dark: true,
    tokens: {
      "--surface": "#111111",
      "--surface-dim": "#1a1a1a",
      "--surface-variant": "#222222",
      "--surface-container": "#2a2a2a",
      "--outline": "#333333",
      "--on-surface": "#f2efe7",
      "--on-surface-variant": "#a9b2c4",
    },
  },
  {
    id: "station",
    label: "Station Blue",
    dark: true,
    tokens: {
      "--surface": "#0e1b33",
      "--surface-dim": "#132a4a",
      "--surface-variant": "#1a2f52",
      "--surface-container": "#1e3a5f",
      "--outline": "#2a3f5f",
      "--on-surface": "#f2efe7",
      "--on-surface-variant": "#a9b2c4",
    },
  },
];

const STORAGE_KEY = "bahnhof-profile";

function systemPreference(): string {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "heart-dark"
    : "heart";
}

function loadInitial(): string {
  // ?theme= overrides everything (handy for screenshots/tests)
  const param = new URLSearchParams(window.location.search).get("theme");
  if (param && profiles.some((p) => p.id === param)) return param;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && profiles.some((p) => p.id === saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return systemPreference();
}

export const currentId = signal<string>(loadInitial());

export function currentProfile(): Profile {
  return profiles.find((p) => p.id === currentId.value) ?? profiles[0];
}

export function setProfile(id: string): void {
  if (!profiles.some((p) => p.id === id)) return;
  currentId.value = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage unavailable */
  }
}

function applyProfile(): void {
  const p = currentProfile();
  for (const [k, v] of Object.entries(p.tokens)) {
    document.documentElement.style.setProperty(k, v);
  }
  document.documentElement.dataset.profile = p.id;
  document.documentElement.style.colorScheme = p.dark ? "dark" : "light";
}

/** Re-applies tokens reactively: profile switches take effect instantly. */
export function initTheme(): void {
  effect(applyProfile);
  // follow system preference only while the user has not made an explicit choice
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(STORAGE_KEY);
      } catch {
        /* storage unavailable */
      }
      if (!saved) currentId.value = systemPreference();
    });
}
